'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron } = require('playwright-core');
const ROOT = path.resolve(__dirname, '..', '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sameko-folder-gui-'));
const folder = path.join(profile, 'Bài tập');
fs.mkdirSync(folder);
for (const name of ['Lab 3.docx', 'Lab 3.pdf', 'Sheet.xlsx', 'Slides.pptx', 'Code.zip', 'main.py', 'Main.java', 'Program.cs', 'main.cpp', 'package.json', 'README.md', '.gitignore']) fs.writeFileSync(path.join(folder, name), '');
for (const name of ['src', 'assets', 'docs', 'node_modules']) fs.mkdirSync(path.join(folder, name));
let app;
async function main() {
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath: require('electron'), args: [ROOT, '--user-data-dir=' + profile], cwd: ROOT, env });
    let page;
    for (let i = 0; i < 600; i++) {
        page = app.windows().find(window => window.url().includes('index.html'));
        if (page) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(page);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => window.App?.ready);
    // Exercise the real renderer→preload→IPC path, replacing only the native dialog.
    await app.evaluate(({ dialog }, folder) => {
        globalThis.folderTest = { calls: [], canceled: false };
        dialog.showOpenDialog = async (_parent, options) => {
            globalThis.folderTest.calls.push(options);
            return { canceled: globalThis.folderTest.canceled, filePaths: globalThis.folderTest.canceled ? [] : [folder] };
        };
    }, folder);
    async function checkOpened() {
        await page.waitForFunction(folder => FileExplorer.currentFolder === folder && FileExplorer.isOpen, folder);
        const options = await app.evaluate(() => globalThis.folderTest.calls.at(-1));
        assert.deepStrictEqual(options.properties, ['openDirectory']);
        assert.strictEqual(options.buttonLabel, 'Select Folder');
    }
    await page.locator('#welcome-open-folder').click(); await checkOpened();
    console.log('PASS welcome Open Folder uses folder picker and reveals Explorer');
    assert.strictEqual(await page.locator('#workspace-controls').count(), 0);
    await page.locator('.menu-btn[data-menu="file"]').click();
    await page.locator('[data-action="openfolder"]').click(); await checkOpened();
    console.log('PASS File > Open Folder uses folder picker');
    const before = await app.evaluate(() => globalThis.folderTest.calls.length);
    await page.keyboard.press('Control+Shift+O');
    await page.waitForFunction(() => !!FileExplorer.currentFolder);
    assert.strictEqual(await app.evaluate(() => globalThis.folderTest.calls.length), before + 1);
    await checkOpened();
    console.log('PASS Ctrl+Shift+O opens folder picker');
    await app.evaluate(() => { globalThis.folderTest.canceled = true; });
    await page.locator('#btn-open-folder').click();
    assert.strictEqual(await page.evaluate(() => FileExplorer.currentFolder), folder);
    console.log('PASS cancel preserves current folder');
    const expected = { 'Lab 3.docx': 'word', 'Lab 3.pdf': 'pdf', 'Sheet.xlsx': 'table', 'Slides.pptx': 'powerpoint', 'Code.zip': 'zip', 'main.py': 'python', 'Main.java': 'java', 'Program.cs': 'csharp', 'main.cpp': 'cpp', 'package.json': 'nodejs', 'README.md': 'readme', '.gitignore': 'git' };
    for (const [file, icon] of Object.entries(expected)) {
        const info = await page.evaluate(async file => {
            const holder = document.createElement('div'); holder.innerHTML = FileExplorer.getFileIcon(file);
            const img = holder.querySelector('img');
            await img.decode();
            return { id: MaterialIcons.fileId(file), src: img.getAttribute('src'), loaded: img.naturalWidth > 0 };
        }, file);
        assert.strictEqual(info.id, icon); assert(info.loaded, file + ' icon missing');
        assert(info.src.startsWith('assets/material-icons/icons/'));
    }
    for (const [name, id] of [['src', 'src'], ['assets', 'resource'], ['docs', 'docs'], ['node_modules', 'node']]) {
        assert.deepStrictEqual(await page.evaluate(name => [MaterialIcons.folderId(name, false), MaterialIcons.folderId(name, true)], name), ['folder-' + id, 'folder-' + id + '-open']);
    }
    await page.evaluate(() => {
        for (const image of document.querySelectorAll('.explorer-tree img.material-file-icon')) {
            if (!image.complete || !image.naturalWidth) throw new Error('Unloaded material icon: ' + image.src);
        }
    });
    assert.deepStrictEqual(errors, []);
    const artifacts = path.join(ROOT, 'plans', 'artifacts', 'gui'); fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'folder-file-icons.png') });
    console.log('PASS Material Icon Theme: Office/PDF/source/special filenames, named folders open/closed, local SVGs decoded; no renderer errors');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (app) await app.close(); });
