'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { capture } = require('./process-tools');
const { appTempDir, ensurePrivateDir, IS_WIN } = require('../../shared/platform');
const { readUserSettings } = require('../../shared/settings-reader');

const builds = new Map();
const queues = new Map();
const EXTENSIONS = { py: 'python', java: 'java', cs: 'csharp' };
function languageForFile(file) { return EXTENSIONS[path.extname(file || '').slice(1).toLowerCase()] || 'cpp'; }
function settings() {
    let installed = {};
    const { app } = require('electron');
    const roots = [path.join(app.getPath('userData'), 'language-tools'), path.join(__dirname, '..', '..', '..', '.sameko-tools')];
    for (const root of roots) {
        try { installed = { ...installed, ...JSON.parse(fs.readFileSync(path.join(root, 'tools.json'), 'utf8')) }; } catch (_) {}
    }
    return { ...installed, ...(readUserSettings()?.languages || {}) };
}
function tool(key) {
    const configured = settings()[key];
    if (typeof configured === 'string' && configured.trim()) return configured.trim();
    if ((key === 'java' || key === 'javac') && process.env.JAVA_HOME) return path.join(process.env.JAVA_HOME, 'bin', key + (IS_WIN ? '.exe' : ''));
    return { python: IS_WIN ? 'python' : 'python3', java: 'java', javac: 'javac', dotnet: 'dotnet' }[key];
}
function getBuild(file) { return builds.get(file) || null; }
function resolveRun(file) {
    const build = getBuild(file);
    if (build) return { command: build.command, args: build.args, cwd: build.cwd, managed: true };
    if (/\.sameko-run$/.test(file || '')) throw new Error('This build belongs to a previous session. Build the file again.');
    return { command: file, args: [], cwd: path.dirname(file), managed: false };
}
function xml(value) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); }
function findProject(dir, boundary = null) {
    // The closest project owns the active C# file. Never choose arbitrarily between projects.
    for (let depth = 0; depth < 8; depth++) {
        const projects = fs.readdirSync(dir).filter(file => file.endsWith('.csproj'));
        if (projects.length > 1) throw new Error('Multiple C# projects found. Open a file in the intended project folder.');
        if (projects.length === 1) return path.join(dir, projects[0]);
        const parent = path.dirname(dir);
        if (parent === dir || boundary && path.resolve(dir) === path.resolve(boundary) || fs.existsSync(path.join(dir, '.git'))) break;
        dir = parent;
    }
    return null;
}
const workspaces = new Map();
function workspaceSources(folder, extension) {
    const files = [];
    const ignored = new Set(['.git', '.sameko-tools', '.venv', 'venv', 'node_modules', 'bin', 'obj', 'build', 'dist', 'target', '__pycache__']);
    let visited = 0;
    function walk(dir, depth) {
        if (depth > 30) throw new Error('Workspace is too deeply nested. Open a smaller folder.');
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (++visited > 20000) throw new Error('Workspace is too large. Open the project folder instead.');
            if (entry.isSymbolicLink()) continue;
            const file = path.join(dir, entry.name);
            if (entry.isDirectory() && !ignored.has(entry.name)) walk(file, depth + 1);
            else if (entry.isFile() && entry.name.endsWith(extension)) files.push(file);
        }
    }
    walk(folder, 0);
    return files.sort();
}
async function csharpWorkspace(file) {
    const project = findProject(path.dirname(file));
    if (project) return path.dirname(project);
    if (!workspaces.has(file)) workspaces.set(file, (async () => {
        const sdk = await capture(tool('dotnet'), ['--version']);
        const major = Number(sdk.output.match(/^(\d+)\./m)?.[1]);
        if (!sdk.success || major < 6 || !major) throw new Error('.NET SDK 6 or newer is required for C# language features.');
        const root = path.join(appTempDir('sameko-csharp-workspaces'), crypto.createHash('sha256').update(file).digest('hex').slice(0, 24));
        ensurePrivateDir(root);
        await fs.promises.writeFile(path.join(root, 'SamekoProgram.csproj'), `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net${major}.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>`);
        await fs.promises.copyFile(file, path.join(root, 'Source.cs'));
        return root;
    })());
    try { return await workspaces.get(file); } catch (error) { workspaces.delete(file); throw error; }
}
async function build(options) {
    const language = languageForFile(options.filePath || options.fileName);
    if (!['python', 'java', 'csharp'].includes(language)) return { success: false, error: 'Unsupported source file.' };
    const key = options.filePath || `${options.untitledId || 'untitled'}:${language}`;
    const previous = queues.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(() => buildSource(options, language, key));
    queues.set(key, next);
    try { return await next; } catch (error) { return { success: false, error: error.message }; }
    finally { if (queues.get(key) === next) queues.delete(key); }
}
async function buildSource(options, language, key) {
    const root = path.join(appTempDir('sameko-languages'), crypto.createHash('sha256').update(key).digest('hex').slice(0, 24));
    ensurePrivateDir(root);
    const content = String(options.content ?? '');
    let source = options.filePath;
    if (!source) {
        let name = path.basename(options.fileName || `main.${{ python: 'py', java: 'java', csharp: 'cs' }[language]}`);
        if (language === 'java') name = `${content.match(/\bpublic\s+(?:(?:final|abstract)\s+)?class\s+(\w+)/)?.[1] || 'Main'}.java`;
        source = path.join(root, name);
        await fs.promises.writeFile(source, content, 'utf8');
    } else {
        // The renderer must save successfully before asking to build a named file.
        if (await fs.promises.readFile(source, 'utf8') !== content) throw new Error('Source changed on disk. Save the file and build again.');
    }
    let workspace = null;
    if (options.workspaceRoot && options.filePath) {
        workspace = fs.realpathSync(options.workspaceRoot);
        const relative = path.relative(workspace, fs.realpathSync(source));
        if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) throw new Error('Main file must be inside the workspace folder.');
    }
    const cwd = workspace || (options.filePath ? path.dirname(source) : root);
    const outputPath = path.join(root, 'program.sameko-run');
    builds.delete(outputPath); // a failed build must not leave a runnable stale result
    let command, args, result, program, mainClass, project;
    const config = settings();
    const extra = key => {
        const value = config[key] ?? [];
        if (!Array.isArray(value) || value.some(arg => typeof arg !== 'string' || arg.includes('\0'))) throw new Error(`${key} must be an array of string arguments.`);
        return value;
    };
    if (language === 'python') {
        command = tool('python');
        result = await capture(command, ['-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8-sig").read(), filename=sys.argv[1])', source], { cwd });
        args = ['-u'];
        if (['1', '2'].includes(String(config.pythonOptimization))) args.push(Number(config.pythonOptimization) === 2 ? '-OO' : '-O');
        if (config.pythonNoBytecode) args.push('-B');
        if (config.pythonDevMode) args.push('-X', 'dev');
        if (['default', 'error', 'ignore', 'always'].includes(config.pythonWarnings)) args.push('-W', config.pythonWarnings);
        args.push(...extra('pythonArgs'), source);
        program = source;
    } else if (language === 'java') {
        const packageName = content.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
        const className = path.basename(source, '.java');
        mainClass = packageName ? `${packageName}.${className}` : className;
        const classes = path.join(root, 'classes');
        // Fresh class directory avoids running removed/renamed stale classes.
        if (fs.existsSync(classes)) await fs.promises.rm(classes, { recursive: true, force: true });
        await fs.promises.mkdir(classes);
        let sourceRoot = path.dirname(source);
        if (packageName) for (const unused of packageName.split('.')) sourceRoot = path.dirname(sourceRoot);
        const sources = workspace ? workspaceSources(workspace, '.java') : [source];
        // An argument file also handles projects exceeding Windows command-line limits.
        const argumentFile = path.join(root, 'java-sources.txt');
        await fs.promises.writeFile(argumentFile, sources.map(file => '"' + file.replace(/\\/g, '/').replace(/"/g, '\\"') + '"').join('\n'));
        const compileArgs = ['-encoding', 'UTF-8', config.javaDebugInfo === false ? '-g:none' : '-g'];
        if (config.javaRelease) {
            if (!/^\d+$/.test(String(config.javaRelease))) throw new Error('Invalid target Java release.');
            compileArgs.push('--release', String(config.javaRelease));
        }
        if (config.javaWarnings) compileArgs.push('-Xlint:all');
        if (config.javaWarningsAsErrors) compileArgs.push('-Werror');
        if (config.javaClasspath) compileArgs.push('-classpath', String(config.javaClasspath));
        compileArgs.push(...extra('javacArgs'), '-d', classes, '-sourcepath', sourceRoot, '@' + argumentFile);
        result = await capture(tool('javac'), compileArgs, { cwd });
        const classpath = classes + (config.javaClasspath ? path.delimiter + config.javaClasspath : '');
        command = tool('java'); args = [...extra('javaVmArgs'), '-cp', classpath, mainClass]; program = source;
    } else {
        command = tool('dotnet');
        project = options.filePath ? findProject(path.dirname(source), workspace) : null;
        if (!project && workspace) project = findProject(workspace, workspace);
        if (!project) {
            const sdk = await capture(command, ['--version'], { cwd });
            if (!sdk.success) return { success: false, error: sdk.error };
            const major = Number(sdk.output.match(/^(\d+)\./m)?.[1]);
            if (!major || major < 6) throw new Error('C# requires .NET SDK 6 or newer.');
            project = path.join(root, 'SamekoProgram.csproj');
            const sources = workspace ? workspaceSources(workspace, '.cs') : [source];
            await fs.promises.writeFile(project, `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net${major}.0</TargetFramework><EnableDefaultCompileItems>false</EnableDefaultCompileItems><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable><DebugType>portable</DebugType></PropertyGroup><ItemGroup>${sources.map(file => `<Compile Include="${xml(file)}" />`).join('')}</ItemGroup></Project>`);
        }
        const output = path.join(root, 'dotnet');
        const compileArgs = ['build', project, '-c', config.csharpConfiguration === 'Release' ? 'Release' : 'Debug', '-o', output, '--nologo', '-v', 'minimal'];
        if (config.csharpLangVersion) {
            if (!/^(default|latest|latestmajor|preview|\d+(\.\d+)?)$/.test(config.csharpLangVersion)) throw new Error('Invalid C# language version.');
            compileArgs.push('-p:LangVersion=' + config.csharpLangVersion);
        }
        if (['enable', 'disable', 'warnings', 'annotations'].includes(config.csharpNullable)) compileArgs.push('-p:Nullable=' + config.csharpNullable);
        if (['true', 'false'].includes(config.csharpOptimize)) compileArgs.push('-p:Optimize=' + config.csharpOptimize);
        if (config.csharpWarningsAsErrors) compileArgs.push('-p:TreatWarningsAsErrors=true');
        compileArgs.push(...extra('dotnetBuildArgs'));
        result = await capture(command, compileArgs, { cwd });
        // runtimeconfig identifies runnable assemblies, unlike dependency DLLs.
        if (result.success) {
            const candidates = fs.readdirSync(output).filter(file => file.endsWith('.runtimeconfig.json'));
            const preferred = path.basename(project, '.csproj') + '.runtimeconfig.json';
            const selected = candidates.includes(preferred) ? preferred : candidates.length === 1 ? candidates[0] : null;
            if (!selected) throw new Error('C# project must produce a single runnable console application.');
            program = path.join(output, selected.replace('.runtimeconfig.json', '.dll'));
            args = [program];
        }
    }
    if (!result.success) return { success: false, error: result.error || result.output };
    const programArgs = extra(language + 'ProgramArgs');
    const runtimeArgs = language === 'python' ? args.slice(0, -1) : language === 'java' ? extra('javaVmArgs') : [];
    const classPaths = language === 'java' ? args[args.indexOf('-cp') + 1].split(path.delimiter) : [];
    args.push(...programArgs);
    const descriptor = { language, command, args, cwd, source, program, mainClass, project, programArgs, runtimeArgs, classPaths };
    await fs.promises.writeFile(outputPath, JSON.stringify({ language, source }));
    builds.set(outputPath, descriptor);
    return { success: true, outputPath, warnings: result.output, language };
}
async function checkTools() {
    const result = {};
    await Promise.all(['python', 'java', 'javac', 'dotnet'].map(async key => {
        const command = tool(key);
        const version = await capture(command, [key === 'dotnet' || key === 'python' ? '--version' : '-version'], { timeout: 15000 });
        result[key] = { command, available: version.success, version: version.output.trim(), error: version.error };
    }));
    return result;
}
module.exports = { build, getBuild, resolveRun, languageForFile, tool, settings, checkTools, csharpWorkspace };
