'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { _electron } = require('playwright-core');
const ROOT = path.resolve(__dirname, '..', '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sameko-language-gui-'));
let app;
async function main() {
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath: require('electron'), args: [ROOT, '--user-data-dir=' + profile], cwd: ROOT, env, timeout: 60000 });
    let page;
    for (let tries = 0; tries < 600; tries++) {
        page = app.windows().find(window => window.url().includes('index.html'));
        if (page) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(page, 'main window');
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => window.App?.ready);
    await page.evaluate(() => ensureMonaco());
    await page.evaluate(async () => {
        isBuilding = true;
        try { await WorkspaceSupport.openLanguage('py'); } finally { isBuilding = false; }
        if (!document.body.innerText.includes('Build in progress. Wait for it to finish before switching language.')) throw new Error('Missing feedback while building');
        App.isRunning = true;
        try { await WorkspaceSupport.openLanguage('py'); } finally { App.isRunning = false; }
        if (!document.body.innerText.includes('Stop the running program before switching language.')) throw new Error('Missing feedback while running');
    });
    console.log('PASS language switch reports build/run blockers instead of silently ignoring clicks');
    await page.evaluate(() => newFile('cpp'));
    for (const [label, ext, language] of [['Python', 'py', 'python'], ['Java', 'java', 'java'], ['C#', 'cs', 'csharp'], ['C', 'c', 'cpp'], ['C++', 'cpp', 'cpp']]) {
        await page.locator('#status-std').click();
        await page.locator('.tab-context-item').filter({ has: page.locator('span', { hasText: new RegExp('^' + label.replace(/[+]/g, '\\+') + '$') }) }).click();
        const state = await page.evaluate(() => {
            const tab = App.tabs.find(t => t.id === getPreferredTabId());
            return { name: tab.name, language: tab.model.getLanguageId(), content: tab.model.getValue() };
        });
        assert(state.name.endsWith('.' + ext));
        assert.strictEqual(state.language, language);
        assert(state.content.includes('Hello, world!'), `${label} switch has Hello World`);
    }
    await page.evaluate(() => {
        const tab = App.tabs.find(t => t.id === getPreferredTabId());
        setTabText(tab, '// keep my draft');
        switchSourceLanguage('py');
        if (tab.model.getValue() !== '// keep my draft') throw new Error('Language switch lost draft');
        const active = App.tabs.find(t => t.id === getPreferredTabId());
        if (active === tab || !active.content.includes('Hello, world!')) throw new Error('Draft switch must open a Hello World tab');
    });
    console.log('PASS status badge language picker: all five languages and draft preservation');
    for (const [ext, language] of [['py', 'python'], ['java', 'java'], ['cs', 'csharp']]) {
        const result = await page.evaluate(async ({ ext, folder }) => {
            newFile(ext);
            const tab = App.tabs.find(t => t.id === getPreferredTabId());
            const name = ext === 'java' ? 'Main.java' : `hello.${ext}`;
            tab.path = folder + '/' + name; tab.name = name;
            await buildRun();
            return { language: tab.model.getLanguageId(), built: !!tab.exePath, text: tab.content, status: document.getElementById('status-std').textContent };
        }, { ext, folder: profile.replace(/\\/g, '/') });
        assert.strictEqual(result.language, language);
        assert(result.built, `${language} built`);
        await page.waitForFunction(() => !App.isRunning, { timeout: 20000 });
        const output = await page.evaluate(() => App.outputByTab[getPreferredTabId()]?.text);
        assert(JSON.stringify(output).includes('Hello, world!'), `${language} output`);
        console.log(`PASS ${language} real GUI: template, highlighting, build/run and output`);
    }
    await page.evaluate(async () => {
        newFile('py');
        const tab = App.tabs.find(t => t.id === getPreferredTabId());
        setTabText(tab, 'import sys\nprint(len(sys.stdin.read()))\n');
        App.settings.execution.autoSendInput = false;
        await buildRun();
        await window.electronAPI.sendInput('abc');
        await window.electronAPI.endInput();
    });
    await page.waitForFunction(() => !App.isRunning, { timeout: 20000 });
    assert.strictEqual(await page.evaluate(() => App.outputByTab[getPreferredTabId()]?.text.trim()), '4');
    console.log('PASS interactive input and EOF for Python read-until-end');
    await page.evaluate(() => { openSettings(); });
    await page.waitForSelector('#set-language-python', { state: 'attached' });
    await page.locator('.settings-tab[data-tab="languages"]').click();
    const settings = await page.evaluate(() => {
        const fields = ['python', 'java', 'javac', 'dotnet'].every(key => document.getElementById('set-language-' + key));
        const templates = ['py', 'java', 'cs'].every(ext => document.querySelector(`.template-lang[data-lang="${ext}"]`));
        return { fields, templates, theme: ThemeManager.themes.has('dark-molokai') };
    });
    assert(settings.fields && settings.templates && settings.theme);
    await page.evaluate(async () => {
        document.getElementById('set-language-default').value = 'py';
        await saveSettingsAndClose();
        newFile();
    });
    assert.strictEqual(await page.evaluate(() => App.tabs.find(t => t.id === getPreferredTabId()).model.getLanguageId()), 'python');
    const contest = await page.evaluate(async folder => window.electronAPI.createContest({
        parentDir: folder, name: 'Python contest', problemIds: ['A', 'B'], extension: 'py', template: languageTemplate('py')
    }), profile);
    assert(contest.success, contest.error);
    assert.strictEqual(contest.files.A, 'A.py');
    assert(fs.existsSync(path.join(profile, 'Python contest', 'A.py')));
    const imported = await page.evaluate(async () => {
        FileExplorer.currentFolder = null;
        App.settings.languages.defaultExtension = 'java';
        await handleProblemReceived({ name: '123 example', url: 'https://example.com/problem', group: 'Tests', tests: [{ input: '', output: '' }] });
        const tab = App.tabs.find(t => t.id === getPreferredTabId());
        return { name: tab.name, text: tab.content, language: tab.model.getLanguageId() };
    });
    assert.strictEqual(imported.language, 'java');
    assert(imported.text.includes('public class ' + imported.name.replace('.java', '')));
    console.log('PASS saved language default, Python contest and Java Companion import');
    for (const [ext, name, entry, helper, initial, edited] of [
        ['py', 'main.py', 'from helper import answer\nprint(answer())\n', 'helper.py', 'def answer():\n    return 1\n', 'def answer():\n    return 42\n'],
        ['java', 'Main.java', 'public class Main { public static void main(String[] args) { System.out.println(Helper.answer()); } }', 'Helper.java', 'class Helper { static int answer() { return 1; } }', 'class Helper { static int answer() { return 42; } }'],
        ['cs', 'Program.cs', 'using System; class Program { static void Main() { Console.WriteLine(Helper.Answer()); } }', 'Helper.cs', 'class Helper { public static int Answer() { return 1; } }', 'class Helper { public static int Answer() { return 42; } }']
    ]) {
        const folder = path.join(profile, 'folder-' + ext);
        fs.mkdirSync(folder);
        fs.writeFileSync(path.join(folder, name), entry);
        fs.writeFileSync(path.join(folder, helper), initial);
        await page.evaluate(async ({ folder, name }) => {
            FileExplorer.currentFolder = folder;
            if (!FileExplorer.isOpen) FileExplorer.toggle();
            await FileExplorer.refreshTree();
            await openFileFromPath(folder + '/' + name);
        }, { folder: folder.replace(/\\/g, '/'), name });
        await page.evaluate(file => openFileFromPath(file), path.join(folder, name).replace(/\\/g, '/'));
        await page.locator('.menu-btn[data-menu="run"]').click();
        await page.locator('#workspace-set-entry').click();
        await page.evaluate(async ({ folder, helper, edited }) => {
            await openFileFromPath(folder + '/' + helper);
            setTabText(App.tabs.find(t => t.id === getPreferredTabId()), edited);
        }, { folder: folder.replace(/\\/g, '/'), helper, edited });
        await page.locator('.menu-btn[data-menu="run"]').click();
        await page.locator('#workspace-run').click();
        await page.waitForFunction(() => !isBuilding && !App.isRunning && document.getElementById('workspace-run').disabled === false);
        await page.waitForFunction(() => JSON.stringify(App.outputByTab[getPreferredTabId()]?.text).includes('42'));
        assert.strictEqual(fs.readFileSync(path.join(folder, helper), 'utf8'), edited);
        assert.strictEqual(await page.evaluate(() => defaultSourceExtension()), ext);
        console.log(`PASS ${ext} folder GUI: main selection, run from helper, save dependency edits and output 42`);
    }
    const folderArtifacts = path.join(ROOT, 'plans', 'artifacts', 'languages');
    fs.mkdirSync(folderArtifacts, { recursive: true });
    await page.screenshot({ path: path.join(folderArtifacts, 'workspace-folder.png') });
    const restoredWorkspace = await page.evaluate(folder => {
        FileExplorer.currentFolder = folder;
        WorkspaceSupport.refresh();
        return { extension: defaultSourceExtension(), entry: WorkspaceSupport.config().entry };
    }, path.join(profile, 'folder-py').replace(/\\/g, '/'));
    assert.strictEqual(restoredWorkspace.extension, 'py');
    assert(restoredWorkspace.entry.endsWith('/main.py'));
    console.log('PASS workspace settings remain separate when switching folders');
    await page.evaluate(() => { FileExplorer.currentFolder = null; WorkspaceSupport.refresh(); });
    for (const [label, ext, file] of [['Python', 'py', 'main.py'], ['Java', 'java', 'Main.java'], ['C#', 'cs', 'Program.cs']]) {
        await page.locator('#header-language').click();
        await page.locator('.tab-context-item').filter({ has: page.locator('span', { hasText: new RegExp('^' + label + '$') }) }).click();
        await page.waitForFunction(ext => !document.getElementById('header-language').disabled && WorkspaceSupport.config()?.extension === ext, ext);
        const state = await page.evaluate(() => ({
            root: FileExplorer.currentFolder,
            name: App.tabs.find(t => t.id === getPreferredTabId()).name,
            content: App.tabs.find(t => t.id === getPreferredTabId()).model.getValue(),
            visible: FileExplorer.isOpen,
            files: FileExplorer.tree.map(item => item.name)
        }));
        assert(state.root.startsWith(profile));
        assert.strictEqual(state.name, file);
        assert(state.content.includes('Hello, world!'));
        assert(state.visible && state.files.includes(file));
        await page.locator('.menu-btn[data-menu="run"]').click();
        await page.locator('#workspace-run').click();
        await page.waitForFunction(() => !isBuilding && !App.isRunning && document.getElementById('workspace-run').disabled === false);
        await page.waitForFunction(() => JSON.stringify(App.outputByTab[getPreferredTabId()]?.text).includes('Hello, world!'));
        console.log(`PASS ${label} header workspace: automatic folder, file tree and runnable Hello World`);
    }
    await page.evaluate(async () => {
        await WorkspaceSupport.openLanguage('py');
        const tab = App.tabs.find(t => t.id === getPreferredTabId());
        setTabText(tab, 'print(99)\n');
        await WorkspaceSupport.openLanguage('java');
        await WorkspaceSupport.openLanguage('py');
        if (App.tabs.find(t => t.id === getPreferredTabId()) !== tab || tab.model.getValue() !== 'print(99)\n') throw new Error('Workspace switch lost draft');
        await WorkspaceSupport.runFolder();
    });
    await page.waitForFunction(() => !isBuilding && !App.isRunning);
    const savedProgram = await page.evaluate(async () => {
        await WorkspaceSupport.openLanguage('java');
        if (WorkspaceSupport.config().extension !== 'java') throw new Error('Did not switch to Java');
        await WorkspaceSupport.openLanguage('py');
        const tab = App.tabs.find(t => t.id === getPreferredTabId());
        if (tab.model.getValue() !== 'print(99)\n') throw new Error('Workspace switch overwrote saved program');
        return tab.path;
    });
    assert.strictEqual(fs.readFileSync(savedProgram, 'utf8'), 'print(99)\n');
    fs.mkdirSync(folderArtifacts, { recursive: true });
    await page.screenshot({ path: path.join(folderArtifacts, 'header-workspace.png') });
    console.log('PASS language workspace switching preserves drafts and saved code');
    await page.evaluate(() => { openSettings(); });
    await page.locator('.settings-tab[data-tab="languages"]').click();
    assert.deepStrictEqual(errors, []);
    const artifacts = path.join(ROOT, 'plans', 'artifacts', 'languages'); fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'languages-settings.png') });
    console.log('PASS language settings, templates, Dark Molokai registry, no renderer exceptions');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (app) await app.close(); });
