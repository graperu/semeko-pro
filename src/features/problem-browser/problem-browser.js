'use strict';

window.ProblemBrowser = (() => {
    const names = { codeforces: 'Codeforces', leetcode: 'LeetCode', hackerrank: 'HackerRank', '28tech':'Bài tập luyện tập' };
    const $ = id => document.getElementById(id);
    let items = [], selected = null, page = 0, total = 0, pageSize = 30, listRevision = 0, detailRevision = 0, importing = false, pinnedLibraryId=null;
    function status(message) { $('oj-status').textContent = message; }
    function resetDetail() {
        selected = null; detailRevision++;
        $('oj-start').disabled = true;
        $('oj-problem-title').dataset.uiText = 'Select a problem from the list';
        $('oj-problem-title').textContent = window.UILanguage ? UILanguage.translate('Select a problem from the list') : 'Select a problem from the list';
        $('oj-problem-note').textContent = '';
        $('oj-statement').replaceChildren();
        window.StatementTranslation?.setStatement('');
    }
    function pagination(busy = false) {
        $('oj-prev').disabled = busy || page === 0;
        $('oj-next').disabled = busy || (page + 1) * pageSize >= total;
        const pages=Math.ceil(total/pageSize),input=$('oj-page-input');
        if(input){input.value=pages?String(page+1):'';input.max=String(pages||1);input.disabled=busy||!pages;$('oj-page-total').textContent='/ '+pages;}
    }
    async function load(nextPage = 0) {
        const revision = ++listRevision;
        const provider = $('oj-provider').value;
        for(const id of ['btn-submit-online','btn-submit-browser','btn-submit-official'])if($(id))$(id).hidden=provider==='28tech';
        $('oj-difficulty').closest('label').hidden=provider==='28tech';
        const difficultyLabels=provider==='codeforces'?['All levels','Easy / CF ≤1200','Medium / CF 1300–2000','Hard / CF >2000']:['All levels','Easy','Medium','Hard'];
        [...$('oj-difficulty').options].forEach((o,i)=>{o.textContent=window.UILanguage?UILanguage.translate(difficultyLabels[i]):difficultyLabels[i];});
        if(provider==='hackerrank'&&$('oj-track').value==='cpp')$('oj-language').value='cpp';
        page = nextPage; resetDetail();
        $('oj-results').replaceChildren();
        $('oj-track-label').hidden = provider !== 'hackerrank';
        $('oj-view-label').hidden = provider !== 'codeforces';
        $('oj-search-submit').disabled = true; pagination(true);
        status('Loading problems…');
        try {
            const response = await window.electronAPI.ojListProblems({ provider, page, view: $('oj-view').value, search: pinnedLibraryId||$('oj-search').value, difficulty: $('oj-difficulty').value, track: $('oj-track').value });
            if (revision !== listRevision) return;
            if (!response.ok) throw new Error(response.error);
            items = response.data.items; total = response.data.total; pageSize = response.data.pageSize || 30;
            const containers = new Map();
            for (const [index,group] of (response.data.groups || []).entries()) {
                const section=document.createElement('details');section.className='oj-contest';section.open=index===0;
                const title=document.createElement('summary');title.textContent=provider==='28tech'?`${group.name.replace(/28\s*tech/gi,'').trim()} (${group.items.length})`:`${group.name} · #${group.id} (${group.items.length})`;title.dataset.i18nPreserve='';
                const body=document.createElement('div');section.append(title,body);$('oj-results').append(section);containers.set(group.id,body);
                if(provider==='codeforces'){const standings=document.createElement('button');standings.type='button';standings.textContent='Bảng xếp hạng';standings.onclick=()=>window.ContestStandings.open(group.id);body.append(standings);}
            }
            for (const item of items) {
                const button = document.createElement('button');
                button.type = 'button'; button.className = 'oj-result';
                const title = document.createElement('strong');
                const number=response.data.groups&&provider==='codeforces'?item.index:item.number;title.textContent=(number?number+'. ':'')+item.title;title.title=title.textContent;
                const info = document.createElement('small');
                if(provider==='28tech')item.tags=item.tags.map(t=>t.replace(/28\s*tech/gi,'').trim());
                info.textContent = [window.UILanguage ? UILanguage.translate(item.difficulty) : item.difficulty, item.paid ? (window.UILanguage ? UILanguage.translate('Locked / Premium') : 'Locked / Premium') : '', item.tags.slice(0, 3).join(' · ')].filter(Boolean).join(' · ');
                button.append(title, info);
                button.onclick = () => select(item, button);
                const target=containers.get(item.contestId) || $('oj-results');
                if(item.provider==='codeforces'){
                    const row=document.createElement('div');row.className='oj-problem-row';
                    const rank=document.createElement('button');rank.type='button';rank.className='oj-problem-rank';rank.textContent='🏆';rank.title='Bảng xếp hạng kỳ thi của bài '+item.number;rank.setAttribute('aria-label',rank.title);
                    rank.onclick=()=>window.ContestStandings.open(item.contestId||Number(item.id.split('-')[0]));row.append(button,rank);target.append(row);
                }else target.append(button);
            }
            if(provider==='28tech')status(`${total.toLocaleString()} tài liệu bài tập · Chọn tài liệu, sau đó chọn từng bài`);
            else status(items.length ? (response.data.groups ? `${total.toLocaleString()} contests · ${response.data.problemTotal.toLocaleString()} problems` : `${total.toLocaleString()} ${total === 1 ? 'problem' : 'problems'} · ${names[provider]} · select one to preview${response.data.truncated ? ' · first 1,500 category entries indexed' : ''}`) : 'No matching problems. Try another name, ID or difficulty.');
        } catch (error) {
            if (revision !== listRevision) return;
            items = []; total = 0;
            status(error.message + ' You can still use Open official page.');
        } finally {
            if (revision === listRevision) { $('oj-search-submit').disabled = false; pagination(); }
        }
    }
    async function safeStatement(html, provider) {
        // Cached KaTeX contains essential inline layout styles. Do not allow
        // arbitrary remote styles: restore its TeX first and render fresh after
        // sanitization, otherwise fractions and scripts lose their positioning.
        const cached=new DOMParser().parseFromString(html,'text/html');
        for(const math of cached.querySelectorAll('.katex')){
            const source=math.querySelector('annotation[encoding="application/x-tex"]');
            if(!source)continue;
            const display=math.closest('.katex-display'),span=cached.createElement('span');
            span.dataset.statementMath=display?'display':'inline';span.textContent=source.textContent;
            (display||math).replaceWith(span);
        }
        html=cached.body.innerHTML;
        if (provider === 'codeforces') {
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            for (const math of parsed.querySelectorAll('script[type^="math/tex"]')) {
                const span = parsed.createElement('span');
                span.dataset.statementMath = math.type.includes('mode=display') ? 'display' : 'inline';
                span.textContent = math.textContent; math.replaceWith(span);
            }
            for (const duplicate of parsed.querySelectorAll('.MathJax_Preview, .MathJax, .MathJax_Display, .MathJax_SVG, .MathJax_SVG_Display, .MJX_Assistive_MathML')) duplicate.remove();
            html = parsed.querySelector('.problem-statement')?.innerHTML || '';
        }
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
            if(/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(image.getAttribute('src')||'')){image.loading='lazy';image.decoding='async';continue;}
            try {
                const url = new URL(image.getAttribute('src'), { codeforces: 'https://codeforces.com', leetcode: 'https://leetcode.com', hackerrank: 'https://www.hackerrank.com' }[provider]);
                const allowed = ['codeforces.com', 'codeforces.org', 'leetcode.com', 'hrcdn.net', 'hackerrank.com', 'amazonaws.com'];
                if (url.protocol !== 'https:' || !allowed.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) { image.remove(); continue; }
                image.src = url.href; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
                if(provider==='codeforces'||provider==='leetcode'){
                    image.alt=image.alt||'Hình minh họa đề bài';
                    const result=await electronAPI.ojStatementImage(url.href);
                    if(result.ok)image.src=result.data;
                    else{const warning=doc.createElement('p');warning.className='statement-image-warning';warning.textContent='Không tải được hình minh họa: '+result.error;image.after(warning);}
                }
            } catch (_) { image.remove(); }
        }
        return formatMath(doc.body.innerHTML);
    }
    async function formatMath(html) {
        const doc=new DOMParser().parseFromString(html,'text/html');
        await loadScript('../node_modules/katex/dist/katex.min.js');
        await loadScript('../node_modules/katex/dist/contrib/auto-render.min.js');
        const options = { throwOnError: false, trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 20, output: 'htmlAndMathml', macros:{'\\replacedVerb':'\\texttt{#1}'} };
        const renderFormula=(text,node,settings=options)=>{
            try{katex.render(text,node,settings);}catch(_){node.textContent=text;node.classList.add('statement-math-fallback');}
        };
        const ignored='pre,code,kbd,samp,textarea,script,style,.sample-test,.input,.output,.challenge_sample_input_body,.challenge_sample_output_body';
        // Render delimited formulas first so nearby legacy fragments remain in
        // separate text nodes instead of being skipped with the whole paragraph.
        try { renderMathInElement(doc.body, { ...options, ignoredClasses:['katex','sample-test','input','output','challenge_sample_input_body','challenge_sample_output_body'], delimiters: [
            {left:'$$$',right:'$$$',display:false},{left:'$$',right:'$$',display:true},
            {left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false},{left:'$',right:'$',display:false}
        ] }); } catch (_) {}
        for (const node of doc.querySelectorAll('[data-statement-math]')) {
            if(node.closest(ignored))continue;
            renderFormula(node.textContent, node, { ...options, displayMode: node.dataset.statementMath === 'display' });
        }
        {
            // Older caches stripped MathJax script boundaries. Recover complete
            // array environments and numeric XOR expressions without rewriting prose.
            const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
            const texts = []; let text;
            while ((text = walker.nextNode())) if (!text.parentElement.closest(ignored+',.katex,[data-statement-math]')) texts.push(text);
            for (const node of texts) {
                if (node.data.includes('$') || /\\[([]/.test(node.data)) continue;
                const pattern = /\\begin\{array\}[\s\S]*?\\end\{array\}|\d+(?:\s*\\oplus\s*\d+)+|\\\{[^\n]*?\\\}|(?:[A-Za-z][A-Za-z0-9]*)?(?:[_^]\{(?:[^{}\n]|\{[^{}\n]*\})*\})+|\\(?:dfrac|tfrac|frac|binom)\{[^{}\n]*\}\{[^{}\n]*\}|\\sqrt(?:\[[^\]\n]*\])?\{[^{}\n]*\}|\\(?:mathcal|mathbb|mathbf|mathrm|operatorname)\{[^{}]+\}(?:[_^]\{(?:[^{}\n]|\{[^{}\n]*\})*\})*|\\(?:to|rightarrow|leftarrow|Rightarrow|Leftarrow|Leftrightarrow|leq|geq|neq|subseteq|subset|in|notin|cup|cap|emptyset|ldots|cdots|dots|cdot|oplus|times|infty|min|max|gcd|log|bmod)\b/g;
                const recoveredPattern=new RegExp([
                    /\\left\s*(?:\\[{}|]|[()[\]|.])[^\n]*?\\right\s*(?:\\[{}|]|[()[\]|.])/.source,
                    /\\(?:sum|prod|bigoplus|oplus|lim)(?:[_^]\{(?:[^{}\n]|\{[^{}\n]*\})*\})*/.source,
                    /\\(?:text|texttt|replacedVerb)\s*\{[^{}\n]*\}/.source,
                    /\\(?:le|ge|ne|lt|gt|quad|qquad)\b/.source,
                    pattern.source
                ].join('|'),'g');
                const fragment = doc.createDocumentFragment(); let match, offset = 0;
                while ((match = recoveredPattern.exec(node.data))) {
                    fragment.append(node.data.slice(offset, match.index));
                    const span = doc.createElement('span'); renderFormula(match[0], span); fragment.append(span);
                    offset = match.index + match[0].length;
                }
                if (offset) { fragment.append(node.data.slice(offset)); node.replaceWith(fragment); }
            }
        }
        // Legacy cached MathJax source is often retained inside tex-span nodes.
        for (const node of doc.querySelectorAll('.tex-span')) {
            if(node.closest(ignored))continue;
            if (!node.querySelector('.katex') && /\\[a-zA-Z]+|[_^]/.test(node.textContent)) renderFormula(node.textContent, node);
        }
        return doc.body.innerHTML;
    }
    async function select(item, button) {
        $('oj-statement').dataset.provider=item.provider;
        const revision = ++detailRevision;
        selected = null; $('oj-start').disabled = true;
        $('oj-start').textContent = 'Start solving';
        for (const other of $('oj-results').querySelectorAll('button')) other.removeAttribute('aria-current');
        button.setAttribute('aria-current', 'true');
        delete $('oj-problem-title').dataset.uiText;
        $('oj-problem-title').textContent = item.title;
        $('oj-problem-note').textContent = item.provider==='28tech'?'Đang chuẩn bị đề từ tài liệu. Lần đầu có thể lâu hơn; lần sau dùng bản đã lưu.':'Loading statement and starter code…';
        $('oj-statement').setAttribute('aria-busy','true');
        $('oj-statement').replaceChildren();
        window.StatementTranslation?.setStatement('');
        if (item.paid) {
            $('oj-statement').setAttribute('aria-busy','false');
            selected = { ...item, paid: true };
            $('oj-problem-note').textContent = 'This problem is locked or Premium. Open it on the official website with your own account.';
            return;
        }
        try {
            const response = await window.electronAPI.ojProblemDetail({ provider: item.provider, id: item.id });
            if (revision !== detailRevision) return;
            if (!response.ok) throw new Error(response.error);
            const detail = response.data;
            if(!detail.html&&!detail.children?.length&&!detail.paid)throw Error(
                detail.provider==='codeforces'&&/403|verification/i.test(detail.sourceError||'')
                    ? 'Codeforces đang từ chối tải đề (HTTP 403). Chưa có nội dung để làm bài. Bạn có thể thử tải lại hoặc mở trang gốc.'
                    : detail.sourceError||'Chưa tải được nội dung đề bài. Hãy thử tải lại.');
            $('oj-problem-title').textContent=detail.title||item.title;
            if(detail.children?.length){
                selected=null;$('oj-start').disabled=true;$('oj-problem-note').textContent=detail.note;$('oj-statement').replaceChildren();
                const collectionTitle=detail.title;
                const showChildren=()=>{selected=null;$('oj-start').disabled=true;$('oj-problem-title').textContent=collectionTitle;$('oj-problem-note').textContent=detail.note;$('oj-statement').replaceChildren();window.StatementTranslation?.setStatement('');drawChildren();};
                const drawChildren=()=>{
                for(const child of detail.children){const b=document.createElement('button');b.className='oj-result';b.textContent=child.title;b.onclick=async()=>{
                    selected={...detail,...child,children:undefined,id:detail.id+'-'+child.index,title:child.title,url:detail.url+'#exercise-'+child.index};
                    const childSelection=selected;const childHtml=await formatMath(child.html);if(selected!==childSelection||revision!==detailRevision)return;
                    $('oj-problem-title').textContent=child.title;$('oj-statement').innerHTML=childHtml;window.StatementTranslation?.setStatement('');
                    const back=document.createElement('button');back.className='action-btn';back.textContent='← Danh sách bài trong nhóm';back.onclick=showChildren;$('oj-statement').prepend(back);
                    if(child.referenceAnswer){const solved=window.PracticeLibrary?.entries().some(e=>e.problem?.url===selected.url&&e.status==='solved');const reveal=document.createElement('button');reveal.className='action-btn';reveal.textContent=solved?'Đã giải xong — xem lời giải tham khảo':'Bí rồi, xem lời giải tham khảo';const answer=child.referenceAnswer;reveal.onclick=()=>{const box=document.createElement('pre');box.textContent=answer;box.dataset.i18nPreserve='';reveal.replaceWith(box);};$('oj-statement').append(reveal);}
                    $('oj-start').disabled=child.mode==='reading';$('oj-problem-note').textContent=child.mode==='reading'?'Bài JavaScript đọc và tự thực hành; chưa hỗ trợ chạy JavaScript trong bộ chấm.':child.tests.length+' test mẫu từ đề gốc';
                };$('oj-statement').append(b);}};showChildren();return;
            }
            let html = detail.html ? await safeStatement(detail.html, item.provider) : '';
            const sourceHtml=html;
            if(item.provider==='codeforces'&&html&&window.StatementTranslation)html=await StatementTranslation.normalizeEnglish(html);
            if (revision !== detailRevision) return;
            selected = detail;
            $('oj-problem-note').textContent = detail.paid ? 'This problem is locked or Premium. Open it on the official website with your own account.' : detail.note;
            if(html!==sourceHtml||detail.englishGenerated)$('oj-problem-note').textContent+=' · Bản tiếng Anh được dịch từ nguồn tiếng Nga.';
            $('oj-statement').innerHTML = html;
            let savedVietnamese=detail.savedVietnamese;
            if(savedVietnamese&&item.provider==='codeforces')savedVietnamese=await safeStatement('<div class="problem-statement">'+savedVietnamese+'</div>','codeforces');
            else if(savedVietnamese)savedVietnamese=await safeStatement(savedVietnamese,item.provider);
            if(revision!==detailRevision)return;
            window.StatementTranslation?.setStatement(item.provider==='28tech'?'':html,savedVietnamese);
            if (!html) $('oj-statement').textContent = 'Use Open official page to read the complete problem statement.';
            $('oj-start').disabled = !!detail.paid||detail.mode==='reading';
            $('oj-start').textContent = detail.provider === 'codeforces' && !html ? 'Create file (no samples)' : 'Start solving';
        } catch (error) {
            if (revision !== detailRevision) return;
            $('oj-problem-note').textContent = error.message;
            selected = { ...item, previewFailed: true };
            const retry=document.createElement('button');retry.type='button';retry.className='action-btn';retry.textContent='Thử tải lại đề';retry.onclick=()=>select(item,button);$('oj-statement').replaceChildren(retry);
        } finally {
            if(revision===detailRevision)$('oj-statement').setAttribute('aria-busy','false');
        }
    }
    function sampleTests(detail) {
        if(detail.provider==='28tech')return detail.tests||[];
        if (detail.provider === 'codeforces') {
            const doc = new DOMParser().parseFromString(detail.html || '', 'text/html');
            const inputs = [...doc.querySelectorAll('.sample-test .input pre')];
            const outputs = [...doc.querySelectorAll('.sample-test .output pre')];
            const plain = node => {
                const copy = node.cloneNode(true);
                for (const br of copy.querySelectorAll('br')) br.replaceWith('\n');
                for (const row of copy.querySelectorAll('.test-example-line')) row.append('\n');
                return copy.textContent.trimEnd() + '\n';
            };
            return inputs.flatMap((input, index) => outputs[index] ? [{ input: plain(input), output: plain(outputs[index]) }] : []);
        }
        if (detail.provider === 'leetcode') {
            const doc = new DOMParser().parseFromString(detail.html || '', 'text/html');
            const outputs = [...doc.querySelectorAll('pre, p')].flatMap(pre => {
                const match = /(?:^|\n)\s*Output:\s*([^\n]+)/i.exec(pre.textContent);
                return match ? [match[1].trim()] : [];
            });
            return (detail.examples || []).flatMap((example, index) => {
                try {
                    const args = example.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
                    if (args.length !== detail.metadata?.params?.length || !outputs[index]) return [];
                    return [{ input: JSON.stringify(args), output: JSON.stringify(JSON.parse(outputs[index])) }];
                } catch (_) { return []; }
            });
        }
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
        if (detail.provider === 'leetcode' && extension === 'cpp') code = '#include <bits/stdc++.h>\nusing namespace std;\n\n' + code;
        const comment = extension === 'py' ? '# ' : '// ';
        return `${comment}${detail.url}\n${comment}${detail.mode === 'function' ? 'Function solution — C++/Python: Run sample tests locally; submit on LeetCode.' : 'Complete the solution, then build and run sample tests.'}\n\n${code}\n`;
    }
    async function start() {
        if (importing || !selected || selected.paid || selected.previewFailed) return;
        importing = true; $('oj-start').disabled = true;
        const detail = selected, extension = $('oj-language').value;
        try {
            const code = starter(detail, extension);
            const tests = sampleTests(detail);
            let filePath;
            if(detail.provider==='codeforces'){
                const match=/^(\d+)-([A-Za-z]\d*)$/.exec(detail.id);
                if(!match)throw Error('Invalid Codeforces problem identifier');
                FileExplorer.saveCategoriesForFolder(FileExplorer.currentFolder);
                if(FileExplorer.contestFolder&&FileExplorer.contestMeta)await FileExplorer.saveContestMeta(FileExplorer.contestFolder,FileExplorer.contestMeta);
                FileExplorer.leaveContest();
                const result=await electronAPI.ojContestWorkspace({contestId:Number(match[1]),index:match[2].toUpperCase(),extension,starter:code});
                if(!result.ok)throw Error(result.error);
                filePath=result.data.entry;const folder=result.data.folder;
                FileExplorer.currentFolder=folder;FileExplorer.filterText='';
                WorkspaceSupport.setFolderLanguage(extension);
                const filter=document.getElementById('explorer-filter');if(filter)filter.value='';
                FileExplorer.expandedFolders.clear();FileExplorer.expandedFolders.add(folder);FileExplorer.loadCategoriesForFolder(folder);
                await FileExplorer.refreshTree();FileExplorer.saveState();if(!FileExplorer.isOpen)FileExplorer.open();
            }
            await handleProblemReceived({
                name: `${names[detail.provider]} ${detail.number || detail.id} - ${detail.title}`,
                url: detail.url, group: names[detail.provider], tests,
                sourcePlatform: detail.provider, problemId:detail.id,contestId:detail.contestId,solutionMode: detail.mode, functionMetadata: detail.metadata
            }, { newTab: true, starter: code, extension, filePath });
            localStorage.setItem('sameko-oj-provider', detail.provider);
            $('oj-browser').close();
            if (detail.mode === 'function') showToast(`${tests.length} sample tests loaded. C++/Python: press Run to test your function.`, 'info');
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
        const libraryOption=document.createElement('option');libraryOption.value='28tech';libraryOption.textContent='Bài tập luyện tập';$('oj-provider').append(libraryOption);
        const divider = $('oj-divider'), body = divider.parentElement;
        let ratio = 35;
        try { const saved = Number(localStorage.getItem('sameko-oj-split')); if (saved >= 20 && saved <= 70) ratio = saved; } catch (_) {}
        const resize = value => {
            ratio = Math.max(20, Math.min(70, value));
            const width = body.getBoundingClientRect().width;
            if (width) body.style.setProperty('--oj-list-width', Math.max(Math.min(180, width * .35), Math.min(width - Math.min(240, width * .4) - 8, width * ratio / 100)) + 'px');
            divider.setAttribute('aria-valuenow', Math.round(ratio));
        };
        const persist = () => { try { localStorage.setItem('sameko-oj-split', String(ratio)); } catch (_) {} };
        divider.onpointerdown = event => {
            if (event.button !== 0) return;
            event.preventDefault(); divider.setPointerCapture(event.pointerId); divider.classList.add('dragging');
        };
        divider.onpointermove = event => {
            if (!divider.hasPointerCapture(event.pointerId)) return;
            const bounds = body.getBoundingClientRect(); resize((event.clientX - bounds.left) / bounds.width * 100);
        };
        const finish = () => { divider.classList.remove('dragging'); persist(); };
        divider.onpointerup = event => { if (divider.hasPointerCapture(event.pointerId)) divider.releasePointerCapture(event.pointerId); finish(); };
        divider.onlostpointercapture = finish;
        divider.onpointercancel = finish;
        divider.ondblclick = () => { resize(35); persist(); };
        divider.onkeydown = event => {
            const value = { ArrowLeft: ratio - 2, ArrowRight: ratio + 2, Home: 20, End: 70 }[event.key];
            if (value === undefined) return; event.preventDefault(); resize(value); persist();
        };
        new ResizeObserver(() => resize(ratio)).observe(body);
        const saved = localStorage.getItem('sameko-oj-provider');
        if (names[saved]) $('oj-provider').value = saved;
        $('btn-problem-browser').onclick = open;
        $('oj-close').onclick = () => $('oj-browser').close();
        $('oj-search-form').onsubmit = event => { event.preventDefault(); load(0); };
        for (const id of ['oj-provider', 'oj-difficulty', 'oj-track', 'oj-view']) $(id).onchange = () => load(0);
        $('oj-prev').onclick = () => load(Math.max(0, page - 1));
        $('oj-next').onclick = () => load(page + 1);
        $('oj-page').innerHTML='<input id="oj-page-input" type="number" min="1" step="1" inputmode="numeric" aria-label="Số trang" title="Nhập số trang và nhấn Enter"><span id="oj-page-total"></span>';
        $('oj-page-input').onkeydown=event=>{
            if(event.key==='Escape'){event.preventDefault();pagination();event.target.blur();return;}
            if(event.key!=='Enter'||event.target.disabled)return;
            event.preventDefault();const value=Number(event.target.value),pages=Math.ceil(total/pageSize);
            if(!event.target.value.trim()||!Number.isInteger(value)||!pages){pagination();return;}
            const target=Math.max(1,Math.min(pages,value))-1;
            if(target!==page)load(target);else pagination();
        };
        $('oj-page-input').onblur=()=>pagination($('oj-search-submit').disabled);
        $('oj-start').onclick = start;
        $('oj-open-official').onclick = async () => {
            const response = await window.electronAPI.ojOpenProblem({ provider: selected?.provider || $('oj-provider').value, id: selected?.id, track:$('oj-track').value });
            if (!response.ok) status(response.error);
        };
        $('oj-statement').onclick = event => { if (event.target.closest('a')) event.preventDefault(); };
        pagination();
    }
    async function openLibrary(id){$('oj-provider').value='28tech';$('oj-search').value='';pinnedLibraryId=id;try{open();await load(0);if(items[0])await select(items[0],$('oj-results').querySelector('.oj-result'));}finally{pinnedLibraryId=null;}}
    return { init, open, openLibrary, sampleTests, starter, safeStatement, formatMath };
})();
