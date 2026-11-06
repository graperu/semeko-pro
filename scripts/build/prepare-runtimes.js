'use strict';

// Stage redistributable runtimes, never the developer's Python packages or user data.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(process.env.LOCALAPPDATA, 'SemekoBuild', 'runtimes');
function executable(name) {
    return execFileSync('where.exe', [name], { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/)[0];
}
function copy(from, to) { fs.cpSync(from, to, { recursive: true, force: true }); }
async function main() {
    if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('The full installer requires Windows x64.');
    fs.mkdirSync(root, { recursive: true });
    const python = path.join(root, 'python');
    if (!fs.existsSync(path.join(python, 'python.exe'))) {
        const version = '3.13.9';
        const url = `https://www.python.org/ftp/python/${version}/python-${version}-embed-amd64.zip`;
        const archive = path.join(root, 'python.zip');
        console.log('Downloading official Python embedded distribution', version);
        const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
        if (!response.ok) throw new Error(`Python download failed: ${response.status}`);
        fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
        fs.mkdirSync(python, { recursive: true });
        execFileSync('tar', ['-xf', archive, '-C', python], { stdio: 'inherit' });
        // Normal Python path discovery allows imports from a user's project folder.
        for (const file of fs.readdirSync(python)) if (file.endsWith('._pth')) fs.renameSync(path.join(python, file), path.join(python, file + '.disabled'));
        fs.unlinkSync(archive);
    }
    const javaSource = path.dirname(path.dirname(executable('javac')));
    const dotnetSource = path.dirname(executable('dotnet'));
    if (!fs.existsSync(path.join(root, 'java', 'bin', 'javac.exe'))) {
        console.log('Staging JDK with its legal notices'); copy(javaSource, path.join(root, 'java'));
    }
    if (!fs.existsSync(path.join(root, 'dotnet', 'sdk'))) {
        console.log('Staging .NET SDK, reference packs and runtime');
        for (const name of ['host', 'packs', 'sdk', 'sdk-manifests', 'shared', 'templates', 'dotnet.exe', 'LICENSE.txt', 'ThirdPartyNotices.txt']) {
            const source = path.join(dotnetSource, name);
            if (fs.existsSync(source)) copy(source, path.join(root, 'dotnet', name));
        }
    }
    for (const [name, file, args] of [
        ['Python', 'python/python.exe', ['--version']], ['Java', 'java/bin/javac.exe', ['-version']], ['.NET', 'dotnet/dotnet.exe', ['--version']]
    ]) {
        const version = execFileSync(path.join(root, file), args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
        console.log(`${name}: ${version}`);
    }
    fs.writeFileSync(path.join(root, 'BUNDLED-RUNTIMES.txt'), 'Semeko Pro Windows x64\nPython 3.13.9 embedded (PSF license in python/)\nEclipse Temurin JDK (GPLv2 with Classpath Exception; legal/ included)\n.NET SDK (MIT and third-party notices included)\nOptional language servers, debug adapters and third-party Python packages are not bundled.\n');
    console.log('Runtimes ready:', root);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
