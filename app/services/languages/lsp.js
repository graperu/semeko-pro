'use strict';

const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const { FramedConnection } = require('./framed-connection');
const { settings, languageForFile } = require('./runtime');
const { killProcessTree, IS_WIN, appTempDir, ensurePrivateDir } = require('../../shared/platform');

const servers = new Map();
let publish = () => {};
function setPublish(callback) { publish = callback; }
function rootFor(file) {
    let dir = path.dirname(file);
    for (let depth = 0; depth < 8; depth++) {
        if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'pom.xml')) || fs.existsSync(path.join(dir, 'pyproject.toml')) || fs.readdirSync(dir).some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return path.dirname(file);
}
function config(language) {
    const value = settings()[`${language}Lsp`];
    if (!value) return { command: language === 'python' ? require('./runtime').tool('python') : language === 'csharp' ? 'csharp-ls' : 'jdtls', args: language === 'python' ? ['-m', 'pylsp'] : [] };
    if (typeof value.command !== 'string' || !Array.isArray(value.args) || value.args.some(a => typeof a !== 'string')) throw new Error('Language server needs a command and an arguments array.');
    return value;
}
async function serverFor(file) {
    const language = languageForFile(file);
    if (!['python', 'java', 'csharp'].includes(language)) throw new Error('Unsupported language server');
    const root = language === 'csharp' ? await require('./runtime').csharpWorkspace(file) : rootFor(file);
    const configuration = config(language);
    const key = `${language}:${root}`;
    const signature = JSON.stringify(configuration);
    let server = servers.get(key);
    if (server && (server.signature !== signature || server.connection.closed)) { dispose(server); servers.delete(key); server = null; }
    if (!server) {
        const workspaceData = path.join(appTempDir('sameko-lsp'), require('crypto').createHash('sha256').update(root).digest('hex').slice(0, 24));
        ensurePrivateDir(workspaceData);
        const args = configuration.args.map(arg => arg.replaceAll('${workspaceData}', workspaceData));
        const child = spawn(configuration.command, args, { cwd: root, windowsHide: true, detached: !IS_WIN, stdio: ['pipe', 'pipe', 'pipe'] });
        const connection = new FramedConnection(child.stdout, child.stdin);
        server = { child, connection, signature, documents: new Map(), root, language,
            shadow: language === 'csharp' && path.dirname(root) === appTempDir('sameko-csharp-workspaces') };
        servers.set(key, server);
        child.stderr.on('data', data => { server.lastError = data.toString().slice(-2048); });
        child.on('error', error => connection.close(error));
        child.on('exit', () => connection.close(new Error(server.lastError || 'Language server exited')));
        connection.on('message', message => {
            if (message.method === 'textDocument/publishDiagnostics') {
                const document = server.documents.get(message.params.uri);
                if (document && (message.params.version === undefined || message.params.version === document.version)) publish({ ...message.params, uri: document.originalUri, language, text: document.text });
            }
            else if (message.method && message.id !== undefined) {
                let result = null;
                if (message.method === 'workspace/configuration') result = message.params.items.map(() => configuration.configuration || {});
                if (message.method === 'workspace/workspaceFolders') result = [{ uri: pathToFileURL(root).href, name: path.basename(root) }];
                connection.send({ jsonrpc: '2.0', id: message.id, result });
            }
        });
        server.ready = connection.request('initialize', {
            processId: process.pid, rootUri: pathToFileURL(root).href,
            workspaceFolders: [{ uri: pathToFileURL(root).href, name: path.basename(root) }],
            capabilities: { workspace: { configuration: true }, textDocument: { synchronization: { didSave: true }, completion: { completionItem: { snippetSupport: true } }, hover: { contentFormat: ['markdown', 'plaintext'] }, definition: {}, formatting: {} } },
            initializationOptions: configuration.initializationOptions || {},
        }, false, 60000).then(result => {
            server.capabilities = result?.capabilities || {};
            connection.notify('initialized', {});
            connection.notify('workspace/didChangeConfiguration', { settings: configuration.configuration || {} });
        });
        server.ready.catch(() => { if (servers.get(key) === server) servers.delete(key); dispose(server); });
    }
    await server.ready;
    return server;
}
async function sync(file, text) {
    const server = await serverFor(file);
    const originalUri = pathToFileURL(file).href;
    const uri = server.shadow ? pathToFileURL(path.join(server.root, 'Source.cs')).href : originalUri;
    const old = server.documents.get(uri);
    const version = old?.text === text ? old.version : (old?.version || 0) + 1;
    if (!old) server.connection.notify('textDocument/didOpen', { textDocument: { uri, languageId: server.language, version, text } });
    else if (text !== old.text) {
        const mode = server.capabilities.textDocumentSync;
        const incremental = (typeof mode === 'object' ? mode.change : mode) === 2;
        const lines = old.text.split('\n');
        const change = incremental ? { range: { start: { line: 0, character: 0 }, end: { line: lines.length - 1, character: lines.at(-1).replace(/\r$/, '').length } }, text } : { text };
        server.connection.notify('textDocument/didChange', { textDocument: { uri, version }, contentChanges: [change] });
    }
    server.documents.set(uri, { text, version, originalUri });
    return { server, uri };
}
async function request({ file, text, feature, position, options }) {
    const methods = { completion: 'textDocument/completion', hover: 'textDocument/hover', definition: 'textDocument/definition', formatting: 'textDocument/formatting', sync: null };
    if (!Object.prototype.hasOwnProperty.call(methods, feature)) throw new Error('Unsupported language feature');
    const { server, uri } = await sync(file, text);
    if (!methods[feature]) return { uri };
    const result = await server.connection.request(methods[feature], { textDocument: { uri }, ...(position ? { position } : {}), ...(options ? { options } : {}) });
    if (feature === 'definition' && server.shadow && result) {
        for (const location of Array.isArray(result) ? result : [result]) {
            if (location.uri === uri) location.uri = pathToFileURL(file).href;
            if (location.targetUri === uri) location.targetUri = pathToFileURL(file).href;
        }
    }
    return result;
}
async function javaDebugPort(file) {
    const server = await serverFor(file);
    return server.connection.request('workspace/executeCommand', { command: 'vscode.java.startDebugSession', arguments: [] });
}
function closeDocument(file) {
    const uri = pathToFileURL(file).href;
    for (const server of servers.values()) for (const [internalUri, document] of server.documents) {
        if (document.originalUri === uri && server.documents.delete(internalUri) && !server.connection.closed) server.connection.notify('textDocument/didClose', { textDocument: { uri: internalUri } });
    }
}
function dispose(server) { server.connection.close(); killProcessTree(server.child); }
function stopAll() { for (const server of servers.values()) dispose(server); servers.clear(); }
module.exports = { request, javaDebugPort, closeDocument, stopAll, setPublish };
