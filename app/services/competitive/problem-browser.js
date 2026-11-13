'use strict';

const PROVIDERS = new Set(['codeforces', 'leetcode', 'hackerrank', '28tech']);
const cache = new Map();
const pending = new Map();
const PAGE_SIZE = 30;

async function request(url, body) {
    const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'error', signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`The platform returned HTTP ${response.status}. Open its website or try again later.`);
    const raw = await response.text();
    if (raw.length > 12000000) throw new Error('Platform response is too large.');
    try { return JSON.parse(raw); } catch (_) { throw new Error('The platform returned a sign-in or verification page. Open its website to continue.'); }
}
async function memo(key, work) {
    const persistent=!key.startsWith('detail:');
    let disk;
    if(persistent&&!cache.has(key))try{
        const {app}=require('electron'),fs=require('fs'),path=require('path');
        disk=path.join(app.getPath('userData'),'problem-catalog-cache',require('crypto').createHash('sha256').update(key).digest('hex')+'.json');
        const saved=JSON.parse(fs.readFileSync(disk,'utf8'));
        if(saved.key===key&&saved.value&&Number.isFinite(saved.time))cache.set(key,saved);
    }catch(_){}
    const found = cache.get(key);
    if (found && Date.now() - found.time < 10 * 60 * 1000) return found.value;
    if(found&&persistent){
        if(!pending.has(key))refresh().catch(()=>{});
        return found.value;
    }
    if (pending.has(key)) return pending.get(key);
    return refresh();
    function refresh(){const task = work().then(value => {
        // A verification page / empty statement must not become a ten-minute
        // cached failure: retrying should actually contact the source again.
        if(!key.startsWith('detail:')||value.html||value.paid){
            if (cache.size >= 80) cache.delete(cache.keys().next().value);
            cache.set(key, { value, time: Date.now() });
            if(persistent)try{
                const {app}=require('electron'),path=require('path');
                const file=disk||path.join(app.getPath('userData'),'problem-catalog-cache',require('crypto').createHash('sha256').update(key).digest('hex')+'.json');
                require('fs').mkdirSync(path.dirname(file),{recursive:true});
                require('../../shared/fs-atomic').writeFileAtomicSync(file,JSON.stringify({key,value,time:Date.now()}),'utf8');
            }catch(_){}
        }return value;
    }).finally(() => pending.delete(key));
    pending.set(key, task); return task;}
}
function validate(provider, id) {
    if (!PROVIDERS.has(provider)) throw new Error('Unsupported problem platform.');
    if (id !== undefined && (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,160}$/.test(id))) throw new Error('Invalid problem identifier.');
}
function officialURL(provider, id, track) {
    validate(provider, id);
    if(provider==='hackerrank'&&!id&&['cpp','algorithms','data-structures','mathematics','python','java'].includes(track))return 'https://www.hackerrank.com/domains/'+track;
    if(provider==='28tech'){
        if(id?.startsWith('local-'))return '';
        const catalog=require('./tech-library').list(),item=catalog.items.find(i=>i.id===id);
        return item?`https://github.com/${catalog.repository}/blob/${catalog.commit}/`+item.path.split('/').map(encodeURIComponent).join('/'):`https://github.com/${catalog.repository}`;
    }
    if (!id) return { codeforces: 'https://codeforces.com/problemset', leetcode: 'https://leetcode.com/problemset/', hackerrank: 'https://www.hackerrank.com/domains/algorithms' }[provider];
    if (provider === 'codeforces') {
        const match = /^(\d+)-([A-Za-z]\d*)$/.exec(id);
        if (!match) throw new Error('Invalid Codeforces problem ID.');
        return `https://codeforces.com/problemset/problem/${match[1]}/${match[2]}?locale=en`;
    }
    return provider === 'leetcode' ? `https://leetcode.com/problems/${id}/` : `https://www.hackerrank.com/challenges/${id}/problem`;
}
async function graphql(query, variables) {
    const value = await request('https://leetcode.com/graphql/', { query, variables });
    if (value.errors?.length || !value.data) throw new Error('LeetCode could not load this request. Open the website or try again later.');
    return value.data;
}
async function codeforces() {
    return memo('codeforces:catalog:en', async () => {
        const value = await request('https://codeforces.com/api/problemset.problems?lang=en');
        if (value.status !== 'OK' || !Array.isArray(value.result?.problems)) throw new Error(value.comment || 'Cannot read the Codeforces catalog.');
        const items=value.result.problems.filter(p => Number.isInteger(p.contestId) && /^[A-Za-z]\d*$/.test(p.index)).map(p => ({
            provider: 'codeforces', id: `${p.contestId}-${p.index}`, contestId: p.contestId, index: p.index, number: `${p.contestId}${p.index}`,
            title: p.name, difficulty: String(p.rating || 'Unrated'), rating: p.rating || 0, tags: p.tags || [], paid: false
        }));
        return require('./codeforces-titles')(items);
    });
}
async function list(options = {}) {
    const provider = options.provider;
    validate(provider);
    const search = String(options.search || '').trim().slice(0, 120);
    const difficulty = String(options.difficulty || '').slice(0, 20);
    const page = Math.min(5000, Math.max(0, Number(options.page) || 0)) | 0;
    if(provider==='28tech'){
        const imported=require('./local-practice').list();
        const existing=require('./tech-library').list().items.filter(i=>i.ext==='pdf'&&/contest|exercise|bài tập/i.test(i.path)).map(i=>({provider,id:i.id,title:require('../../shared/learning-title')(i.name),number:'',difficulty:i.root,tags:[i.group.split('/').slice(-1)[0]],paid:false}));
        const items=[...imported,...existing].filter(i=>!search||i.id===search||`${i.title} ${i.difficulty} ${i.tags.join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
        const grouped=new Map();
        for(const item of items){const name=item.groupTitle||item.difficulty+' · '+item.tags[0];if(!grouped.has(name))grouped.set(name,{id:name,name,items:[]});item.contestId=name;grouped.get(name).items.push(item);}
        const groups=[...grouped.values()],shown=groups.slice(page*10,(page+1)*10);
        return{items:shown.flatMap(g=>g.items),groups:shown,total:groups.length,problemTotal:items.length,page,pageSize:10,individualCount:imported.length,reviewProgress:require('./local-practice').progress(),view:'groups'};
    }
    if (provider === 'codeforces') {
        let items = await codeforces();
        let contests = [];
        if (options.view === 'contests') {
            contests = await memo('codeforces:contests', async()=>{
                const value=await request('https://codeforces.com/api/contest.list?gym=false&lang=en');
                if(value.status!=='OK'||!Array.isArray(value.result))throw Error(value.comment||'Cannot load contests.');
                return value.result;
            });
        }
        const contestNames = new Map(contests.map(c=>[c.id,c.name]));
        const words = search.toLowerCase().split(/\s+/).filter(Boolean);
        const exactID = /^(\d+)[\s/-]?([a-z]\d*)$/i.exec(search);
        items = exactID ? items.filter(p => p.id.toLowerCase() === `${exactID[1]}-${exactID[2]}`.toLowerCase())
            : items.filter(p => words.every(word => `${p.number} ${p.title} ${p.tags.join(' ')} ${contestNames.get(p.contestId)||''}`.toLowerCase().includes(word)));
        if (difficulty) items = items.filter(p => difficulty === 'easy' ? p.rating > 0 && p.rating <= 1200 : difficulty === 'medium' ? p.rating > 1200 && p.rating <= 2000 : p.rating > 2000);
        if(options.view === 'contests'){
            const grouped=new Map();
            for(const problem of items){if(!grouped.has(problem.contestId))grouped.set(problem.contestId,{id:problem.contestId,name:contestNames.get(problem.contestId)||`Codeforces ${problem.contestId}`,items:[]});grouped.get(problem.contestId).items.push(problem);}
            const groups=[...grouped.values()].sort((a,b)=>b.id-a.id);
            for(const group of groups)group.items.sort((a,b)=>a.index.localeCompare(b.index,'en',{numeric:true}));
            const shown=groups.slice(page*10,(page+1)*10);
            return {items:shown.flatMap(g=>g.items),groups:shown,total:groups.length,problemTotal:items.length,page,pageSize:10,view:'contests'};
        }
        return { items: items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), total: items.length, page, pageSize: PAGE_SIZE };
    }
    if (provider === 'leetcode') {
        const filters = { ...(search ? { searchKeywords: search } : {}), ...(difficulty ? { difficulty: difficulty.toUpperCase() } : {}) };
        return memo('leetcode:' + JSON.stringify({ search, difficulty, page }), async () => {
            const data = await graphql(`query samekoList($skip:Int,$limit:Int,$filters:QuestionListFilterInput){questionList(categorySlug:"",skip:$skip,limit:$limit,filters:$filters){totalNum data{title titleSlug difficulty isPaidOnly questionFrontendId topicTags{name}}}}`, { skip: page * PAGE_SIZE, limit: PAGE_SIZE, filters });
            if (!Array.isArray(data.questionList?.data)) throw new Error('LeetCode returned an unrecognized catalog.');
            return { items: data.questionList.data.map(p => ({ provider, id: p.titleSlug, number: p.questionFrontendId, title: p.title, difficulty: p.difficulty, paid: !!p.isPaidOnly, tags: (p.topicTags || []).map(t => t.name) })), total: data.questionList.totalNum, page, pageSize: PAGE_SIZE };
        });
    }
    const track = ['algorithms', 'data-structures', 'mathematics', 'python', 'java', 'cpp'].includes(options.track) ? options.track : 'algorithms';
    const catalog = await memo('hackerrank:catalog:' + track, async () => {
        const fetchPage = offset => request(`https://www.hackerrank.com/rest/contests/master/tracks/${track}/challenges?offset=${offset}&limit=50`);
        const first = await fetchPage(0);
        if (!Array.isArray(first.models)) throw new Error('HackerRank returned an unrecognized catalog.');
        const models = [...first.models];
        const sourceTotal = Number(first.total) || models.length;
        // The endpoint ignores text search. Index the selected category locally;
        // limit concurrency and reuse this catalog for pagination and filtering.
        const offsets = [];
        for (let offset = 50; offset < Math.min(sourceTotal, 1500); offset += 50) offsets.push(offset);
        for (let i = 0; i < offsets.length; i += 3) {
            const values = await Promise.all(offsets.slice(i, i + 3).map(fetchPage));
            for (const value of values) {
                if (!Array.isArray(value.models)) throw new Error('HackerRank returned an unrecognized catalog.');
                models.push(...value.models);
            }
        }
        return { sourceTotal, items: [...new Map(models.map(p => [p.slug, p])).values()].map(p => ({ provider, id: p.slug, number: '', title: p.name, difficulty: p.difficulty_name || p.difficulty || '', tags: p.track?.name ? [p.track.name] : [], paid: !!p.require_unlock })) };
    });
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const items = catalog.items.filter(p => words.every(word => `${p.id} ${p.title} ${p.tags.join(' ')}`.toLowerCase().includes(word)))
        .filter(p => !difficulty || (difficulty === 'hard' ? /hard|advanced|expert/i.test(p.difficulty) : p.difficulty.toLowerCase() === difficulty));
    return { items: items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), total: items.length, page, pageSize: PAGE_SIZE, truncated: catalog.items.length < catalog.sourceTotal };
}
async function detail(provider, id, language='vi') {
    if (!id) throw new Error('Select a problem first.');
    if(provider==='28tech'){validate(provider,id);if(id.startsWith('local-')){if(language==='en')await require('./book-study').ensureProblem({id});const item=require('./local-practice').detail(id,language);if(!item)throw Error('Không tìm thấy bài tập đã nhập.');return item;}return require('./tech-library').problem(id);}
    const url = officialURL(provider, id);
    try {
        const {app}=require('electron'),fs=require('fs'),path=require('path');
        const saved=JSON.parse(fs.readFileSync(require('../../shared/content-library').file('translated-articles/'+provider+'/'+id+'.json',path.join(app.getPath('userData'),'translated-articles',provider,id+'.json')),'utf8'));
        const source=typeof saved.original==='string'?saved.original:saved.detail?.html;
        const fingerprint=typeof source==='string'?require('crypto').createHash('sha256').update(source).digest('hex'):'';
        const matchesSource=(!saved.sourceHash||saved.sourceHash===fingerprint)&&(!saved.translatedFromHash||saved.translatedFromHash===fingerprint);
        const russianSource=provider==='codeforces'&&/[\u0400-\u04ff]{3}/.test(source||'');
        if(saved.detail?.id===id&&saved.detail?.provider===provider&&typeof saved.translated==='string'&&matchesSource&&!russianSource){
            // Saved articles contain inner HTML; CF rendering extracts this container.
            const html=provider==='codeforces'&&!/class\s*=\s*["'][^"']*\bproblem-statement\b/i.test(source)
                ? '<div class="problem-statement">'+source+'</div>' : source;
            const detail={...saved.detail,html,url,englishGenerated:!!saved.englishGenerated,savedOriginal:source,savedVietnamese:saved.translated};
            if(provider==='codeforces'){const meta=cache.get('codeforces:catalog:en')?.value?.find(p=>p.id===id);if(meta)detail.title=meta.title;}
            return detail;
        }
    } catch (_) {}
    return memo('detail:' + provider + ':' + id, async () => {
        if (provider === 'codeforces') {
            const item = (await codeforces()).find(p => p.id === id);
            if (!item) throw new Error('This Codeforces problem is not in the public catalog.');
            let html = '',sourceError='';
            try { html = await require('./codeforces-statement').loadStatement(url); } catch (error) {sourceError=String(error.message||'').slice(0,240);}
            if (!html) {
                try {
                    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(12000) });
                    if (response.ok) {
                        const bytes=Buffer.from(await response.arrayBuffer());
                        if(bytes.length>15000000)throw Error('Statement source is too large');
                        if(bytes.subarray(0,5).toString()==='%PDF-')html=await require('./codeforces-pdf')(bytes);
                        else {const raw=bytes.toString('utf8');if(raw.length<3000000&&raw.includes('problem-statement'))html=raw;else if(!sourceError)sourceError='Codeforces returned a page without statement content';}
                        if(html){const fs=require('fs'),path=require('path'),{app}=require('electron');const file=path.join(app.getPath('userData'),'codeforces-statements/en',id+'.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html,'utf8');}
                    }
                    else if(!sourceError)sourceError='Codeforces source returned HTTP '+response.status;
                } catch (_) {if(!sourceError)sourceError='Could not connect to Codeforces statement source';}
            }
            const pdfSource=html.includes('data-pdf-statement');
            const note=pdfSource?'Đề gốc PDF giữ nguyên hình và bố cục. Văn bản trích xuất dùng để dịch; test trong bảng PDF chưa được nhập tự động.':html?'Public samples load automatically. Run All Tests reports each sample result.':sourceError||'Codeforces statement content is unavailable';
            return { ...item, url, html, sourceError:html?'':sourceError||'Codeforces statement content is unavailable', snippets: {}, note, mode: 'stdin' };
        }
        if (provider === 'leetcode') {
            const data = await graphql(`query samekoQuestion($slug:String!){question(titleSlug:$slug){title titleSlug questionFrontendId difficulty isPaidOnly content metaData exampleTestcaseList codeSnippets{langSlug code}}}`, { slug: id });
            const p = data.question;
            if (!p) throw new Error('LeetCode problem not found.');
            return { provider, id, url, title: p.title, number: p.questionFrontendId, difficulty: p.difficulty, paid: !!p.isPaidOnly,
                html: p.content || '', metadata: JSON.parse(p.metaData || '{}'), examples: p.exampleTestcaseList || [], snippets: Object.fromEntries((p.codeSnippets || []).map(s => [s.langSlug, s.code])), mode: 'function',
                note: 'Sample tests load automatically. C++ and Python function solutions can run locally for scalar/array arguments; submit on LeetCode for full judging. Tree/list/design problems and other languages are not supported by the local function runner yet.' };
        }
        const value = await request(`https://www.hackerrank.com/rest/contests/master/challenges/${id}`);
        const p = value.model;
        if (!p) throw new Error('HackerRank challenge not found.');
        const snippets = {};
        for (const [ext, keys] of Object.entries({ cpp: ['cpp14', 'cpp'], c: ['c'], py: ['python3', 'python'], java: ['java8', 'java'], cs: ['csharp'] })) {
            const key = keys.find(k => typeof p[k + '_template'] === 'string');
            if (key) snippets[ext] = [p[key + '_template_head'], p[key + '_template'], p[key + '_template_tail']].filter(Boolean).join('\n');
        }
        return { provider, id, url, title: p.name, difficulty: p.difficulty_name, html: p.body_html || '', snippets, mode: 'stdin', note: 'Starter code comes from HackerRank. Complete the solution, then run sample tests locally or submit on the website.' };
    });
}
module.exports = { list, detail, officialURL };
