'use strict';

// Codeforces serves statements to browser sessions but can reject Node fetch.
// Remote content is loaded without Node access; only the statement is returned.
async function loadStatement(url) {
    const { app, BrowserWindow, session } = require('electron');
    if (!app?.isReady?.()) return '';
    const allowed = value => {
        try { const parsed = new URL(value); return parsed.protocol === 'https:' && parsed.hostname === 'codeforces.com'; }
        catch (_) { return false; }
    };
    if (!allowed(url)) throw new Error('Invalid Codeforces statement URL.');
    const fs = require('fs'), path = require('path');
    const match = /\/problemset\/problem\/(\d+)\/([A-Za-z]\d*)$/.exec(new URL(url).pathname);
    if (!match) throw new Error('Invalid Codeforces problem URL.');
    const cacheFile = path.join(app.getPath('userData'), 'codeforces-statements', match[1] + '-' + match[2] + '.html');
    try { const saved = fs.readFileSync(cacheFile, 'utf8'); if (saved.includes('problem-statement') && saved.length < 3000000) return saved; } catch (_) {}
    const browserSession = session.defaultSession;
    const parent = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().includes('index.html'));
    const window = new BrowserWindow({ show: false, parent, width: 900, height: 700, title: 'Codeforces verification', autoHideMenuBar: true, webPreferences: {
        session: browserSession, sandbox: true, contextIsolation: true, nodeIntegration: false,
        backgroundThrottling: false, webSecurity: true
    } });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    for (const event of ['will-navigate', 'will-redirect']) window.webContents.on(event, (event, target) => {
        if (!allowed(target)) event.preventDefault();
    });
    let timer;
    try {
        return await Promise.race([
            (async () => {
                await window.loadURL(url);
                for (let attempt = 0; attempt < 12; attempt++) {
                    if (window.isDestroyed()) return '';
                    const html = await window.webContents.executeJavaScript(`(() => {
                        const statement = document.querySelector('.problem-statement');
                        if (!statement) return '';
                        const copy = statement.cloneNode(true);
                        // Preserve math source if MathJax has replaced it with script nodes.
                        for (const math of copy.querySelectorAll('script[type^="math/tex"]')) math.replaceWith(' ' + math.textContent + ' ');
                        for (const image of copy.querySelectorAll('img')) image.setAttribute('src', new URL(image.getAttribute('src'), location.href).href);
                        return copy.outerHTML;
                    })()`);
                    if (html && html.length < 3000000) {
                        try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, html, 'utf8'); } catch (_) {}
                        return html;
                    }
                    const verification = await window.webContents.executeJavaScript('/Just a moment|verification|verify/i.test(document.title + " " + document.body.innerText.slice(0, 300))');
                    if (verification) return '';
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
                return '';
            })(),
            new Promise(resolve => { timer = setTimeout(() => resolve(''), 15000); })
        ]);
    } catch (error) { console.warn('[Codeforces statement]', error.message); return ''; }
    finally { clearTimeout(timer); if (!window.isDestroyed()) window.destroy(); }
}

module.exports = { loadStatement };
