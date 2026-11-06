'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { _electron } = require('playwright-core');
const ROOT = path.resolve(__dirname, '..', '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sameko-contest-collections-'));
const folder = path.join(profile, 'practice'); fs.mkdirSync(folder);
let app, page;
const errors = [];
async function launch() {
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath: require('electron'), args: [ROOT, '--user-data-dir=' + profile], cwd: ROOT, env });
    for (let i = 0; i < 600; i++) {
        page = app.windows().find(window => window.url().includes('index.html'));
        if (page) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(page); page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => window.App?.ready);
    await page.evaluate(() => ensureMonaco());
}
async function main() {
    await launch();
    await page.evaluate(async folder => {
        FileExplorer.currentFolder = folder;
        App.settings.languages.defaultExtension = 'py';
        FileExplorer.open();
        await FileExplorer.refreshTree();
    }, folder.replace(/\\/g, '/'));
    await page.locator('[data-action="new-sub-contest"]').click();
    await page.locator('#cp-add-name').fill('Practice round');
    await page.locator('#cp-add-last-id').fill('C');
    await page.locator('.note-dialog-save').click();
    await page.waitForFunction(() => FileExplorer.categories.some(cat => cat.type === 'contest' && cat.items.length === 3));
    const contest = await page.evaluate(() => FileExplorer.categories.find(cat => cat.type === 'contest'));
    assert.deepStrictEqual(contest.items.map(item => item.fileName), ['A.py', 'B.py', 'C.py']);
    assert(fs.existsSync(path.join(folder, 'Practice round', '.sameko')));
    console.log('PASS Contest + creates A–C source files and .sameko metadata');
    // Open an actual item through the tree, then build/run the generated starter.
    await page.locator('.cat-group').filter({ has: page.locator('.cat-name', { hasText: /^Practice round$/ }) }).locator('[data-file-path]').first().click();
    await page.waitForFunction(() => App.tabs.length > 0);
    await page.evaluate(() => buildRun());
    await page.waitForFunction(() => !isBuilding && !App.isRunning);
    assert((await page.evaluate(() => App.outputByTab[getPreferredTabId()]?.text)).includes('Hello, world!'));
    console.log('PASS Contest item opens and runs Python Hello World');
    await page.locator('[data-action="new-category"]').click();
    await page.locator('.input-dialog-field').fill('Algorithms');
    await page.locator('.note-dialog-save').click();
    await page.waitForFunction(() => FileExplorer.categories.some(cat => cat.name === 'Algorithms'));
    const collection = await page.evaluate(() => FileExplorer.categories.find(cat => cat.name === 'Algorithms'));
    assert(fs.existsSync(path.join(folder, 'Algorithms')));
    const group = page.locator('.cat-group').filter({ has: page.locator('.cat-name', { hasText: /^Algorithms$/ }) });
    await group.locator('.cat-header').hover();
    await group.locator('[data-action="new-problem-quick"]').first().click();
    await page.locator('.input-dialog-field').fill('Sum');
    await page.locator('.note-dialog-save').click();
    await page.waitForFunction(() => FileExplorer.categories.find(cat => cat.name === 'Algorithms')?.items.length === 1);
    let item = await page.evaluate(() => FileExplorer.categories.find(cat => cat.name === 'Algorithms').items[0]);
    assert.strictEqual(item.fileName, 'Sum.py');
    await page.waitForFunction(() => App.tabs.find(tab => tab.id === getPreferredTabId())?.name === 'Sum.py');
    await page.evaluate(() => buildRun());
    await page.waitForFunction(() => !isBuilding && !App.isRunning);
    assert((await page.evaluate(() => App.outputByTab[getPreferredTabId()]?.text)).includes('Hello, world!'));
    console.log('PASS Collections + creates a group and new Python problem; generated file runs');
    await page.locator('[data-action="new-category"]').click();
    await page.locator('.input-dialog-field').fill('References');
    await page.locator('.note-dialog-save').click();
    const references = page.locator('.cat-group').filter({ has: page.locator('.cat-name', { hasText: /^References$/ }) });
    await references.locator('.cat-header').click({ button: 'right' });
    await page.locator('.explorer-context-menu [data-action="add-file"]').click();
    await page.locator('[data-action="add-current"]').click();
    await page.waitForFunction(() => FileExplorer.categories.find(cat => cat.name === 'References')?.items.length === 1);
    assert.strictEqual(await page.evaluate(() => FileExplorer.categories.find(cat => cat.name === 'References').items[0].filePath), item.filePath);
    console.log('PASS Add current file to another collection uses the active source tab');
    // Java/C# creation must also honor the workspace language and class name.
    for (const [ext, name, contains] of [['java', 'Example', 'public class Example'], ['cs', 'Program', 'Console.WriteLine']]) {
        await page.evaluate(async ({ ext, id, name }) => {
            App.settings.languages.defaultExtension = ext;
            await FileExplorer.createProblemInCategory(id, name);
        }, { ext, id: collection.id, name });
        assert(fs.readFileSync(path.join(folder, 'Algorithms', name + '.' + ext), 'utf8').includes(contains));
    }
    await page.evaluate(({ id, file }) => {
        FileExplorer.setCategoryItemStatus(id, file, 'ac');
        FileExplorer.renderTree();
        FileExplorer.saveState();
    }, { id: collection.id, file: item.filePath });
    await page.locator('[data-action="toggle-section"][data-section="contest"]').click();
    assert.strictEqual(await page.evaluate(() => FileExplorer.contestSectionCollapsed), true);
    await page.locator('[data-action="toggle-section"][data-section="contest"]').click();
    console.log('PASS Java/C# collection templates, accepted status and section collapse/expand');
    fs.writeFileSync(item.filePath, 'print("keep solution")\n');
    await page.evaluate(async id => { App.settings.languages.defaultExtension = 'py'; await FileExplorer.createProblemInCategory(id, 'Sum'); }, collection.id);
    assert.strictEqual(fs.readFileSync(item.filePath, 'utf8'), 'print("keep solution")\n');
    console.log('PASS creating an existing problem preserves saved solution');
    await app.close(); page = null; await launch();
    await page.waitForFunction(() => FileExplorer.categories.some(cat => cat.name === 'Algorithms'));
    const restored = await page.evaluate(() => FileExplorer.categories.map(cat => ({ name: cat.name, count: cat.items.length, statuses: cat.items.map(item => item.status) })));
    assert(restored.some(cat => cat.name === 'Practice round' && cat.count === 3));
    assert(restored.some(cat => cat.name === 'Algorithms' && cat.count === 3 && cat.statuses.includes('ac')));
    assert.deepStrictEqual(errors, []);
    const artifacts = path.join(ROOT, 'plans', 'artifacts', 'gui'); fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'contest-collections.png') });
    console.log('PASS Contest/Collections membership and progress survive app restart; no renderer errors');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (app) await app.close(); });
