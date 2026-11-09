'use strict';
// Resolve and validate local runtimes without changing global PATH or user settings.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '../..');
const win = process.platform === 'win32';
const suffix = win ? '.exe' : '';
function find(command) {
    const result = spawnSync(win ? 'where.exe' : 'which', [command], { encoding: 'utf8', windowsHide: true });
    return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}
function verify(command, args) {
    const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    if (result.error || result.status !== 0) return null;
    return (result.stdout + result.stderr).trim();
}
const staged = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'SemekoBuild', 'runtimes') : null;
const definitions = {
    python: { override: process.env.SAMEKO_PYTHON, command: win ? 'python' : 'python3', relative: ['python','python.exe'], args: ['--version'] },
    javac: { override: process.env.JAVA_HOME && path.join(process.env.JAVA_HOME,'bin','javac'+suffix), command: 'javac', relative: ['java','bin','javac.exe'], args: ['-version'] },
    dotnet: { override: process.env.SAMEKO_DOTNET, command: 'dotnet', relative: ['dotnet','dotnet.exe'], args: ['--version'] }
};
const tools = {};
for (const [key, definition] of Object.entries(definitions)) {
    const candidates = [...new Set([definition.override, find(definition.command), staged && path.join(staged,...definition.relative)].filter(Boolean))];
    const selected = candidates.find(command => verify(command,definition.args));
    if (!selected) throw new Error(`No working ${key} runtime found. Install ${key === 'javac' ? 'a JDK' : key === 'dotnet' ? 'the .NET SDK' : 'Python'} and run setup again.`);
    tools[key] = selected;
    console.log(`${key}: ${verify(selected,definition.args)}\n  ${selected}`);
}
tools.java = path.join(path.dirname(tools.javac),'java'+suffix);
if (!verify(tools.java,['-version'])) throw new Error('The selected JDK does not contain a working Java runtime.');
const target = path.join(root,'.sameko-tools','runtimes.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(tools,null,2)+'\n');
console.log('Runtime defaults ready. Restart Semeko to use them. User overrides are preserved.');
