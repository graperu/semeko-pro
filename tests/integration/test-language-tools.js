'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Module = require('module');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sameko-tool-test-'));
const original = Module._load;
Module._load = function(name, ...args) {
    if (name === 'electron') return { app: { getPath: () => root, getAppPath: () => path.resolve(__dirname, '..', '..'), isPackaged: false } };
    return original.call(this, name, ...args);
};
const runtime = require('../../app/services/languages/runtime');
const lsp = require('../../app/services/languages/lsp');
const { DapSession } = require('../../app/services/languages/dap-session');
async function completion(file, text, line, character, expected) {
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            const result = await lsp.request({ file, text, feature: 'completion', position: { line, character } });
            const items = Array.isArray(result) ? result : result?.items || [];
            if (items.some(item => item.label.includes(expected))) return;
            if (attempt === 29) throw new Error(`Expected completion ${expected}, received ${JSON.stringify(items).slice(0, 700)}`);
        } catch (error) { if (attempt === 29) throw error; }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}
async function debug(result, file, line, variable, expected) {
    assert(result.success, result.error);
    const session = new DapSession({ build: runtime.getBuild(result.outputPath) });
    session.on('error', error => console.error('Adapter:', error.message));
    let timer;
    try {
        await session.start();
        await session.setBreakpoint(file, line);
        const stopped = new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(`Debugger did not stop in ${file}`)), 30000);
            session.once('stopped', event => { clearTimeout(timer); resolve(event); });
        });
        stopped.catch(() => {});
        await session.run('');
        const event = await stopped;
        assert.strictEqual(Number(event.frame.line), line);
        assert.strictEqual((await session.evaluate(variable)).value, expected);
        const locals = await session.listLocals();
        assert(locals.variables.some(v => v.name === variable));
        console.log(`PASS ${runtime.getBuild(result.outputPath).language} real DAP: breakpoint, evaluate, locals`);
    } finally { clearTimeout(timer); await session.dispose(); }
}
async function main() {
    const python = path.join(root, 'sample.py');
    let text = 'import sys\nsys.'; fs.writeFileSync(python, text);
    await completion(python, text, 1, 4, 'stdout');
    console.log('PASS Python real LSP completion');
    const csharpDir = path.join(root, 'cs'); fs.mkdirSync(csharpDir);
    fs.writeFileSync(path.join(csharpDir, 'Sample.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>');
    const csharp = path.join(csharpDir, 'Program.cs');
    text = 'using System;\nclass Program { static void Main() { Console. } }'; fs.writeFileSync(csharp, text);
    await completion(csharp, text, 1, text.split('\n')[1].indexOf('Console.') + 8, 'WriteLine');
    console.log('PASS C# real LSP completion');
    const loose = path.join(root, 'loose.cs');
    const looseText = 'using System;\nclass Loose { static void Main() { Console. } }';
    fs.writeFileSync(loose, looseText);
    await completion(loose, looseText, 1, looseText.split('\n')[1].indexOf('Console.') + 8, 'WriteLine');
    console.log('PASS standalone C# real LSP completion');
    const javaDir = path.join(root, 'java'); fs.mkdirSync(javaDir);
    const java = path.join(javaDir, 'Main.java');
    text = 'public class Main { public static void main(String[] args) { System.out. } }'; fs.writeFileSync(java, text);
    await completion(java, text, 0, text.indexOf('System.out.') + 11, 'println');
    console.log('PASS Java real LSP completion');
    text = 'using System;\nclass Program {\n static void Main() {\n  int n = 7;\n  Console.WriteLine(n + 1);\n }\n}\n'; fs.writeFileSync(csharp, text);
    await debug(await runtime.build({ filePath: csharp, content: text }), csharp, 5, 'n', '7');
    text = 'public class Main {\n public static void main(String[] args) {\n  int n = 7;\n  System.out.println(n + 1);\n }\n}\n'; fs.writeFileSync(java, text);
    await lsp.request({ file: java, text, feature: 'sync' });
    await debug(await runtime.build({ filePath: java, content: text }), java, 4, 'n', '7');
    fs.writeFileSync(path.join(root, 'settings.json'), JSON.stringify({ languages: {
        javaVmArgs: ['-Dsemeko.test=value with spaces'],
        javaProgramArgs: ['argument with spaces', 'quote"value', 'C:\\tmp\\folder\\']
    } }));
    text = 'public class Main {\n public static void main(String[] args) {\n  int n = args.length == 3 && args[0].equals("argument with spaces") && args[1].equals("quote\\"value") && args[2].equals("C:\\\\tmp\\\\folder\\\\") && System.getProperty("semeko.test").equals("value with spaces") ? 7 : 0;\n  System.out.println(n + 1);\n }\n}\n';
    fs.writeFileSync(java, text);
    await lsp.request({ file: java, text, feature: 'sync' });
    await debug(await runtime.build({ filePath: java, content: text }), java, 4, 'n', '7');
    console.log('PASS Java debugger preserves JVM/program arguments with spaces, quotes and trailing backslashes');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => lsp.stopAll());
