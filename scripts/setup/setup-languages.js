'use strict';

// Optional developer tools, isolated from global Python/.NET installations.
// Runtimes (Python, JDK 21+, .NET SDK) must already be installed.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..', '.sameko-tools');
const win = process.platform === 'win32';
const exe = name => name + (win ? '.exe' : '');
const run = (command, args) => {
    const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true });
    if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message || result.status}`);
};
async function download(url, target) {
    console.log(`Downloading ${url}`);
    const response = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { 'User-Agent': 'Sameko-language-tools' } });
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
    await fs.promises.writeFile(target, Buffer.from(await response.arrayBuffer()));
}
async function main() {
    fs.mkdirSync(root, { recursive: true });
    const python = process.env.SAMEKO_PYTHON || (win ? 'python' : 'python3');
    const venv = path.join(root, 'python');
    const vpython = path.join(venv, win ? 'Scripts' : 'bin', exe('python'));
    if (!fs.existsSync(vpython)) run(python, ['-m', 'venv', venv]);
    run(vpython, ['-m', 'pip', 'install', 'python-lsp-server[autopep8]==1.14.0', 'debugpy==1.8.20']);

    const csharp = path.join(root, 'csharp');
    fs.mkdirSync(csharp, { recursive: true });
    if (!fs.existsSync(path.join(csharp, exe('csharp-ls')))) run('dotnet', ['tool', 'install', 'csharp-ls', '--version', '0.28.0', '--tool-path', csharp]);

    const netcore = path.join(root, 'netcoredbg');
    const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
    const asset = win ? 'netcoredbg-win64.zip' : process.platform === 'darwin' ? 'netcoredbg-osx-arm64.zip' : `netcoredbg-linux-${arch}.tar.gz`;
    if (win && process.arch !== 'x64' || process.platform === 'darwin' && process.arch !== 'arm64') throw new Error('Install a compatible netcoredbg manually on this platform.');
    if (!fs.existsSync(path.join(netcore, exe('netcoredbg')))) {
        const archive = path.join(root, asset);
        await download(`https://github.com/Samsung/netcoredbg/releases/download/3.2.0-1092/${asset}`, archive);
        if (asset.endsWith('.zip')) {
            if (win) run('tar', ['-xf', archive, '-C', root]);
            else run('unzip', ['-o', archive, '-d', root]);
        } else run('tar', ['-xzf', archive, '-C', root]);
    }

    const jdt = path.join(root, 'jdtls');
    fs.mkdirSync(jdt, { recursive: true });
    if (!fs.existsSync(path.join(jdt, 'plugins'))) {
        const archive = path.join(root, 'jdtls.tar.gz');
        await download('https://download.eclipse.org/jdtls/milestones/1.46.1/jdt-language-server-1.46.1-202504011455.tar.gz', archive);
        run('tar', ['-xzf', archive, '-C', jdt]);
    }
    const plugin = path.join(root, 'com.microsoft.java.debug.plugin-0.53.1.jar');
    if (!fs.existsSync(plugin)) await download('https://repo.maven.apache.org/maven2/com/microsoft/java/com.microsoft.java.debug.plugin/0.53.1/com.microsoft.java.debug.plugin-0.53.1.jar', plugin);
    const launcher = fs.readdirSync(path.join(jdt, 'plugins')).find(name => /^org.eclipse.equinox.launcher_[\d.]+.*\.jar$/.test(name));
    if (!launcher) throw new Error('JDT LS launcher not found');
    const tools = {
        pythonLsp: { command: vpython, args: ['-m', 'pylsp'] },
        pythonDebug: { command: vpython, args: ['-m', 'debugpy.adapter'] },
        csharpLsp: { command: path.join(csharp, exe('csharp-ls')), args: [] },
        csharpDebug: { command: path.join(netcore, exe('netcoredbg')), args: ['--interpreter=vscode'] },
        javaLsp: {
            command: process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', exe('java')) : 'java',
            args: ['-Declipse.application=org.eclipse.jdt.ls.core.id1', '-Dosgi.bundles.defaultStartLevel=4', '-Declipse.product=org.eclipse.jdt.ls.core.product', '-Dlog.level=WARNING', '-Xmx512m', '--add-modules=ALL-SYSTEM', '--add-opens', 'java.base/java.util=ALL-UNNAMED', '--add-opens', 'java.base/java.lang=ALL-UNNAMED', '-jar', path.join(jdt, 'plugins', launcher), '-configuration', path.join(jdt, win ? 'config_win' : process.platform === 'darwin' ? 'config_mac' : 'config_linux'), '-data', '${workspaceData}'],
            initializationOptions: { bundles: [plugin] },
        },
    };
    fs.writeFileSync(path.join(root, 'tools.json'), JSON.stringify(tools, null, 2));
    console.log(`Language tools ready: ${root}\nThe app discovers tools.json automatically. No user settings were changed.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
