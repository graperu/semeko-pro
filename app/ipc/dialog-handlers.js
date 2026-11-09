/**
 * Sameko Dev C++ IDE - Dialog IPC Handlers
 * Handles file/folder dialog operations
 * @module app/ipc/dialog-handlers
 */

'use strict';

const { ipcMain, dialog } = require('electron');
const { IPC } = require('../shared/constants');
const { dialogOptions } = require('../shared/ui-language');

let mainWindow = null;

function setMainWindow(window) {
    mainWindow = window;
}

/**
 * Register all dialog-related IPC handlers
 */
function registerHandlers() {
    // Show open dialog (folder picker, file picker with options)
    ipcMain.handle(IPC.DIALOG.SHOW_OPEN, async (event, options) => {
        try {
            const requested = options || { properties: ['openDirectory'] };
            const result = await dialog.showOpenDialog(mainWindow, dialogOptions({
                title: requested.properties?.includes('openDirectory') ? 'Open Folder' : 'Open File',
                buttonLabel: 'Open', ...requested
            }));
            return result;
        } catch (error) {
            return { canceled: true, error: error.message };
        }
    });


}

module.exports = {
    registerHandlers,
    setMainWindow,
};
