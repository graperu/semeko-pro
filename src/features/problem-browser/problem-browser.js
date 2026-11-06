'use strict';

window.ProblemBrowser = (() => {
    const names = { codeforces: 'Codeforces', leetcode: 'LeetCode', hackerrank: 'HackerRank' };
    const $ = id => document.getElementById(id);
    let items = [], selected = null, page = 0, total = 0, listRevision = 0, detailRevision = 0, importing = false;
    function status(message) { $('oj-status').textContent = message; }
    function resetDetail() {
        selected = null; detailRevision++;
        $('oj-start').disabled = true;
        $('oj-problem-title').textContent = 'Select a problem from the list';
        $('oj-problem-note').textContent = '';
        $('oj-statement').replaceChildren();
    }
    function pagination(busy = false) {
        $('oj-prev').disabled = busy || page === 0;
        $('oj-next').disabled = busy || (page + 1) * 30 >= total;
        $('oj-page').textContent = total ? `${page + 1} / ${Math.ceil(total / 30)}` : '0 results';
    }
    async function load(nextPage = 0) {
        const revision = ++listRevision;
        const provider = $('oj-provider').value;
        page = nextPage; resetDetail();
        $('oj-results').replaceChildren();
        $('oj-track-label').hidden = provider !== 'hackerrank';
        $('oj-search-submit').disabled = true; pagination(true);
        status('Loading problems…');
        try {
            const response = await window.electronAPI.ojListProblems({ provider, page, search: $('oj-search').value, difficulty: $('oj-difficulty').value, track: $('oj-track').value });
            if (revision !== listRevision) return;
            if (!response.ok) throw new Error(response.error);
            items = response.data.items; total = response.data.total;
            for (const item of items) {
                const button = document.createElement('button');
                button.type = 'button'; button.className = 'oj-result';
                const title = document.createElement('strong');
                title.textContent = `${item.number ? item.number + '. ' : ''}${item.title}`;
                const info = document.createElement('small');
                info.textContent = [item.difficulty, item.paid ? 'Locked / Premium' : '', item.tags.slice(0, 3).join(' · ')].filter(Boolean).join(' · ');
                button.append(title, info);
                button.onclick = () => select(item, button);
                $('oj-results').append(button);
            }
            status(items.length ? `${total.toLocaleString()} ${total === 1 ? 'problem' : 'problems'} · ${names[provider]} · select one to preview${response.data.truncated ? ' · first 1,500 category entries indexed' : ''}` : 'No matching problems. Try another name, ID or difficulty.');
        } catch (error) {
            if (revision !== listRevision) return;
            items = []; total = 0;
            status(error.message + ' You can still use Open official page.');
        } finally {
            if (revision === listRevision) { $('oj-search-submit').disabled = false; pagination(); }
        }
    }
    async function safeStatement(html, provider) {
        await loadScript('../node_modules/dompurify/dist/purify.min.js');
        const sanitized = window.DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true, svg: true },
            FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'video', 'audio'],
            FORBID_ATTR: ['style', 'srcset'], ADD_ATTR: ['viewBox']
        });
        const doc = new DOMParser().parseFromString(sanitized, 'text/html');
        // MathJax's hidden glyph-definitions SVG loses its inline display:none
        // during sanitization. Keep the definitions without reserving blank space.
        for (const svg of doc.querySelectorAll('svg')) {
            if ([...svg.children].every(node => ['defs', 'title', 'desc'].includes(node.localName))) {
                svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
            }
        }
        for (const node of doc.querySelectorAll('[id]')) node.id = 'oj-statement-' + node.id;
        for (const node of doc.querySelectorAll('[href], [xlink\\:href]')) {
            for (const attr of ['href', 'xlink:href']) {
                const value = node.getAttribute(attr);
                if (!value) continue;
                if (node.tagName.toLowerCase() === 'use' && value.startsWith('#')) node.setAttribute(attr, '#oj-statement-' + value.slice(1));
                else node.removeAttribute(attr);
            }
        }
        for (const image of doc.querySelectorAll('img')) {
            try {
                const url = new URL(image.getAttribute('src'), { leetcode: 'https://leetcode.com', hackerrank: 'https://www.hackerrank.com' }[provider]);
                const allowed = ['leetcode.com', 'hrcdn.net', 'hackerrank.com', 'amazonaws.com'];
                if (url.protocol !== 'https:' || !allowed.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) { image.remove(); continue; }
                image.src = url.href; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
            } catch (_) { image.remove(); }
        }
        return doc.body.innerHTML;
    }
    async function select(item, button) {
        const revision = ++detailRevision;
        selected = null; $('oj-start').disabled = true;
        for (const other of $('oj-results').querySelectorAll('button')) other.removeAttribute('aria-current');
        button.setAttribute('aria-current', 'true');
        $('oj-problem-title').textContent = item.title;
        $('oj-problem-note').textContent = 'Loading statement and starter code…';
        $('oj-statement').replaceChildren();
        if (item.paid) {
            selected = { ...item, paid: true };
            $('oj-problem-note').textContent = 'This problem is locked or Premium. Open it on the official website with your own account.';
            return;
        }
        try {
            const response = await window.electronAPI.ojProblemDetail({ provider: item.provider, id: item.id });
            if (revision !== detailRevision) return;
            if (!response.ok) throw new Error(response.error);
            const detail = response.data;
            const html = detail.html ? await safeStatement(detail.html, item.provider) : '';
            if (revision !== detailRevision) return;
            selected = detail;
            $('oj-problem-note').textContent = detail.paid ? 'This problem is locked or Premium. Open it on the official website with your own account.' : detail.note;
            $('oj-statement').innerHTML = html;
            if (!html) $('oj-statement').textContent = 'Use Open official page to read the complete problem statement.';
            $('oj-start').disabled = !!detail.paid;
        } catch (error) {
            if (revision !== detailRevision) return;
            $('oj-problem-note').textContent = error.message;
            selected = { ...item, previewFailed: true };
        }
    }
    function sampleTests(detail) {
        if (detail.provider !== 'hackerrank') return [];
        const doc = new DOMParser().parseFromString(detail.html || '', 'text/html');
        const inputs = [...doc.querySelectorAll('.challenge_sample_input_body pre')];
        const outputs = [...doc.querySelectorAll('.challenge_sample_output_body pre')];
        const plain = element => {
            const copy = element.cloneNode(true);
            for (const br of copy.querySelectorAll('br')) br.replaceWith('\n');
            return copy.textContent.replace(/\r\n/g, '\n').trimEnd() + '\n';
        };
        return inputs.flatMap((input, index) => {
            if (!outputs[index]) return [];
            let text = plain(input);
            // HackerRank often presents a two-column "STDIN / Function" table.
            // Only its left column belongs in a console program's input.
            const lines = text.split('\n');
            const header = lines.findIndex(line => /^\s*STDIN\s+Function\s*$/i.test(line));
            if (header >= 0 && /^\s*-+\s+-+\s*$/.test(lines[header + 1] || '')) {
                const column = lines[header].search(/Function/i);
                text = lines.slice(header + 2).map(line => line.slice(0, column).trimEnd()).join('\n').trimEnd() + '\n';
            }
            // Some introductory statements label variables rather than give actual stdin.
            if (/^\s*\w+\s*=/m.test(text)) return [];
            return [{ input: text, output: plain(outputs[index]) }];
        });
    }
    function starter(detail, extension) {
        const language = detail.provider === 'leetcode' ? { cpp: 'cpp', c: 'c', py: 'python3', java: 'java', cs: 'csharp' }[extension] : extension;
        let code = detail.snippets?.[language];
        if (!code && detail.mode === 'function') throw new Error('This problem has no starter for the selected language. Choose another language.');
        if (!code) {
            const templates = {
                cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: read input and solve the problem.\n    return 0;\n}\n',
                c: '#include <stdio.h>\n\nint main(void) {\n    /* TODO: read input and solve the problem. */\n    return 0;\n}\n',
                py: 'def main():\n    # TODO: read input and solve the problem.\n    pass\n\n\nif __name__ == "__main__":\n    main()\n',
                java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: read input and solve the problem.\n    }\n}\n',
                cs: 'using System;\n\nclass Program {\n    static void Main() {\n        // TODO: read input and solve the problem.\n    }\n}\n'
            };
            code = templates[extension];
        }
        if (detail.provider === 'hackerrank') {
            if (extension === 'c') code = code.replace(/fopen\(getenv\("OUTPUT_PATH"\),\s*"w"\)/g, 'stdout');
            if (extension === 'py') code = 'import sys\n' + code.replace(/open\(os\.environ\[['"]OUTPUT_PATH['"]\],\s*['"]w['"]\)/g, 'sys.stdout');
            if (extension === 'cpp') {
                const redirected = [];
                code = code.replace(/ofstream\s+(\w+)\(getenv\("OUTPUT_PATH"\)\);/g, (_, name) => { redirected.push(name); return `ostream& ${name} = cout;`; });
                for (const name of redirected) code = code.replaceAll(name + '.close();', '');
            }
            if (extension === 'java') code = code.replace(/new FileWriter\(System\.getenv\("OUTPUT_PATH"\)\)/g, 'new OutputStreamWriter(System.out)');
            if (extension === 'cs') code = code.replace(/new StreamWriter\(@?System\.Environment\.GetEnvironmentVariable\("OUTPUT_PATH"\),\s*true\)/g, 'Console.Out');
        }
        const comment = extension === 'py' ? '# ' : '// ';
        return `${comment}${detail.url}\n${comment}${detail.mode === 'function' ? 'Function solution — run and submit on the official platform.' : 'Complete the solution, then build and run sample tests.'}\n\n${code}\n`;
    }
    async function start() {
        if (importing || !selected || selected.paid || selected.previewFailed) return;
        importing = true; $('oj-start').disabled = true;
        const detail = selected, extension = $('oj-language').value;
        try {
            const code = starter(detail, extension);
            const tests = sampleTests(detail);
            await handleProblemReceived({
                name: `${names[detail.provider]} ${detail.number || detail.id} - ${detail.title}`,
                url: detail.url, group: names[detail.provider], tests,
                sourcePlatform: detail.provider, solutionMode: detail.mode
            }, { newTab: true, starter: code, extension });
            localStorage.setItem('sameko-oj-provider', detail.provider);
            $('oj-browser').close();
            if (detail.mode === 'function') showToast('LeetCode function template loaded. Run and submit on LeetCode.', 'info');
            else if (!tests.length) showToast('Problem opened. Import samples with Get Tests from OJ or add your own.', 'info');
        } catch (error) { status(error.message); }
        finally { importing = false; $('oj-start').disabled = !selected || selected.paid || selected.previewFailed; }
    }
    function open() {
        if ($('oj-browser').open) return;
        $('oj-language').value = defaultSourceExtension();
        $('oj-browser').showModal();
        $('oj-open-official').disabled = false;
        if (!items.length) load(0);
    }
    function init() {
        const saved = localStorage.getItem('sameko-oj-provider');
        if (names[saved]) $('oj-provider').value = saved;
        $('btn-problem-browser').onclick = open;
        $('oj-close').onclick = () => $('oj-browser').close();
        $('oj-search-form').onsubmit = event => { event.preventDefault(); load(0); };
        for (const id of ['oj-provider', 'oj-difficulty', 'oj-track']) $(id).onchange = () => load(0);
        $('oj-prev').onclick = () => load(Math.max(0, page - 1));
        $('oj-next').onclick = () => load(page + 1);
        $('oj-start').onclick = start;
        $('oj-open-official').onclick = async () => {
            const response = await window.electronAPI.ojOpenProblem({ provider: selected?.provider || $('oj-provider').value, id: selected?.id });
            if (!response.ok) status(response.error);
        };
        $('oj-statement').onclick = event => { if (event.target.closest('a')) event.preventDefault(); };
        pagination();
    }
    return { init, open, sampleTests, starter, safeStatement };
})();
