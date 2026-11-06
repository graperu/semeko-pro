'use strict';

const { EventEmitter } = require('events');

// Shared Content-Length framing for LSP (JSON-RPC) and DAP. Length is UTF-8 bytes.
class FramedConnection extends EventEmitter {
    constructor(input, output) {
        super();
        this.output = output;
        this.buffer = Buffer.alloc(0);
        this.pending = new Map();
        this.sequence = 0;
        this.closed = false;
        input.on('data', data => this.accept(data));
        input.on('end', () => this.close(new Error('Tool connection ended')));
        input.on('error', error => this.close(error));
        output.on('error', error => this.close(error));
    }
    accept(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        try {
            while (this.buffer.length) {
                const boundary = this.buffer.indexOf('\r\n\r\n');
                if (boundary < 0) {
                    if (this.buffer.length > 8192) throw new Error('Invalid tool protocol header');
                    return;
                }
                const length = Number(this.buffer.subarray(0, boundary).toString().match(/Content-Length:\s*(\d+)/i)?.[1]);
                if (!Number.isSafeInteger(length) || length < 0 || length > 16 * 1024 * 1024) throw new Error('Invalid tool protocol length');
                if (this.buffer.length < boundary + 4 + length) return;
                const message = JSON.parse(this.buffer.subarray(boundary + 4, boundary + 4 + length).toString('utf8'));
                this.buffer = this.buffer.subarray(boundary + 4 + length);
                const id = message.type === 'response' ? message.request_seq : message.id;
                if ((message.type === 'response' || (!message.method && id !== undefined)) && this.pending.has(id)) {
                    const pending = this.pending.get(id);
                    this.pending.delete(id);
                    clearTimeout(pending.timer);
                    if (message.error || message.success === false) pending.reject(new Error(message.error?.message || message.message || 'Tool request failed'));
                    else pending.resolve(message.type === 'response' ? message.body || {} : message.result);
                } else this.emit('message', message);
            }
        } catch (error) { this.close(error); }
    }
    send(message) {
        if (this.closed) throw new Error('Tool connection is closed');
        const body = Buffer.from(JSON.stringify(message), 'utf8');
        this.output.write(Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]));
    }
    request(method, params, dap = false, timeout = 30000) {
        if (this.closed) return Promise.reject(new Error('Tool connection is closed'));
        const id = ++this.sequence;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out`)); }, timeout);
            this.pending.set(id, { resolve, reject, timer });
            try { this.send(dap ? { seq: id, type: 'request', command: method, arguments: params } : { jsonrpc: '2.0', id, method, params }); }
            catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
        });
    }
    notify(method, params) { this.send({ jsonrpc: '2.0', method, params }); }
    close(error = new Error('Tool connection closed')) {
        if (this.closed) return;
        this.closed = true;
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
        this.pending.clear();
        this.emit('closed', error);
    }
}
module.exports = { FramedConnection };
