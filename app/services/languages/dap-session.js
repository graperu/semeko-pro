'use strict';

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { FramedConnection } = require('./framed-connection');
const runtime = require('./runtime');
const { killProcessTree, IS_WIN } = require('../../shared/platform');

// The Java adapter expects command-line strings, unlike Python/coreclr arrays.
function javaArguments(args = []) {
    return args.map(value => '"' + value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1') + '"').join(' ');
}

// Adapts DAP to the existing debugger UI's session contract, including expandable variables.
class DapSession extends EventEmitter {
    constructor({ build, cwd }) {
        super(); this.build = build; this.cwd = cwd || build.cwd;
        this.state = 'starting'; this.breakpoints = new Map(); this.variables = new Map();
        this.counter = 0; this.thread = 1; this.frame = null; this.disposed = false;
    }
    async start() {
        const configured = runtime.settings()[`${this.build.language}Debug`];
        if (this.build.language === 'java' && !configured) {
            const port = await require('./lsp').javaDebugPort(this.build.source);
            if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Java debug plugin did not provide a valid port.');
            this.socket = net.connect(port, '127.0.0.1');
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => { this.socket.destroy(); reject(new Error('Java debug adapter connection timed out')); }, 15000);
                this.socket.once('connect', () => { clearTimeout(timeout); resolve(); });
                this.socket.once('error', error => { clearTimeout(timeout); reject(error); });
            });
            this.connection = new FramedConnection(this.socket, this.socket);
        } else {
            const defaults = this.build.language === 'python'
                ? { command: runtime.tool('python'), args: ['-m', 'debugpy.adapter'] }
                : { command: 'netcoredbg', args: ['--interpreter=vscode'] };
            const config = configured || defaults;
            if (typeof config.command !== 'string' || !Array.isArray(config.args)) throw new Error('Debug adapter needs a command and an arguments array.');
            this.child = spawn(config.command, config.args, { cwd: this.cwd, windowsHide: true, detached: !IS_WIN, stdio: ['pipe', 'pipe', 'pipe'] });
            this.connection = new FramedConnection(this.child.stdout, this.child.stdin);
            this.child.stderr.on('data', data => { this.lastError = data.toString(); this.emit('console', this.lastError); });
            this.child.on('error', error => this.connection.close(error));
            this.child.on('exit', () => this.connection.close(new Error(this.lastError || 'Debug adapter exited')));
        }
        this.initialized = new Promise(resolve => { this.resolveInitialized = resolve; });
        this.connection.on('closed', error => {
            if (!this.disposed && this.state !== 'terminated') this.emit('error', error);
            this.state = 'terminated'; this.emit('terminated', { code: null });
        });
        this.connection.on('message', message => { this.onMessage(message).catch(error => { if (!this.disposed) this.emit('error', error); }); });
        this.capabilities = await this.send('initialize', {
            clientID: 'sameko', adapterID: this.build.language, pathFormat: 'path',
            linesStartAt1: true, columnsStartAt1: true, supportsRunInTerminalRequest: true,
            supportsVariableType: true, supportsVariablePaging: true,
        });
    }
    send(command, args = {}) { return this.connection.request(command, args, true); }
    async onMessage(message) {
        if (message.type === 'request') {
            if (message.command !== 'runInTerminal') {
                this.connection.send({ seq: ++this.connection.sequence, type: 'response', request_seq: message.seq, command: message.command, success: false, message: 'Unsupported client request' }); return;
            }
            try {
                const options = message.arguments;
                const [command, ...args] = options.args;
                const env = { ...process.env, ...options.env };
                for (const key of Object.keys(env)) if (env[key] === null) delete env[key];
                const child = spawn(command, args, { cwd: options.cwd || this.cwd, env, windowsHide: true, detached: !IS_WIN, stdio: ['pipe', 'pipe', 'pipe'] });
                this.programChild = child;
                await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
                for (const stream of [child.stdout, child.stderr]) { stream.setEncoding('utf8'); stream.on('data', text => this.emit('programOut', text)); }
                child.stdin.on('error', () => {});
                if (this.stdinPath) {
                    const input = fs.createReadStream(this.stdinPath);
                    input.on('error', error => { child.stdin.end(); this.emit('error', error); });
                    input.pipe(child.stdin);
                } else child.stdin.end(this.stdin || '');
                this.connection.send({ seq: ++this.connection.sequence, type: 'response', request_seq: message.seq, command: message.command, success: true, body: { processId: child.pid } });
            } catch (error) { this.connection.send({ seq: ++this.connection.sequence, type: 'response', request_seq: message.seq, command: message.command, success: false, message: error.message }); }
            return;
        }
        if (message.type !== 'event') return;
        const data = message.body || {};
        if (message.event === 'initialized') this.resolveInitialized();
        if (message.event === 'output') this.emit(data.category === 'console' ? 'console' : 'programOut', data.output || '');
        if (message.event === 'continued') { this.state = 'running'; this.emit('running'); }
        if (message.event === 'stopped') {
            this.thread = data.threadId || this.thread; this.state = 'stopped';
            if (this.temporaryBreakpoint) {
                const id = this.temporaryBreakpoint; this.temporaryBreakpoint = null;
                await this.removeBreakpoint(id);
            }
            const frames = await this.listFrames(); this.frame = frames.stack[0]?.dapId;
            this.emit('stopped', { reason: data.reason, threadId: this.thread, frame: frames.stack[0] });
        }
        if (message.event === 'exited') this.emit('programExited', { code: data.exitCode });
        if (message.event === 'terminated') { this.state = 'terminated'; this.emit('terminated', { code: null }); }
    }
    async run(stdin, stdinPath) {
        this.stdin = stdin; this.stdinPath = stdinPath;
        const b = this.build;
        const custom = runtime.settings()[`${b.language}Debug`]?.launch || {};
        const launch = b.language === 'python'
            ? { type: 'python', python: runtime.tool('python'), program: b.source, pythonArgs: b.runtimeArgs || [], args: b.programArgs || [], console: 'integratedTerminal', justMyCode: false }
            : b.language === 'java'
                ? { type: 'java', javaExec: runtime.tool('java'), mainClass: b.mainClass, classPaths: b.classPaths || [b.args[1]], vmArgs: javaArguments(b.runtimeArgs), args: javaArguments(b.programArgs), sourcePaths: [path.dirname(b.source)], console: 'integratedTerminal' }
                : { type: 'coreclr', program: b.program, args: b.programArgs || [], console: 'integratedTerminal' };
        const started = this.send('launch', { name: 'Sameko', request: 'launch', cwd: this.cwd, stopOnEntry: !!this.stopOnEntry, ...launch, ...custom });
        // Some adapters delay the launch response until configurationDone.
        started.catch(() => {});
        let timer;
        try {
            await Promise.race([this.initialized, started.then(() => this.initialized), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Debug adapter initialization timed out')), 30000); })]);
            for (const file of new Set([...this.breakpoints.values()].map(bp => bp.file))) await this.syncBreakpoints(file);
            if (this.capabilities.supportsConfigurationDoneRequest) await this.send('configurationDone');
            await started;
        } finally { clearTimeout(timer); }
    }
    async syncBreakpoints(file) {
        const selected = [...this.breakpoints.values()].filter(bp => bp.file === file && bp.enabled);
        const response = await this.send('setBreakpoints', { source: { path: file }, breakpoints: selected.map(bp => ({ line: bp.line, ...(bp.condition ? { condition: bp.condition } : {}) })) });
        (response.breakpoints || []).forEach((bp, i) => { if (selected[i]) selected[i].resolvedLine = bp.line || selected[i].line; });
    }
    async setBreakpoint(file, line, condition) {
        const id = String(++this.counter);
        this.breakpoints.set(id, { file, line, condition, enabled: true });
        if (this.state !== 'starting') await this.syncBreakpoints(file);
        return { id, line };
    }
    async changeBreakpoint(id, change) {
        const bp = this.breakpoints.get(String(id)); if (!bp) return;
        Object.assign(bp, change);
        if (this.state !== 'starting') await this.syncBreakpoints(bp.file);
    }
    async removeBreakpoint(id) { const bp = this.breakpoints.get(String(id)); this.breakpoints.delete(String(id)); if (bp && this.state !== 'starting') await this.syncBreakpoints(bp.file); }
    enableBreakpoint(id) { return this.changeBreakpoint(id, { enabled: true }); }
    disableBreakpoint(id) { return this.changeBreakpoint(id, { enabled: false }); }
    setCondition(id, condition) { return this.changeBreakpoint(id, { condition }); }
    breakAtMain() { this.stopOnEntry = true; }
    async runToLine(file, line) {
        const breakpoint = await this.setBreakpoint(file, line);
        this.temporaryBreakpoint = breakpoint.id;
        return this.cont();
    }
    cont() { return this.send('continue', { threadId: this.thread }); }
    next() { return this.send('next', { threadId: this.thread }); }
    step() { return this.send('stepIn', { threadId: this.thread }); }
    finish() { return this.send('stepOut', { threadId: this.thread }); }
    interrupt() { return this.send('pause', { threadId: this.thread }); }
    async listFrames() {
        const result = await this.send('stackTrace', { threadId: this.thread });
        this.frames = result.stackFrames || [];
        return { stack: this.frames.map((frame, level) => ({ level, dapId: frame.id, func: frame.name, fullname: frame.source?.path, file: frame.source?.path, line: frame.line })) };
    }
    async selectFrame(level) { this.frame = this.frames?.[Number(level)]?.id; }
    async listLocals() {
        if (this.frame === null || this.frame === undefined) return { variables: [] };
        const scopes = await this.send('scopes', { frameId: this.frame });
        const locals = [];
        for (const scope of scopes.scopes || []) if (!scope.expensive) {
            const result = await this.send('variables', { variablesReference: scope.variablesReference });
            locals.push(...(result.variables || []).map(v => ({ name: v.name, value: v.value, type: v.type })));
        }
        return { variables: locals };
    }
    async evaluate(expr) { const r = await this.send('evaluate', { expression: expr, frameId: this.frame, context: 'watch' }); return { value: r.result, ...r }; }
    async varCreate(name, expr) {
        const result = await this.evaluate(expr);
        this.variables.set(name, { reference: result.variablesReference, expr });
        return { name, value: result.value, type: result.type, numchild: result.variablesReference ? '1' : '0' };
    }
    varDelete(name) { this.variables.delete(name); }
    async varListChildren(name, from, to) {
        const parent = this.variables.get(name);
        if (!parent?.reference) return { children: [] };
        const result = await this.send('variables', { variablesReference: parent.reference, start: Number(from) || 0, ...(to ? { count: Number(to) - (Number(from) || 0) } : {}) });
        const children = (result.variables || []).map((v, index) => {
            const key = `${name}.${index}`; this.variables.set(key, { reference: v.variablesReference, expr: v.evaluateName || v.name });
            return { name: key, exp: v.name, value: v.value, type: v.type, numchild: v.variablesReference ? '1' : '0' };
        });
        return { children, numchild: children.length };
    }
    async varUpdate() {
        const changelist = [];
        for (const [name, v] of [...this.variables]) {
            try { const r = await this.evaluate(v.expr); v.reference = r.variablesReference; changelist.push({ name, value: r.value, in_scope: 'true', type_changed: 'false' }); }
            catch (_) { changelist.push({ name, in_scope: 'false' }); }
        }
        return { changelist };
    }
    async varSetFormat(name, fmt) {
        const v = this.variables.get(name); if (!v) throw new Error('Variable is no longer available');
        const r = await this.send('evaluate', { expression: v.expr, frameId: this.frame, context: 'watch', format: { hex: fmt === 'hexadecimal' } });
        return { value: r.result, format: fmt };
    }
    async dispose() {
        this.disposed = true;
        try { if (this.connection && !this.connection.closed) await this.connection.request('disconnect', { terminateDebuggee: true }, true, 2000); } catch (_) {}
        this.connection?.close(); this.socket?.destroy();
        if (this.child) killProcessTree(this.child);
        if (this.programChild) killProcessTree(this.programChild);
        this.state = 'terminated';
    }
}
module.exports = { DapSession };
