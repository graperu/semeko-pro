/**
 * Sameko Dev C++ IDE - Compiler IPC Handlers
 * Handles compile, run, stop operations
 * @module app/ipc/compiler-handlers
 */

'use strict';

const { ipcMain } = require('electron');
const { IPC } = require('../shared/constants');
const compiler = require('../services/compiler');

let mainWindow = null;

function setMainWindow(window) {
    mainWindow = window;

    // Setup renderer callback
    compiler.setSendToRendererCallback((channel, data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(channel, data);
        }
    });
}

/**
 * Register all compiler-related IPC handlers
 */
function registerHandlers() {
    // Compile
    ipcMain.handle(IPC.COMPILER.COMPILE, async (event, options) => {
        if (options.functionMetadata) {
            const extension = require('path').extname(options.filePath || options.fileName || '').slice(1);
            try { options = { ...options, content: require('../services/competitive/function-runner').wrap(options.content, options.functionMetadata, extension), filePath: null, untitledId: (options.untitledId || 'function') + '-runner' }; }
            catch (error) { return { success: false, error: error.message }; }
        }
        const runtime = require('../services/languages/runtime');
        if (runtime.languageForFile(options.filePath || options.fileName) !== 'cpp') return runtime.build(options);
        return await compiler.compile(options);
    });

    // Run
    ipcMain.handle(IPC.COMPILER.RUN, async (event, { exePath, cwd, useExternalTerminal }) => {
        if (useExternalTerminal) {
            return await compiler.runExternal({ exePath, cwd });
        }
        return await compiler.run({ exePath, cwd });
    });

    // Stop
    ipcMain.handle(IPC.COMPILER.STOP, async () => {
        compiler.stopProcess();
        return { success: true };
    });

    ipcMain.handle('end-input', () => {
        const child = compiler.getRunningProcess();
        if (!child?.stdin || child.stdin.destroyed) return { success: false, error: 'No running process' };
        child.stdin.end();
        return { success: true };
    });

    // Send input to the running process (terminal input box / INPUT panel)
    ipcMain.handle(IPC.COMPILER.SEND_INPUT, async (event, input) => {
        return compiler.sendInput(input);
    });

    // Stream a test input file into the running process (Input card › Load input from file)
    ipcMain.handle(IPC.COMPILER.SEND_INPUT_FILE, async (event, filePath) => {
        return compiler.sendInputFile(filePath);
    });

    // Size, line count and first lines of a test input file, for its preview
    ipcMain.handle(IPC.COMPILER.INPUT_FILE_INFO, async (event, filePath) => {
        return compiler.inputFileInfo(filePath);
    });

    // Get compiler status (for startup check)
    ipcMain.handle('get-compiler-status', async () => {
        const { getCompilerStatus } = require('../core/app-lifecycle');
        return getCompilerStatus();
    });

    // Clean PCH cache
    ipcMain.handle('clean-pch-cache', async (event, options) => {
        try {
            compiler.cleanPCHCache();
            const flags = options?.flags;
            if (flags) {
                console.log(`[Compiler IPC] Triggering background PCH rebuild with flags: ${flags}`);
                compiler.ensurePCH(flags).catch(err => {
                    console.error('[Compiler IPC] Background PCH rebuild failed:', err);
                });
            }
            return { success: true };
        } catch (err) {
            console.error('[Compiler IPC] Failed to clean PCH cache:', err);
            return { success: false, error: err.message };
        }
    });
}

module.exports = {
    registerHandlers,
    setMainWindow,
};
