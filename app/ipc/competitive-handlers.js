/**
 * Sameko Dev C++ IDE - Competitive Programming IPC Handlers
 * Handles CP Companion and batch testing
 * @module app/ipc/competitive-handlers
 */

'use strict';

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const competitive = require('../services/competitive');
// Synchronous like the reads, so a read-sameko that follows a write-sameko
// always sees it (an async write could still be pending when the read runs).
const { writeFileAtomicSync } = require('../shared/fs-atomic');

let mainWindow = null;

function setMainWindow(window) {
    mainWindow = window;

    // Setup callbacks
    competitive.setOnProblemReceived((problem) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('problem-received', problem);
        }
    });

    competitive.setOnFocusWindow(() => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
            mainWindow.focus();
            mainWindow.setAlwaysOnTop(false);
            if (!mainWindow.isFocused()) mainWindow.flashFrame(true);
        }
    });
}

/**
 * Register all competitive programming IPC handlers
 */
function registerHandlers() {
    for (const [channel, work] of Object.entries({
        'oj-list-problems': options => require('../services/competitive/problem-browser').list(options),
        'oj-problem-detail': ({ provider, id }) => require('../services/competitive/problem-browser').detail(provider, id),
        'oj-open-problem': async ({ provider, id }) => {
            const url = require('../services/competitive/problem-browser').officialURL(provider, id);
            if (provider === 'codeforces' && process.platform === 'win32') {
                const chrome = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
                    .filter(Boolean).map(root => path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')).find(file => fs.existsSync(file));
                if (chrome) {
                    await new Promise((resolve, reject) => {
                        const child = require('child_process').spawn(chrome, [url], { detached: true, stdio: 'ignore', windowsHide: true });
                        child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(); });
                    });
                    return true;
                }
            }
            await require('electron').shell.openExternal(url);
            return true;
        }
    })) ipcMain.handle(channel, async (_, value) => {
        try { return { ok: true, data: await work(value || {}) }; }
        catch (error) { return { ok: false, error: error.message }; }
    });
    // CP Companion server control
    ipcMain.handle('cc-start-server', async () => {
        return await competitive.startServer();
    });

    ipcMain.handle('cc-open-extension-page', async () => {
        return competitive.openExtensionPage();
    });

    // Batch testing
    ipcMain.handle('run-test', async (event, { exePath, input, expectedOutput, timeLimit, cwd }) => {
        return await competitive.runTest({ exePath, input, expectedOutput, timeLimit, cwd });
    });

    // ==================== .sameko file handlers ====================

    /**
     * Read .sameko metadata file from a folder
     */
    ipcMain.handle('read-sameko', async (event, folderPath) => {
        try {
            const samekoPath = path.join(folderPath, '.sameko');
            if (!fs.existsSync(samekoPath)) {
                return { exists: false, data: null };
            }
            const content = fs.readFileSync(samekoPath, 'utf-8');
            const data = JSON.parse(content);
            return { exists: true, data };
        } catch (err) {
            console.error('[Competitive] Failed to read .sameko:', err);
            return { exists: false, data: null, error: err.message };
        }
    });

    /**
     * Write .sameko metadata file to a folder
     */
    ipcMain.handle('write-sameko', async (event, { folderPath, data }) => {
        try {
            const samekoPath = path.join(folderPath, '.sameko');
            const content = JSON.stringify(data, null, 2);
            writeFileAtomicSync(samekoPath, content, 'utf-8');
            return { success: true };
        } catch (err) {
            console.error('[Competitive] Failed to write .sameko:', err);
            return { success: false, error: err.message };
        }
    });

    /**
     * Create a new contest folder with problem files and .sameko metadata
     */
    ipcMain.handle('create-contest', async (event, { parentDir, name, problemIds, platform, extension = 'cpp', template }) => {
        try {
            if (!['cpp', 'c', 'py', 'java', 'cs'].includes(extension)) throw new Error('Unsupported contest language');
            if (!Array.isArray(problemIds) || problemIds.some(id => typeof id !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(id))) throw new Error('Invalid problem identifier');
            const contestDir = path.join(parentDir, name);
            const samekoPath = path.join(contestDir, '.sameko');

            // A contest of this name already exists: keep its statuses, times and
            // approaches, and only add the problems it does not have yet.
            let existing = null;
            if (fs.existsSync(samekoPath)) {
                try {
                    existing = JSON.parse(fs.readFileSync(samekoPath, 'utf-8'));
                } catch (err) {
                    return { success: false, error: `"${name}" already has a .sameko file that could not be read (${err.message}). It was left unchanged.` };
                }
                if (!existing || typeof existing !== 'object' || (existing.type && existing.type !== 'contest')) {
                    return { success: false, error: `"${name}" already exists and is not a contest. Nothing was changed.` };
                }
            }

            // Create contest directory
            if (!fs.existsSync(contestDir)) {
                fs.mkdirSync(contestDir, { recursive: true });
            }

            // Create .cpp files for each problem
            const cppTemplate = (id) => `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: solve ${id}

    return 0;
}
`;

            const problems = existing && Array.isArray(existing.problems) ? existing.problems : [];
            const known = new Set(problems.map(p => p && p.id));
            const added = [];
            for (const id of problemIds) {
                if (known.has(id)) continue;
                const fileName = `${id}.${extension}`;
                const filePath = path.join(contestDir, fileName);
                if (!fs.existsSync(filePath)) {
                    let code = typeof template === 'string' ? template : extension === 'cpp' ? cppTemplate(id) : '';
                    if (extension === 'java') code = code.replace(/public class Main\b/, `public class ${id}`);
                    fs.writeFileSync(filePath, code, 'utf-8');
                }
                known.add(id);
                added.push(id);
                problems.push({
                    id,
                    fileName,
                    label: '',
                    status: 'todo',
                    timeSpentMs: 0,
                    activeApproach: null,
                    approaches: []
                });
            }

            // Create .sameko metadata, or add the new problems to the existing one.
            const samekoData = existing
                ? { ...existing, type: 'contest', problems }
                : {
                    type: 'contest',
                    name,
                    platform: platform || 'Other',
                    date: new Date().toISOString().split('T')[0],
                    problems
                };
            if (!existing || added.length) {
                writeFileAtomicSync(samekoPath, JSON.stringify(samekoData, null, 2), 'utf-8');
            }

            const files = Object.fromEntries(problems.map(problem => [problem.id, problem.fileName || `${problem.id}.cpp`]));
            return { success: true, contestDir: contestDir.replace(/\\/g, '/'), existed: !!existing, added, files };
        } catch (err) {
            console.error('[Competitive] Failed to create contest:', err);
            return { success: false, error: err.message };
        }
    });

}

module.exports = {
    registerHandlers,
    setMainWindow,
};
