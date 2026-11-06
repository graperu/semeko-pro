/**
 * Sameko Dev C++ IDE - Compiler Warmup
 * Pre-caches compiler binaries in RAM for faster first compilation
 * @module app/services/compiler/warmup
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');
const { getDetectedCompiler, getCompilerInfo, getCompilerEnv } = require('./detector');
const { NULL_DEVICE, binName, IS_WIN, appTempDir, ensurePrivateDir } = require('../../shared/platform');

/**
 * Perform compiler warmup
 * Background compilation to warm the OS file cache for the compiler driver and its
 * subprocesses (g++, cc1plus, as, ld) so the first real compile is not a cold start.
 * This reduces "Cold Start" latency for the first user actual compilation
 * 
 * @param {number} [delay=1000] - Delay in ms before starting warmup
 */
function performCompilerWarmup(delay = 1000) {
    setTimeout(() => {
        const compiler = getDetectedCompiler() || 'g++';
        const compilerInfo = getCompilerInfo();
        const env = getCompilerEnv();

        console.log('[System] Warming up compiler and linker binaries...');

        // MinGW appends .exe to NUL and creates NUL.exe in the working directory.
        // Use a temporary output on Windows and remove it when the compiler exits.
        let output = NULL_DEVICE;
        if (IS_WIN) {
            const folder = appTempDir('sameko-compiler-warmup');
            try { ensurePrivateDir(folder); } catch (_) { return; }
            output = path.join(folder, randomUUID() + '.exe');
        }
        const cleanup = () => { if (IS_WIN) fs.unlink(output, () => {}); };
        const child = spawn(compiler, ['-x', 'c++', '-', '-o', output, '-pipe', '-s', '-O0'], {
            stdio: ['pipe', 'ignore', 'ignore'],
            windowsHide: true,
            env: env
        });

        child.once('close', cleanup);
        child.on('error', () => {
            cleanup();
            // Silently ignore warmup errors
        });

        if (child.stdin) {
            child.stdin.write('int main(){return 0;}');
            child.stdin.end();
        }

        // Warm up LLD Linker (if available)
        if (compilerInfo.hasLLD && path.isAbsolute(compiler)) {
            const binDir = path.dirname(compiler);
            const lldPath = path.join(binDir, binName('ld.lld'));
            const lldWarmup = spawn(lldPath, ['--version'], {
                windowsHide: true,
                stdio: 'ignore'
            });
            lldWarmup.on('error', () => {
                // Silently ignore LLD warmup errors
            });
        }

        console.log('[System] Compiler warmup initiated');
    }, delay);
}

/**
 * Quick warmup - immediate warmup without delay
 * Use when user is about to compile
 */
function quickWarmup() {
    performCompilerWarmup(0);
}

module.exports = {
    performCompilerWarmup,
    quickWarmup,
};
