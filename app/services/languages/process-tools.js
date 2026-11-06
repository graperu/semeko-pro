'use strict';

const { spawn } = require('child_process');
const { killProcessTree } = require('../../shared/platform');

// No shell interpolation: paths, flags and user files are separate arguments.
function capture(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { windowsHide: true, detached: process.platform !== 'win32', ...options, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        let settled = false;
        const done = (code, error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ success: code === 0 && !error, output, error: error || (code ? output : ''), code });
        };
        const timer = setTimeout(() => {
            killProcessTree(child);
            done(-1, `Tool timed out after ${Math.ceil((options.timeout || 120000) / 1000)} seconds.`);
        }, options.timeout || 120000);
        for (const stream of [child.stdout, child.stderr]) {
            stream.setEncoding('utf8');
            stream.on('data', data => {
                output += data;
                if (output.length > 4 * 1024 * 1024) {
                    killProcessTree(child);
                    done(-1, 'Tool output exceeded 4 MB.');
                }
            });
        }
        child.on('error', error => done(-1, `${command}: ${error.message}. Configure its path in Settings > Languages.`));
        child.on('close', code => done(code));
    });
}

module.exports = { capture };
