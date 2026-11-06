'use strict';

// Real toolchain integration tests on isolated files. No user settings are touched.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sameko-language-test-'));
const original = Module._load;
Module._load = function (name, ...args) {
    if (name === 'electron') return { app: { getPath: () => root, getAppPath: () => path.resolve(__dirname, '..', '..'), isPackaged: false } };
    return original.call(this, name, ...args);
};
const runtime = require('../../app/services/languages/runtime');
const { runTest } = require('../../app/services/competitive/batch-tester');
const { DapSession } = require('../../app/services/languages/dap-session');

async function debugPython(build) {
    const session = new DapSession({ build });
    session.on('error', error => console.error('Adapter:', error.message));
    try {
        await session.start();
        await session.setBreakpoint(build.source, 2, 'n == 7');
        const stopped = new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Python debugger did not stop')), 20000);
            session.once('stopped', event => { clearTimeout(timer); resolve(event); });
        });
        await session.run('7\n');
        const event = await stopped;
        assert.strictEqual(Number(event.frame.line), 2);
        const locals = await session.listLocals();
        assert(locals.variables.some(v => v.name === 'n' && v.value === '7'));
        assert.strictEqual((await session.evaluate('n + 1')).value, '8');
        await session.varCreate('array', '[n, n + 1]');
        const children = await session.varListChildren('array');
        assert(children.children.some(child => child.value === '7'));
        const nextStop = new Promise(resolve => session.once('stopped', resolve));
        await session.next();
        await nextStop;
        const cursorStop = new Promise(resolve => session.once('stopped', resolve));
        await session.runToLine(build.source, 4);
        assert.strictEqual(Number((await cursorStop).frame.line), 4);
        console.log('PASS Python real debugpy: conditional breakpoint, locals, evaluate, children, step, Run to Cursor');
    } finally { await session.dispose(); }
}
async function main() {
    const tools = await runtime.checkTools();
    for (const key of ['python', 'javac', 'java', 'dotnet']) assert(tools[key].available, `${key} required for integration test: ${tools[key].error}`);
    const folder = path.join(root, 'source with spaces'); fs.mkdirSync(folder);
    const fixtures = [
        ['sum.py', 'n = int(input())\nm = n + 1\nprint(m)\nm += 1\n'],
        ['Main.java', 'import java.util.*; public class Main { public static void main(String[] args) { System.out.println(new Scanner(System.in).nextInt()+1); } }'],
        ['Program.cs', 'using System; class Program { static void Main() { Console.WriteLine(int.Parse(Console.ReadLine()!)+1); } }']
    ];
    let pythonBuild;
    for (const [name, content] of fixtures) {
        const file = path.join(folder, name); fs.writeFileSync(file, content);
        const result = await runtime.build({ filePath: file, fileName: name, content });
        assert(result.success, `${name}: ${result.error}`);
        for (const [expected, verdict] of [['8', 'AC'], ['9', 'WA']]) {
            const test = await runTest({ exePath: result.outputPath, input: '7\n', expectedOutput: expected, timeLimit: 10000 });
            assert.strictEqual(test.status, verdict, `${name}: ${JSON.stringify(test)}`);
        }
        console.log(`PASS ${name}: build, stdin, AC and WA`);
        if (name.endsWith('.py')) pythonBuild = runtime.getBuild(result.outputPath);
    }
    const invalid = await runtime.build({ fileName: 'broken.py', untitledId: 'invalid', content: 'def broken(\n' });
    for (const [name, entry, helper, helperText] of [
        ['main.py', 'from helper import answer\nprint(answer())\n', 'helper.py', 'def answer():\n    return 42\n'],
        ['Main.java', 'public class Main { public static void main(String[] args) { System.out.println(Helper.answer()); } }', 'Helper.java', 'class Helper { static int answer() { return 42; } }'],
        ['Program.cs', 'using System; class Program { static void Main() { Console.WriteLine(Helper.Answer()); } }', 'Helper.cs', 'class Helper { public static int Answer() { return 42; } }']
    ]) {
        const workspace = path.join(root, 'workspace ' + path.extname(name).slice(1));
        fs.mkdirSync(workspace);
        fs.writeFileSync(path.join(workspace, name), entry);
        fs.writeFileSync(path.join(workspace, helper), helperText);
        if (name.endsWith('.cs')) {
            fs.mkdirSync(path.join(workspace, 'obj'));
            fs.writeFileSync(path.join(workspace, 'obj', 'ignored.cs'), 'not valid C#');
        }
        const result = await runtime.build({ workspaceRoot: workspace, filePath: path.join(workspace, name), content: entry });
        assert(result.success, result.error);
        assert.strictEqual(runtime.getBuild(result.outputPath).cwd, fs.realpathSync(workspace));
        assert.strictEqual((await runTest({ exePath: result.outputPath, input: '', expectedOutput: '42', timeLimit: 10000 })).status, 'AC');
        const outside = await runtime.build({ workspaceRoot: workspace, filePath: path.join(folder, fixtures[0][0]), content: fixtures[0][1] });
        assert.strictEqual(outside.success, false);
        console.log(`PASS ${name}: folder with helper file, workspace cwd and outside-folder rejection`);
    }
    assert.strictEqual(invalid.success, false);
    assert(/SyntaxError/.test(invalid.error));
    const untitled = await runtime.build({ fileName: 'untitled.java', untitledId: 'java-new', content: fixtures[1][1] });
    assert(untitled.success, untitled.error);
    const loop = await runtime.build({ fileName: 'loop.py', untitledId: 'loop', content: 'while True: pass\n' });
    assert(loop.success, loop.error);
    assert.strictEqual((await runTest({ exePath: loop.outputPath, input: '', expectedOutput: '', timeLimit: 200 })).status, 'TLE');
    assert.throws(() => runtime.resolveRun(path.join(root, 'unknown.sameko-run')), /Build.*again/);
    console.log('PASS syntax error, untitled Java, timeout, stale-build rejection');
    const configuredCases = [
        ['settings.py', { pythonOptimization: '1', pythonNoBytecode: true, pythonWarnings: 'error' }, 'import sys\nprint(sys.flags.optimize, sys.dont_write_bytecode)\n', '1 True'],
        ['Settings.java', { javaRelease: '17', javaDebugInfo: false, javaWarnings: true, javaVmArgs: ['-Dsemeko.test=works'] }, 'public class Settings { public static void main(String[] args) { System.out.println(System.getProperty("semeko.test")); } }', 'works'],
        ['Settings.cs', { csharpConfiguration: 'Release', csharpOptimize: 'true', csharpNullable: 'enable', csharpWarningsAsErrors: true }, 'using System; class Settings { static void Main() {\n#if DEBUG\nConsole.WriteLine("debug");\n#else\nConsole.WriteLine("release");\n#endif\n} }', 'release']
    ];
    for (const [fileName, languages, content, expectedOutput] of configuredCases) {
        const language = runtime.languageForFile(fileName);
        languages[language + 'ProgramArgs'] = ['argument with spaces'];
        fs.writeFileSync(path.join(root, 'settings.json'), JSON.stringify({ languages }));
        const built = await runtime.build({ fileName, untitledId: fileName, content });
        assert(built.success, built.error);
        const descriptor = runtime.getBuild(built.outputPath);
        assert.strictEqual(descriptor.args.at(-1), 'argument with spaces');
        if (language === 'java') {
            assert(descriptor.classPaths[0].endsWith('classes'));
            assert.deepStrictEqual(descriptor.runtimeArgs, ['-Dsemeko.test=works']);
        }
        const verdict = await runTest({ exePath: built.outputPath, input: '', expectedOutput, timeLimit: 10000 });
        assert.strictEqual(verdict.status, 'AC', JSON.stringify(verdict));
        console.log(`PASS ${fileName}: saved compiler/runtime options change real execution`);
    }
    fs.writeFileSync(path.join(root, 'settings.json'), JSON.stringify({ languages: { pythonProgramArgs: ['argument with spaces'] } }));
    const argumentBuild = await runtime.build({ fileName: 'arguments.py', untitledId: 'arguments', content: 'import sys\nprint(sys.argv[1])\n' });
    assert(argumentBuild.success, argumentBuild.error);
    assert.strictEqual((await runTest({ exePath: argumentBuild.outputPath, input: '', expectedOutput: 'argument with spaces', timeLimit: 10000 })).status, 'AC');
    fs.writeFileSync(path.join(root, 'settings.json'), '{}');
    await debugPython(pythonBuild);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
