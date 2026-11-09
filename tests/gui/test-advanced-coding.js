'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { _electron } = require('playwright-core');
const { fixtures, seed } = require('../fixtures/advanced-corpus');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'plans/artifacts/testing/advanced');
const report = { seed, started: new Date().toISOString(), programs: [], checks: [], failures: [] };
const normalize = s => String(s).replace(/\r\n?/g, '\n').split('\n').map(s => s.trimEnd()).join('\n').trim();
let app, page;

async function compile(id, ext, content, functionMetadata) {
    fs.writeFileSync(path.join(OUT, id + '.' + ext), content);
    const built = await page.evaluate(options => window.electronAPI.compile(options), {
        fileName: ext === 'java' ? 'Main.java' : 'main.' + ext,
        content, flags: '-std=c++17 -O2', untitledId: 'advanced-' + process.pid + '-' + id,
        functionMetadata
    });
    report.programs.push({ id, compiled: built.success, error: built.error });
    if (!built.success) report.failures.push({ id, error: built.error });
    return { ...built, functionMetadata };
}

async function check(id, built, test, expectedStatus = 'AC') {
    const result = await page.evaluate(options => window.electronAPI.runTest(options), {
        exePath: built.outputPath, input: test.input, expectedOutput: test.expected,
        functionMetadata: built.functionMetadata, timeLimit: test.label.startsWith('stress') ? 15000 : 5000
    });
    const outputMatches = normalize(result.output) === normalize(test.expected);
    const correct = result.status === expectedStatus &&
        (expectedStatus === 'AC' ? outputMatches : expectedStatus === 'WA' ? !outputMatches : true);
    const record = { id, label: test.label, expectedStatus, actualStatus: result.status, correct,
        input: test.input, expectedOutput: test.expected, output: result.output, details: result.details,
        timeMs: result.time ?? result.timeMs ?? result.executionTime };
    report.checks.push(record);
    if (!correct) report.failures.push(record);
}

function mutant(name, code) {
    const [from, to] = {
        dijkstra: ['d[0]=0', 'd[0]=1'],
        knapsack01: ['dp[j-w]+v', 'dp[j-w]-v'],
        lazySegmentTree: ['lazy[p]+=v', 'lazy[p]+=0'],
        dinicMaxFlow: code.includes('cap[u][v]+=w') ? ['cap[u][v]+=w', 'cap[u][v]+=0'] : ['cap[u*N+v]+=w', 'cap[u*N+v]+=0']
    }[name];
    assert(code.includes(from), 'Mutation site missing: ' + name);
    return code.replaceAll(from, to);
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath: require('electron'), args: [ROOT,
        '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'semeko-advanced-'))], cwd: ROOT, env });
    for (let i = 0; i < 300; i++) {
        page = app.windows().find(p => p.url().includes('index.html'));
        if (page) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(page, 'Main application window did not open');
    await page.waitForFunction(() => window.App?.ready);
    for (const [name, fixture] of Object.entries(fixtures)) {
        if (process.argv[2] && name !== process.argv[2]) continue;
        for (const [ext, code] of Object.entries(fixture.sources)) {
            const id = name + '-' + ext;
            const built = await compile(id, ext, code);
            if (!built.success) { console.log('FAIL compile ' + id); continue; }
            for (let i = 0; i < fixture.cases.length; i++) await check(id + '-' + i, built, fixture.cases[i]);
            const wrong = await compile(id + '-mutant', ext, mutant(name, code));
            if (wrong.success) await check(id + '-mutant-rejected', wrong,
                fixture.cases[name === 'dijkstra' ? 0 : 1], 'WA');
            console.log('CHECK ' + id + ': ' + fixture.cases.length + ' inputs and wrong-code rejection');
        }
    }
})().catch(error => {
    report.failures.push({ harnessError: error.stack });
    console.error(error);
}).finally(async () => {
    report.finished = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    if (app) await app.close();
    console.log(JSON.stringify({ builds: report.programs.length, checks: report.checks.length, failures: report.failures.length }));
    if (report.failures.length) { console.log(JSON.stringify(report.failures.map(({ input, ...rest }) => rest), null, 2)); process.exitCode = 1; }
});
