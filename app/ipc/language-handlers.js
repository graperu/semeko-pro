'use strict';

const { ipcMain, app } = require('electron');
const runtime = require('../services/languages/runtime');
const lsp = require('../services/languages/lsp');
let mainWindow;
function setMainWindow(window) {
    mainWindow = window;
    lsp.setPublish(data => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('language-diagnostics', data);
    });
}
function registerHandlers() {
    ipcMain.handle('language-workspace', async (_, extension) => {
        try { return await require('../services/languages/workspace').open(extension); }
        catch (error) { return { ok: false, error: error.message }; }
    });
    ipcMain.handle('language-tools', () => runtime.checkTools());
    ipcMain.handle('language-request', async (_, request) => {
        try { return { ok: true, result: await lsp.request(request) }; }
        catch (error) { return { ok: false, error: error.message }; }
    });
    ipcMain.handle('language-close', (_, file) => lsp.closeDocument(file));
    ipcMain.handle('language-restart', () => { lsp.stopAll(); return { ok: true }; });
    app.on('before-quit', () => {
        lsp.stopAll();
        require('../services/debugger').stop().catch(() => {});
        require('../services/compiler').stopProcess();
    });
}
module.exports = { setMainWindow, registerHandlers };
