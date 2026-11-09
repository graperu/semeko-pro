'use strict';

function defaultSourceExtension() {
    const workspace = window.WorkspaceSupport?.config();
    if (['cpp', 'c', 'py', 'java', 'cs'].includes(workspace?.extension)) return workspace.extension;
    const ext = App.settings.languages?.defaultExtension;
    return ['cpp', 'c', 'py', 'java', 'cs'].includes(ext) ? ext : 'cpp';
}

function languageTemplate(ext, defaultsOnly = false) {
    const defaults = {
        py: 'import sys\n\n\ndef main():\n    print("Hello, world!")\n\n\nif __name__ == "__main__":\n    main()\n',
        java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        System.out.println("Hello, world!");\n    }\n}\n',
        cs: 'using System;\n\nclass Program\n{\n    static void Main(string[] args)\n    {\n        Console.WriteLine("Hello, world!");\n    }\n}\n'
    };
    return defaultsOnly ? (defaults[ext] || '') : (App.settings.template?.[`${ext}Code`] ?? defaults[ext] ?? '');
}

function helloWorldTemplate(ext) {
    if (ext === 'cpp') return '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n';
    if (ext === 'c') return '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    return 0;\n}\n';
    return languageTemplate(ext, true);
}

window.LanguageSupport = (() => {
    const ids = ['python', 'java', 'csharp'];
    const runtimeKeys = ['python', 'java', 'javac', 'dotnet'];
    const buildFields = [
        ['py', 'pythonOptimization', 'Optimization', ['0', '1', '2'], '0'],
        ['py', 'pythonWarnings', 'Warnings', ['default', 'error', 'ignore', 'always'], 'default'],
        ['py', 'pythonNoBytecode', 'Do not write .pyc files', 'boolean', false],
        ['py', 'pythonDevMode', 'Development checks', 'boolean', false],
        ['py', 'pythonArgs', 'Interpreter arguments (JSON array)', 'args', []],
        ['py', 'pythonProgramArgs', 'Program arguments (JSON array)', 'args', []],
        ['java', 'javaRelease', 'Target Java release (empty = installed JDK)', [''], ''],
        ['java', 'javaDebugInfo', 'Debug information', 'boolean', true],
        ['java', 'javaWarnings', 'Enable all compiler warnings', 'boolean', false],
        ['java', 'javaWarningsAsErrors', 'Treat warnings as errors', 'boolean', false],
        ['java', 'javaClasspath', 'Additional classpath', 'text', ''],
        ['java', 'javacArgs', 'Compiler arguments (JSON array)', 'args', []],
        ['java', 'javaVmArgs', 'JVM arguments (JSON array)', 'args', []],
        ['java', 'javaProgramArgs', 'Program arguments (JSON array)', 'args', []],
        ['cs', 'csharpConfiguration', 'Build configuration', ['Debug', 'Release'], 'Debug'],
        ['cs', 'csharpLangVersion', 'Language version (empty = project default)', ['', 'default', 'latest', 'latestmajor', 'preview'], ''],
        ['cs', 'csharpNullable', 'Nullable analysis', ['', 'enable', 'disable', 'warnings', 'annotations'], ''],
        ['cs', 'csharpOptimize', 'Optimization', ['', 'true', 'false'], ''],
        ['cs', 'csharpWarningsAsErrors', 'Treat warnings as errors', 'boolean', false],
        ['cs', 'dotnetBuildArgs', 'Build arguments (JSON array)', 'args', []],
        ['cs', 'csharpProgramArgs', 'Program arguments (JSON array)', 'args', []]
    ];
    let mon;
    const pending = new Map();
    const versions = new Map();
    const failed = new Set();
    const tabFor = model => App.tabs.find(tab => tab.model === model);
    const range = value => new mon.Range(value.start.line + 1, value.start.character + 1, value.end.line + 1, value.end.character + 1);
    function note(error) {
        if (failed.has(error)) return;
        failed.add(error);
        if (typeof log === 'function') log(error, 'warning');
    }
    async function request(model, feature, position, options, quiet = false) {
        const tab = tabFor(model);
        if (!tab?.path) { if (!quiet) note('Save this file to enable language server features.'); return null; }
        if (model.__languageFile && model.__languageFile !== tab.path) window.electronAPI.languageClose(model.__languageFile);
        model.__languageFile = tab.path;
        const response = await window.electronAPI.languageRequest({ file: tab.path, text: model.getValue(), feature, position: position && { line: position.lineNumber - 1, character: position.column - 1 }, options });
        if (!response.ok) { if (!quiet) note(response.error); return null; }
        return response.result;
    }
    function schedule(model) {
        clearTimeout(pending.get(model));
        if (!ids.includes(model.getLanguageId())) { mon.editor.setModelMarkers(model, 'language-server', []); return; }
        // Old diagnostics must not be displayed against changed source text.
        mon.editor.setModelMarkers(model, 'language-server', []);
        pending.set(model, setTimeout(() => {
            pending.delete(model);
            if (!model.isDisposed() && App.settings.editor.intellisense !== false) {
                versions.set(model, model.getVersionId());
                request(model, 'sync', null, null, true).catch(() => {});
            }
        }, 500));
    }
    function register(m) {
        mon = m;
        for (const id of ids) {
            mon.languages.registerCompletionItemProvider(id, {
                triggerCharacters: ['.'],
                async provideCompletionItems(model, position, context, token) {
                    if (App.settings.editor.intellisense === false) return { suggestions: [] };
                    const version = model.getVersionId();
                    const result = await request(model, 'completion', position);
                    if (!result || token.isCancellationRequested || model.isDisposed() || model.getVersionId() !== version) return { suggestions: [] };
                    const word = model.getWordUntilPosition(position);
                    const fallback = new mon.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                    // LSP CompletionItemKind is one-based; Monaco's enum is zero-based.
                    const kindNames = ['Text', 'Method', 'Function', 'Constructor', 'Field', 'Variable', 'Class', 'Interface', 'Module', 'Property', 'Unit', 'Value', 'Enum', 'Keyword', 'Snippet', 'Color', 'File', 'Reference', 'Folder', 'EnumMember', 'Constant', 'Struct', 'Event', 'Operator', 'TypeParameter'];
                    return { incomplete: !!result.isIncomplete, suggestions: (Array.isArray(result) ? result : result.items || []).map(item => ({
                        label: item.label, kind: mon.languages.CompletionItemKind[kindNames[(item.kind || 1) - 1]] ?? mon.languages.CompletionItemKind.Text,
                        detail: item.detail, documentation: typeof item.documentation === 'string' ? item.documentation : item.documentation && { value: item.documentation.value },
                        insertText: item.textEdit?.newText || item.insertText || item.label,
                        insertTextRules: item.insertTextFormat === 2 ? mon.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
                        range: item.textEdit?.range ? range(item.textEdit.range) : item.textEdit?.replace ? range(item.textEdit.replace) : fallback,
                        sortText: item.sortText, filterText: item.filterText,
                        additionalTextEdits: item.additionalTextEdits?.map(edit => ({ range: range(edit.range), text: edit.newText })),
                    })) };
                }
            });
            mon.languages.registerHoverProvider(id, {
                async provideHover(model, position, token) {
                    if (App.settings.editor.intellisense === false) return null;
                    const version = model.getVersionId();
                    const result = await request(model, 'hover', position);
                    if (!result || token.isCancellationRequested || model.isDisposed() || version !== model.getVersionId()) return null;
                    const contents = Array.isArray(result.contents) ? result.contents : [result.contents];
                    return { range: result.range && range(result.range), contents: contents.filter(Boolean).map(content => ({ value: typeof content === 'string' ? content : content.language ? `\`\`\`${content.language}\n${content.value}\n\`\`\`` : content.value, isTrusted: false })) };
                }
            });
            mon.languages.registerDefinitionProvider(id, {
                async provideDefinition(model, position, token) {
                    const result = await request(model, 'definition', position);
                    if (!result || token.isCancellationRequested) return null;
                    const locations = Array.isArray(result) ? result : [result];
                    // Use the tab's Monaco URI: tabs own in-memory models rather than file URIs.
                    const mapped = [];
                    for (const location of locations) {
                        const uri = location.uri || location.targetUri;
                        if (!uri?.startsWith('file:')) continue;
                        const file = decodeURIComponent(new URL(uri).pathname).replace(/^\/(?=[A-Za-z]:)/, '');
                        await openFileFromPath(file);
                        const tab = App.tabs.find(tab => tab.path?.replace(/\\/g, '/') === file);
                        if (tab?.model) mapped.push({ uri: tab.model.uri, range: range(location.range || location.targetSelectionRange) });
                    }
                    return mapped;
                }
            });
            mon.languages.registerDocumentFormattingEditProvider(id, {
                async provideDocumentFormattingEdits(model, options, token) {
                    const version = model.getVersionId();
                    const result = await request(model, 'formatting', null, options);
                    if (!result || token.isCancellationRequested || model.isDisposed() || version !== model.getVersionId()) return [];
                    return result.map(edit => ({ range: range(edit.range), text: edit.newText }));
                }
            });
        }
        const attach = model => {
            model.onDidChangeContent(() => schedule(model));
            model.onWillDispose(() => {
                clearTimeout(pending.get(model)); pending.delete(model); versions.delete(model);
                const file = model.__languageFile;
                if (file) window.electronAPI.languageClose(file);
            });
            schedule(model);
        };
        mon.editor.onDidCreateModel(attach);
        mon.editor.onDidChangeModelLanguage(event => schedule(event.model));
        mon.editor.getModels().forEach(attach);
        window.electronAPI.onLanguageDiagnostics(data => {
            for (const model of mon.editor.getModels()) {
                const tab = tabFor(model);
                if (!tab?.path || !ids.includes(model.getLanguageId())) continue;
                const path = tab.path.replace(/\\/g, '/');
                const uri = mon.Uri.file(path).toString();
                if (decodeURIComponent(uri).toLowerCase() !== decodeURIComponent(data.uri).toLowerCase()) continue;
                if (versions.get(model) !== model.getVersionId()) continue;
                if (data.text !== undefined && data.text !== model.getValue()) continue;
                mon.editor.setModelMarkers(model, 'language-server', (data.diagnostics || []).map(diagnostic => ({
                    startLineNumber: diagnostic.range.start.line + 1, startColumn: diagnostic.range.start.character + 1,
                    endLineNumber: diagnostic.range.end.line + 1, endColumn: diagnostic.range.end.character + 1,
                    message: diagnostic.message, source: diagnostic.source,
                    severity: ({ 1: mon.MarkerSeverity.Error, 2: mon.MarkerSeverity.Warning, 3: mon.MarkerSeverity.Info, 4: mon.MarkerSeverity.Hint })[diagnostic.severity] || mon.MarkerSeverity.Error
                })));
                if (App.settings.editor.liveCheck && typeof getPreferredTabId === 'function' && getPreferredTabId() === tab.id && !hasBuildProblems && !isBuilding) {
                    App.problemsTabId = tab.id;
                    App.problems = (data.diagnostics || []).map(diagnostic => ({ file: tab.path,
                        line: diagnostic.range.start.line + 1, col: diagnostic.range.start.character + 1,
                        type: diagnostic.severity === 2 ? 'warning' : diagnostic.severity > 2 ? 'info' : 'error', message: diagnostic.message }));
                    renderProblems();
                    setLiveCheckUIState(App.problems.length ? 'issues' : 'idle');
                }
            }
        });
    }
    function mountSettings() {
        const panel = document.getElementById('panel-languages');
        if (!panel || document.getElementById('language-settings')) return;
        const section = document.createElement('section'); section.id = 'language-settings';
        section.innerHTML = '<h3>Languages — Python, Java, C#</h3><p>Leave runtime paths empty to use PATH. Java also checks JAVA_HOME. C# requires the .NET SDK.</p>';
        const defaultRow = document.createElement('div'); defaultRow.className = 'setting-row';
        defaultRow.innerHTML = '<label for="set-language-default">Default programming language</label><select id="set-language-default"><option value="cpp">C++</option><option value="c">C</option><option value="py">Python</option><option value="java">Java</option><option value="cs">C#</option></select>';
        defaultRow.style.gap = '12px';
        const defaults = document.createElement('section'); defaults.id = 'language-file-defaults';
        const defaultsTitle = document.createElement('h3'); defaultsTitle.textContent = 'New files and problems';
        defaults.append(defaultsTitle, defaultRow); document.getElementById('panel-editor').append(defaults);
        const pythonRow = document.createElement('div'); pythonRow.className = 'setting-row'; pythonRow.dataset.buildLanguage = 'py';
        pythonRow.innerHTML = '<label for="set-python-installation">Installed Python version</label><select id="set-python-installation"><option value="">Automatic (bundled / PATH)</option></select>';
        pythonRow.querySelector('select').onchange = event => {
            document.getElementById('set-language-python').value = event.target.value;
            detectChoices().catch(error => console.warn(error.message));
        };
        section.append(pythonRow);
        const detected = document.createElement('p'); detected.id = 'language-versions-status'; detected.className = 'setting-desc'; detected.setAttribute('role', 'status'); detected.setAttribute('aria-live', 'polite'); section.append(detected);
        for (const key of runtimeKeys) {
            const row = document.createElement('div'); row.className = 'setting-row';
            const label = document.createElement('label'); label.htmlFor = `set-language-${key}`; label.textContent = { python: 'Python interpreter', java: 'Java runtime', javac: 'Java compiler', dotnet: '.NET SDK' }[key];
            const input = document.createElement('input'); input.type = 'text'; input.id = label.htmlFor; input.placeholder = 'Auto (PATH)'; input.style.cssText = 'flex:1;min-width:180px';
            input.onchange = () => detectChoices().catch(error => console.warn(error.message));
            const browse = document.createElement('button'); browse.type = 'button'; browse.id = `btn-language-${key}-browse`; browse.className = 'action-btn';
            browse.title = 'Choose runtime executable'; browse.setAttribute('aria-label', 'Choose runtime executable');
            browse.innerHTML = '<svg class="ico" width="16" height="16"><use href="#i-folder-open-duo"/></svg>';
            browse.onclick = async () => {
                const result = await window.electronAPI.showOpenDialog({ title: window.UILanguage ? UILanguage.translate('Select runtime executable') : 'Select runtime executable', properties: ['openFile'] });
                if (!result.canceled && result.filePaths?.[0]) { input.value = result.filePaths[0]; await detectChoices(); }
            };
            row.append(label, input, browse); section.append(row);
        }
        for (const [language, key, title, type] of buildFields) {
            const row = document.createElement('div'); row.className = 'setting-row'; row.dataset.buildLanguage = language;
            const label = document.createElement('label'); label.htmlFor = `set-language-${key}`; label.textContent = title;
            const input = document.createElement(Array.isArray(type) ? 'select' : 'input'); input.id = label.htmlFor;
            if (Array.isArray(type)) for (const value of type) { const option = document.createElement('option'); option.value = value; option.textContent = optionLabel(key, value); input.append(option); }
            else { input.type = type === 'boolean' ? 'checkbox' : 'text'; if (type === 'args') input.placeholder = '["--option", "value with spaces"]'; }
            if (type === 'boolean') {
                const toggle = document.createElement('label'); toggle.className = 'switch';
                const slider = document.createElement('span'); slider.className = 'slider';
                toggle.append(input, slider); row.append(label, toggle);
            } else row.append(label, input);
            section.append(row);
        }
        const resetBuild = document.createElement('button'); resetBuild.type = 'button'; resetBuild.className = 'action-btn'; resetBuild.textContent = 'Reset selected language build options'; resetBuild.dataset.buildReset = 'true';
        resetBuild.onclick = () => {
            const selected = document.getElementById('settings-build-language')?.value;
            for (const [language, key, , type, fallback] of buildFields) {
                if (language !== selected) continue;
                const input = document.getElementById(`set-language-${key}`);
                if (type === 'boolean') input.checked = fallback;
                else input.value = type === 'args' ? JSON.stringify(fallback) : fallback;
            }
        };
        section.append(resetBuild);
        const advanced = document.createElement('details');
        const summary = document.createElement('summary'); summary.textContent = 'Advanced: language servers and debug adapters';
        advanced.append(summary); section.append(advanced);
        const help = document.createElement('p'); help.dataset.languageToolHelp = 'true'; advanced.append(help);
        for (const id of ids) for (const type of ['Lsp', 'Debug']) {
            const row = document.createElement('div'); row.className = 'setting-row';
            const label = document.createElement('label'); label.htmlFor = `set-language-${id}${type}`; label.textContent = `${{ python: 'Python', java: 'Java', csharp: 'C#' }[id]} ${type === 'Lsp' ? 'language server' : 'debug adapter'} (JSON)`;
            const input = document.createElement('textarea'); input.id = label.htmlFor; input.rows = 3; input.style.cssText = 'flex:1;min-width:180px';
            input.placeholder = JSON.stringify({ command: { python: type === 'Lsp' ? 'pylsp' : 'python', java: 'java', csharp: type === 'Lsp' ? 'csharp-ls' : 'netcoredbg' }[id], args: [] });
            row.append(label, input); advanced.append(row);
        }
        const button = document.createElement('button'); button.type = 'button'; button.className = 'action-btn'; button.textContent = 'Check installed runtimes'; button.dataset.runtimeCheck = 'true';
        const status = document.createElement('pre'); status.dataset.runtimeCheckResult = 'true'; status.style.cssText = 'white-space:pre-wrap;font-size:12px'; status.setAttribute('aria-live', 'polite');
        button.onclick = async () => {
            button.disabled = true; status.textContent = 'Checking saved runtime settings…';
            const selected = document.getElementById('settings-build-language')?.value;
            try { const tools = await detectChoices(true); if (selected === document.getElementById('settings-build-language')?.value) status.textContent = runtimeKeysFor(selected).map(key => `${key}: ${tools[key].available ? tools[key].version : tools[key].error}`).join('\n'); }
            catch (error) { status.textContent = error.message; }
            finally { button.disabled = false; }
        };
        section.append(button, status);
        for (const row of section.querySelectorAll('.setting-row')) row.style.gap = '12px';
        for (const label of section.querySelectorAll('.setting-row > label:not(.switch)')) label.style.cssText = 'flex:0 1 170px;min-width:110px';
        panel.append(section);
    }
    function optionLabel(key, value) {
        const labels = {
            pythonOptimization: { '0': 'No optimization (keep assertions)', '1': '-O (remove assertions)', '2': '-OO (remove assertions and docstrings)' },
            pythonWarnings: { default: 'Default warnings', error: 'Warnings as errors', ignore: 'Hide warnings', always: 'Show all warnings' },
            csharpOptimize: { 'true': 'Enabled', 'false': 'Disabled' },
            csharpNullable: { enable: 'Enable nullable analysis', disable: 'Disable nullable analysis', warnings: 'Nullable warnings only', annotations: 'Nullable annotations only' }
        };
        return labels[key]?.[value] || value || 'Project default';
    }
    function selectValue(input, value) {
        if (input.tagName === 'SELECT' && ![...input.options].some(option => option.value === String(value))) {
            const option = document.createElement('option'); option.value = value; option.textContent = value; input.append(option);
        }
        input.value = value;
    }
    let choiceRequest = 0;
    const choiceCache = new Map();
    function runtimeKeysFor(language) { return ({ py: ['python'], java: ['java', 'javac'], cs: ['dotnet'] })[language] || []; }
    async function detectChoices(force = false) {
        const request = ++choiceRequest;
        const paths = Object.fromEntries(runtimeKeys.map(key => [key, document.getElementById(`set-language-${key}`).value.trim()]));
        const status = document.getElementById('language-versions-status'); status.textContent = 'Detecting installed language versions…';
        let tools;
        const cacheKey = JSON.stringify(paths);
        if (force) choiceCache.delete(cacheKey);
        if (!choiceCache.has(cacheKey)) {
            if (choiceCache.size >= 8) choiceCache.delete(choiceCache.keys().next().value);
            choiceCache.set(cacheKey, window.electronAPI.languageTools(paths).catch(error => { choiceCache.delete(cacheKey); throw error; }));
        }
        try { tools = await choiceCache.get(cacheKey); }
        catch (error) { if (request === choiceRequest) status.textContent = 'Could not detect versions. Check runtime paths.'; throw error; }
        if (request !== choiceRequest) return tools;
        const allowed = runtimeKeysFor(document.getElementById('settings-build-language')?.value);
        status.replaceChildren(...runtimeKeys.map(key => {
            const item = document.createElement('span'); item.dataset.runtimeVersion = key;
            item.textContent = `${key}: ${tools[key].available ? tools[key].version : '—'} `;
            item.hidden = !allowed.includes(key); return item;
        }));
        for (const [key, values] of [['javaRelease', tools.javac.releases || []], ['csharpLangVersion', tools.dotnet.languageVersions || []]]) {
            const input = document.getElementById(`set-language-${key}`), current = input.value;
            input.replaceChildren();
            for (const value of ['', ...new Set(values)]) { const option = document.createElement('option'); option.value = value; option.textContent = value || 'Project default'; input.append(option); }
            selectValue(input, current);
        }
        const python = document.getElementById('set-python-installation'), selected = document.getElementById('set-language-python').value;
        python.replaceChildren();
        const auto = document.createElement('option'); auto.value = ''; auto.textContent = 'Automatic (bundled / PATH)'; python.append(auto);
        for (const installation of tools.python.installations || []) { const option = document.createElement('option'); option.value = installation.command; option.textContent = `Python ${installation.version} — ${installation.command}`; python.append(option); }
        selectValue(python, selected);
        return tools;
    }
    function loadSettings() {
        mountSettings();
        for (const [, key, , type, fallback] of buildFields) {
            const input = document.getElementById(`set-language-${key}`), value = App.settings.languages?.[key] ?? fallback;
            if (type === 'boolean') input.checked = value;
            else selectValue(input, type === 'args' ? JSON.stringify(value) : value);
        }
        document.getElementById('set-language-default').value = App.settings.languages?.defaultExtension || 'cpp';
        for (const key of runtimeKeys) document.getElementById(`set-language-${key}`).value = App.settings.languages?.[key] || '';
        for (const id of ids) for (const type of ['Lsp', 'Debug']) {
            const key = `${id}${type}`;
            document.getElementById(`set-language-${key}`).value = App.settings.languages?.[key] ? JSON.stringify(App.settings.languages[key], null, 2) : '';
        }
        detectChoices().catch(error => { console.warn('Runtime version detection:', error.message); });
    }
    function saveSettings() {
        const next = { ...App.settings.languages, defaultExtension: document.getElementById('set-language-default').value };
        for (const [, key, title, type] of buildFields) {
            const input = document.getElementById(`set-language-${key}`);
            if (type === 'boolean') next[key] = input.checked;
            else if (type === 'args') {
                let value; try { value = JSON.parse(input.value || '[]'); } catch (_) { throw new Error(`${title}: enter a JSON array.`); }
                if (!Array.isArray(value) || value.some(arg => typeof arg !== 'string' || arg.includes('\0'))) throw new Error(`${title}: use an array of strings.`);
                next[key] = value;
            } else next[key] = input.value.trim();
        }
        if (next.javaRelease && !/^\d+$/.test(next.javaRelease)) throw new Error('Target Java release must be a number.');
        if (next.csharpLangVersion && !/^(default|latest|latestmajor|preview|\d+(\.\d+)?)$/.test(next.csharpLangVersion)) throw new Error('Invalid C# language version.');
        for (const key of runtimeKeys) next[key] = document.getElementById(`set-language-${key}`).value.trim();
        for (const id of ids) for (const type of ['Lsp', 'Debug']) {
            const key = `${id}${type}`, text = document.getElementById(`set-language-${key}`).value.trim();
            if (!text) { delete next[key]; continue; }
            let value;
            try { value = JSON.parse(text); } catch (_) { throw new Error(`${key}: enter valid JSON.`); }
            if (typeof value.command !== 'string' || !value.command.trim() || !Array.isArray(value.args) || value.args.some(arg => typeof arg !== 'string')) throw new Error(`${key}: provide a command and an array of string arguments.`);
            next[key] = value;
        }
        App.settings.languages = next;
        failed.clear();
    }
    async function format(editor) {
        const model = editor.getModel();
        const version = model.getVersionId();
        const edits = await request(model, 'formatting', null, model.getOptions());
        if (model.isDisposed() || model.getVersionId() !== version || editor.getModel() !== model) return false;
        if (!edits?.length) return false;
        editor.pushUndoStop(); editor.executeEdits('language-format', edits.map(edit => ({ range: range(edit.range), text: edit.newText }))); editor.pushUndoStop(); return true;
    }
    return { register, loadSettings, saveSettings, format };
})();

window.WorkspaceSupport = (() => {
    let running = false;
    let switching = false;
    const root = () => window.FileExplorer?.currentFolder || null;
    const key = () => 'sameko-workspace:' + pathKey(root() || '');
    function contains(file) { return !!root() && !!file && pathKey(file).startsWith(pathKey(root()).replace(/\/$/, '') + '/'); }
    function config() {
        if (!root()) return null;
        try { return JSON.parse(localStorage.getItem(key())) || {}; } catch (_) { return {}; }
    }
    function save(value) { localStorage.setItem(key(), JSON.stringify(value)); refresh(); }
    function setFolderLanguage(extension){if(!root()||!['cpp','c','py','java','cs'].includes(extension))throw Error('Invalid folder language');save({...config(),extension});}
    function refresh() {
        const value = config() || {};
        const names = { cpp: 'C++', c: 'C', py: 'Python', java: 'Java', cs: 'C#' };
        const header = document.getElementById('header-language');
        if (header) {
            header.textContent = (names[value.extension || App.settings.languages?.defaultExtension] || 'C++') + ' ▾';
            header.title = root() ? 'Language workspace: ' + root() : 'Choose a language workspace';
        }
        document.getElementById('workspace-run').disabled = running || !contains(value.entry);
        document.getElementById('workspace-run').title = contains(value.entry) ? 'Main: ' + value.entry : 'Choose Use Current File as Main first';
    }
    async function runFolder() {
        if (running || isBuilding || App.isRunning || blockedByDebugSession('Run folder')) return;
        const folder = root(), value = config();
        if (!contains(value?.entry)) return;
        running = true; refresh();
        try {
            // Save every open source in this folder before compiling dependencies.
            for (const tab of App.tabs.filter(t => contains(t.path))) {
                const text = tab.model && !tab.model.isDisposed() ? tab.model.getValue() : tab.content;
                if (text === tab.original && !tab.modified) continue;
                const result = await window.electronAPI.saveFile({ path: tab.path, content: text });
                if (!result || result.success === false) throw new Error('Could not save ' + tab.name);
                markTabSaved(tab, text);
            }
            if (root() !== folder) throw new Error('Folder changed; run again.');
            await openFileFromPath(value.entry);
            const tab = App.tabs.find(t => t.id === getPreferredTabId());
            if (!tab?.path || pathKey(tab.path) !== pathKey(value.entry)) throw new Error('Cannot open the main file. Select it again.');
            await buildRun();
        } catch (error) { log(error.message, 'error'); setStatus('Folder run failed', 'error'); }
        finally { running = false; refresh(); }
    }
    function buildRoot(file) { return contains(file) && pathKey(file) === pathKey(config()?.entry || '') ? root() : null; }
    async function openLanguage(ext) {
        if (switching || running) { showToast('A workspace operation is in progress. Try again when it finishes.', 'warning'); return; }
        if (isBuilding) { showToast('Build in progress. Wait for it to finish before switching language.', 'warning'); return; }
        if (App.isRunning) { showToast('Stop the running program before switching language.', 'warning'); return; }
        if (blockedByDebugSession('Switch workspace')) return;
        switching = true;
        const header = document.getElementById('header-language');
        if (header) header.disabled = true;
        try {
            const result = await window.electronAPI.languageWorkspace(ext);
            if (!result?.ok) throw new Error(result?.error || 'Cannot open workspace');
            FileExplorer.saveCategoriesForFolder(FileExplorer.currentFolder);
            FileExplorer.leaveContest();
            FileExplorer.currentFolder = result.folder;
            FileExplorer.filterText = '';
            const filter = document.getElementById('explorer-filter');
            if (filter) filter.value = '';
            FileExplorer.expandedFolders.clear();
            FileExplorer.expandedFolders.add(result.folder);
            FileExplorer.loadCategoriesForFolder(result.folder);
            const previous = config() || {};
            save({ ...previous, extension: ext, entry: contains(previous.entry) ? previous.entry : result.entry });
            await FileExplorer.refreshTree();
            FileExplorer.saveState();
            if (!FileExplorer.isOpen) FileExplorer.open();
            await openFileFromPath(config().entry);
            setStatus('Workspace ready', 'success');
        } catch (error) { log(error.message, 'error'); setStatus('Cannot open workspace', 'error'); }
        finally { switching = false; if (header) header.disabled = false; }
    }
    function setMain() {
        const tab = App.tabs.find(t => t.id === getPreferredTabId());
        if (!contains(tab?.path) || !isRunnableTab(tab)) { showToast('Open a saved source file inside this folder first.', 'warning'); return; }
        const ext = fileExtension(tab.path);
        save({ ...config(), entry: tab.path, extension: ['cc', 'cxx'].includes(ext) ? 'cpp' : ext });
        showToast('Main file: ' + tab.name, 'success');
    }
    function init() { refresh(); }
    return { config, refresh, init, runFolder, buildRoot, openLanguage, setMain, setFolderLanguage };
})();
