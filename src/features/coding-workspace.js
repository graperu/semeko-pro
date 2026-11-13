'use strict';
// The dock follows the focused source tab; requests never write into another problem.
window.CodingWorkspace=(()=>{
    let row,dock,content,title,language,tabDialog,query,tabList,view='statement',opened=false,currentKey='',revision=0;
    const details=new Map(),jobs=new Map(),closed=[];
    let clockTab=null,clockStart=0,width=380,lastOwner;
    const $=id=>document.getElementById(id),tr=s=>window.UILanguage?UILanguage.translate(s):s;
    const active=()=>App.tabs.find(t=>t.id===getPreferredTabId());
    const canonical=value=>{try{const u=new URL(value);const cf=u.pathname.match(/\/(?:problemset\/problem\/(\d+)\/([A-Za-z]\d*)|contest\/(\d+)\/problem\/([A-Za-z]\d*))/);return u.hostname==='codeforces.com'&&cf?'cf:'+Number(cf[1]||cf[3])+':'+(cf[2]||cf[4]).toUpperCase():u.origin+u.pathname.replace(/\/description\/?$/,'').replace(/\/$/,'');}catch{return String(value||'');}};
    function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
    function button(text,fn){const b=node('button',text,'action-btn');b.type='button';b.onclick=()=>Promise.resolve().then(fn).catch(e=>showToast(e.message,'error'));return b;}
    async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tải đề quá thời gian chờ. Hãy thử tải lại.')),20000);})]);}finally{clearTimeout(timer);}}
    function key(problem){return canonical(problem?.url)||problem?.sourcePlatform+':'+problem?.problemId;}
    function tick(){
        const now=performance.now();if(clockTab&&clockStart)clockTab.practiceTimeMs=(Number(clockTab.practiceTimeMs)||0)+Math.max(0,now-clockStart);
        clockTab=document.visibilityState==='visible'&&document.hasFocus()?active():null;clockStart=clockTab?now:0;
    }
    function practiceMs(tab){return Math.round((Number(tab?.practiceTimeMs)||0)+(tab===clockTab&&clockStart?Math.max(0,performance.now()-clockStart):0));}
    function cache(problem,detail){if(problem&&detail)details.set(key(problem),detail.adapted?{html:detail.language==='en'?detail.html:'',vi:detail.language==='en'?'':detail.html,provider:detail.provider,native:true}:{html:detail.html||'',vi:detail.savedVietnamese||'',provider:detail.provider||problem.sourcePlatform});}
    function open(next='statement'){view=next;opened=true;row?.classList.add('dock-open');document.querySelector('.app-container')?.classList.add('has-code-dock');sync(true);}
    function close(){opened=false;row.classList.remove('dock-open');document.querySelector('.app-container').classList.remove('has-code-dock');$('coding-dock-toggle').textContent='Đề bài';$('coding-dock-toggle').focus();App.editor?.layout();App.editor2?.layout();}
    function sync(force=false){
        if(!row)return;tick();const tab=active(),problem=tab?.testState?.problem;
        const next=(tab?.id||'')+'|'+(problem?key(problem):'');
        title.textContent=problem?.name||tab?.name||tr('No file open');title.dataset.i18nPreserve='';
        $('coding-toolbar').hidden=!tab;
        $('coding-dock-toggle').textContent=opened?'Ẩn bảng':'Đề bài';
        if(!tab){opened=false;row.classList.remove('dock-open');document.querySelector('.app-container').classList.remove('has-code-dock');}
        if(next!==currentKey||force){currentKey=next;revision++;if(opened)render();}
        if(tabDialog?.open)renderTabSearch();
    }
    async function source(problem){
        const id=key(problem);if(details.has(id))return details.get(id);
        if(problem.statementHtml){const native=problem.sourcePlatform==='28tech'&&problem.verifiedTests===true;const value=native?{html:problem.statementLanguage==='en'?problem.statementHtml:'',vi:problem.statementVi||(problem.statementLanguage==='en'?'':problem.statementHtml),provider:problem.sourcePlatform,native:true}:{html:problem.statementHtml,vi:problem.statementVi||'',provider:problem.sourcePlatform};details.set(id,value);return value;}
        const provider=problem.sourcePlatform||(/codeforces/.test(problem.url||'')?'codeforces':/leetcode/.test(problem.url||'')?'leetcode':null);
        let problemId=problem.problemId;
        if(!problemId&&provider==='leetcode')problemId=problem.url.match(/\/problems\/([^/]+)/)?.[1];
        if(!problemId&&provider==='codeforces'){const m=canonical(problem.url).match(/^cf:(\d+):(.+)$/);if(m)problemId=m[1]+'-'+m[2];}
        if(!provider||!problemId)throw Error('Chưa có nội dung đề. Mở bài từ Luyện tập để tải đề.');
        const pending=(async()=>{const r=await electronAPI.ojProblemDetail({provider,id:problemId});if(!r.ok)throw Error(r.error);if(!r.data.html)throw Error(r.data.sourceError||'Chưa tải được đề bài.');return r.data.adapted?{html:'',vi:r.data.html,provider,native:true}:{html:r.data.html,vi:r.data.savedVietnamese||'',provider};})();
        details.set(id,pending);try{const value=await pending;details.set(id,value);return value;}catch(e){details.delete(id);throw e;}
    }
    async function renderStatement(){
        const problem=active()?.testState?.problem,stamp=revision;
        content.replaceChildren(node('p',tr('Loading statement…')));content.setAttribute('aria-busy','true');
        if(!problem){content.replaceChildren(node('p','Mở một bài trong Luyện tập để đọc đề cạnh code.'));content.setAttribute('aria-busy','false');return;}
        try{
            const value=await bounded(source(problem));if(stamp!==revision||view!=='statement')return;
            const preferred=value.vi?'vi':'en';language.value=problem.statementLanguage||preferred;
            let raw=language.value==='vi'?value.vi:value.html;
            if(value.native&&!raw){const result=await bounded(electronAPI.ojProblemDetail({provider:'28tech',id:problem.problemId,language:language.value}));if(stamp!==revision||view!=='statement')return;if(!result.ok)throw Error(result.error);raw=result.data.html;if(language.value==='vi')value.vi=raw;else value.html=raw;problem.statementHtml=value.html||value.vi;problem.statementVi=value.vi;scheduleSessionSave();}
            if(!raw){content.replaceChildren(node('p','Bài này chưa có bản tiếng Việt.'),button('Dịch sang tiếng Việt',()=>translate(problem,value)));return;}
            const wrapper=value.provider==='codeforces'&&!/class=["']problem-statement/.test(raw)?'<div class="problem-statement">'+raw+'</div>':raw;
            const html=await bounded(ProblemBrowser.safeStatement(wrapper,value.provider));
            if(stamp!==revision||view!=='statement')return;
            const article=node('article',null,'oj-statement');article.dataset.i18nPreserve='';article.innerHTML=html;article.onclick=e=>{if(e.target.closest('a'))e.preventDefault();};content.replaceChildren(article);
            if(value.native){content.prepend(button(language.value==='en'?'Hints & test coverage':'Gợi ý & bộ test',()=>ProblemBrowser.openLibrary(problem.problemId,problem.statementLanguage||'vi')));if(problem.courseId&&problem.sourcePage)content.append(button(language.value==='en'?'Original book page':'Trang sách gốc',()=>BookCourses.openAt(problem.courseId,problem.sourcePage)));}
            if(!value.vi&&!value.native)content.append(button('Dịch sang tiếng Việt',()=>translate(problem,value)));
        }catch(e){if(stamp===revision)content.replaceChildren(node('p',e.message),button('Thử tải lại',()=>{details.delete(key(problem));revision++;renderStatement();}));}
        finally{if(stamp===revision)content.setAttribute('aria-busy','false');}
    }
    async function translate(problem,value){
        const stamp=revision;content.replaceChildren(node('p','Đang dịch đề bài…'));content.setAttribute('aria-busy','true');
        try{
            const wrapper=value.provider==='codeforces'&&!/class=["']problem-statement/.test(value.html)?'<div class="problem-statement">'+value.html+'</div>':value.html;
            const safe=await ProblemBrowser.safeStatement(wrapper,value.provider);
            value.vi=await StatementTranslation.translateArticle(safe);details.set(key(problem),value);
            problem.statementHtml=value.html;problem.statementVi=value.vi;problem.statementLanguage='vi';
            for(const tab of App.tabs.filter(t=>t.testState?.problem===problem))await persistProblemForTab(tab);
            scheduleSessionSave();if(stamp===revision&&view==='statement'){language.value='vi';await renderStatement();}
        }catch(e){if(stamp===revision){content.replaceChildren(node('p',e.message),button('Thử dịch lại',()=>translate(problem,value)));content.setAttribute('aria-busy','false');}}
    }
    function renderTests(){
        const tab=active(),problem=tab?.testState?.problem;content.replaceChildren();
        if(!problem?.tests?.length){content.append(node('p','Chưa có test mẫu cho bài đang mở.'));return;}
        const results=getPreferredTabId()===tab.id?batchTestResults:tab.testState.results||[];
        problem.tests.forEach((test,i)=>{
            const result=results.find(r=>r.testIndex===i),item=node('details',null,'coding-case');item.dataset.testIndex=i;item.open=i===ccTestIndex;
            const summary=node('summary','Test '+(i+1)+' · '+(result?.status||'Chưa chạy'));item.dataset.state=result?.status==='AC'?'success':result?.status?'failure':'pending';
            item.append(summary);for(const [label,text]of [['Đầu vào',test.input],['Kết quả mong đợi',test.output],['Kết quả của bạn',result?.actualOutput??result?.output]])if(text!==undefined){item.append(node('h4',label));const pre=node('pre',String(text));pre.dataset.i18nPreserve='';item.append(pre);}
            if(result?.error||result?.details){const pre=node('pre',typeof(result.error||result.details)==='string'?(result.error||result.details):JSON.stringify(result.details));pre.dataset.i18nPreserve='';item.append(pre);}
            item.append(button('Chọn test này',()=>{switchTestCase(i);saveTestStateToTab(tab);renderTests();}));content.append(item);
        });
    }
    function submission(job){
        if(job?.problemURL){const id=canonical(job.problemURL),old=jobs.get(id);if(!old?.createdAt||!job.createdAt||job.createdAt>=old.createdAt)jobs.set(id,job);if(jobs.size>100)jobs.delete(jobs.keys().next().value);}
        if(opened&&view==='submission')renderSubmission();
    }
    function accountChanged(){const owner=String(window.SemekoAccounts?.current()?.github?.id||'');if(owner!==lastOwner){lastOwner=owner;jobs.clear();if(opened&&view==='submission')renderSubmission();}}
    function renderSubmission(){
        content.replaceChildren();const tab=active(),url=tab?.testState?.problem?.url||window.SemekoAccounts?.problemURL(tab,tab?tabSourceText(tab):'');
        const history=window.SemekoAccounts?.current()?.official?.history||[],owner=window.SemekoAccounts?.current()?.github?.id;
        const cached=jobs.get(canonical(url)),job=(String(cached?.owner)===String(owner)?cached:null)||history.find(j=>canonical(j.problemURL)===canonical(url)&&String(j.owner)===String(owner));
        dock.dataset.ticket=job?.ticket||'';
        if(!job||String(job.owner)!==String(owner)){content.append(node('p','Chưa có bài nộp cho đề đang mở.'));return;}
        const phases={preparing:'Chuẩn bị nộp',submitting:'Đang gửi',judging:'Đang chấm',pending:'Đang chờ kết quả',unknown:'Chưa rõ kết quả gửi — không tự nộp lại',error:'Có lỗi khi nộp bài',stopped:'Đã ngừng theo dõi'};
        const state=job.phase==='finished'?(job.accepted?'success':'failure'):job.phase==='error'?'failure':'pending';dock.dataset.submissionState=state;
        const verdict=node('strong',job.phase==='error'&&!job.submissionId?'Chưa gửi bài — kiểm tra kết nối':job.phase==='finished'?job.verdict:phases[job.phase]||job.phase,'coding-verdict');verdict.setAttribute('role','status');verdict.setAttribute('aria-live','polite');content.append(verdict,node('p',job.provider+' · '+job.handle+(job.submissionId?' · #'+job.submissionId:'')));
        const steps=node('ol',null,'coding-submit-steps');for(const [phase,label]of [['submitting','Đang gửi'],['judging','Đang chấm'],['finished','Kết quả']]){const li=node('li',label);li.classList.toggle('current',job.phase===phase);steps.append(li);}content.append(steps);
        content.append(node('p',job.phase==='error'&&!job.submissionId?'Chưa có bài nộp trên nền tảng':job.passed!=null?'Đạt '+job.passed+(job.total!=null?' / '+job.total:' (chưa có tổng số)')+' test':'Máy chủ chưa trả số test'));
        if(job.total>0){const progress=node('progress');progress.max=job.total;progress.value=Math.min(job.total,job.passed||0);progress.setAttribute('aria-label','Tiến độ test trên máy chủ');content.append(progress);}
        if(job.failedTest)content.append(node('p','Không đạt ở test '+job.failedTest));
        if(job.error||job.pollError)content.append(node('p',job.error||job.pollError));
        for(const [key,label]of [['input','Đầu vào máy chủ trả về'],['actual','Kết quả của bạn'],['expected','Kết quả mong đợi'],['error','Chi tiết lỗi']])if(job.detail?.[key]){content.append(node('h4',label));const pre=node('pre',job.detail[key]);pre.dataset.i18nPreserve='';content.append(pre);}
        const detail=button('Mở chi tiết bài nộp',()=>SemekoAccounts.openResults(job.ticket));detail.disabled=!job.ticket;
        content.append(node('p','Chỉ hiển thị test và thông tin mà nền tảng công bố.'),detail);
        if(job.submissionId)content.append(button('Cập nhật kết quả',async()=>{const r=await electronAPI.officialRefresh(job.ticket);if(!r.ok)throw Error(r.error);}));
    }
    function render(){
        for(const b of dock.querySelectorAll('[data-view]')){b.setAttribute('aria-selected',String(b.dataset.view===view));b.classList.toggle('active',b.dataset.view===view);}
        language.hidden=view!=='statement';content.setAttribute('aria-busy','false');
        if(view==='statement')void renderStatement();else if(view==='tests')renderTests();else renderSubmission();
        UILanguage?.apply();
    }
    function rememberClosed(tab){
        tick();if(getPreferredTabId()===tab.id)saveTestStateToTab(tab);
        void window.PracticeLibrary?.trackTime(tab,practiceMs(tab)).catch(()=>{});
        closed.push({name:tab.name,path:tab.path,content:tabSourceText(tab),original:tab.original,modified:tab.modified,pinned:tab.pinned,practiceTimeMs:practiceMs(tab),libraryKey:tab.libraryKey,testState:tab.testState?JSON.parse(JSON.stringify(tab.testState)):null,io:App.ioByTab[tab.id]});if(closed.length>20)closed.shift();
    }
    async function reopenClosed(){
        const snapshot=closed[closed.length-1];if(!snapshot){showToast('Chưa có tab vừa đóng','info');return;}
        let disk=null;if(snapshot.path)try{disk=await electronAPI.readFile(snapshot.path);}catch{}
        const existing=snapshot.path&&App.tabs.find(t=>t.path&&pathKey(t.path)===pathKey(snapshot.path));
        if(existing&&tabSourceText(existing)===snapshot.content){closed.pop();setActive(existing.id);return;}
        const copy=!!existing||(snapshot.path&&(disk===null||(snapshot.modified&&disk!==snapshot.original)));
        const tab={...snapshot,id:createRestoredTabId(),path:copy?null:snapshot.path,untitledHistoryKey:createUntitledHistoryKey()};
        if(snapshot.path&&!snapshot.modified&&disk!==null&&!copy){tab.content=disk;tab.original=disk;tab.modified=false;}
        if(copy){tab.modified=true;tab.name=snapshot.name.replace(/(\.[^.]+)?$/,' (recovered)$1');}
        delete tab.io;closed.pop();App.tabs.push(tab);App.tabs.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));if(snapshot.io)App.ioByTab[tab.id]={...snapshot.io};if(tab.path)startFileWatch(tab.path);setActive(tab.id);updateUI();scheduleSessionSave();
    }
    function pin(tab){tab.pinned=!tab.pinned;App.tabs.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));renderTabs();scheduleSessionSave();}
    function renderTabSearch(){
        tabList.replaceChildren();const needle=query.value.toLocaleLowerCase(),tabs=App.tabs.filter(t=>[t.name,t.path,t.testState?.problem?.name].join(' ').toLocaleLowerCase().includes(needle));
        for(const tab of tabs){const b=button((tab.pinned?'Ghim · ':'')+tab.name+(tab.modified?' ●':''),()=>{tabDialog.close();setActive(tab.id);});b.dataset.tabId=tab.id;b.dataset.i18nPreserve='';b.title=tab.path||tab.name;const path=node('small',tab.path||tab.testState?.problem?.name||'');path.dataset.i18nPreserve='';b.append(path);tabList.append(b);}if(!tabs.length)tabList.append(node('p','Không tìm thấy tab.'));
    }
    function searchTabs(){renderTabSearch();if(!tabDialog.open)tabDialog.showModal();query.focus();query.select();}
    function explain(message){
        const rules=[[/expected.*[;]|';'.*expected|CS1002/i,'Thiếu dấu chấm phẩy (;). Kiểm tra cuối dòng và cả dòng ngay phía trên.'],[/not declared|cannot find symbol|CS0103|NameError/i,'Tên biến hoặc hàm chưa được khai báo, sai chính tả hoặc nằm ngoài phạm vi sử dụng.'],[/does not name a type|unknown type|CS0246/i,'Không nhận ra kiểu dữ liệu. Kiểm tra tên kiểu, thư viện include/import và namespace.'],[/IndentationError|TabError/i,'Thụt lề không nhất quán. Dùng cùng số dấu cách cho các câu lệnh trong một khối.'],[/SyntaxError|invalid syntax/i,'Cú pháp chưa hợp lệ. Kiểm tra dấu ngoặc, dấu hai chấm và dòng ngay trước vị trí báo lỗi.'],[/incompatible types|cannot convert|CS0029/i,'Kiểu dữ liệu không khớp. Kiểm tra kiểu biến, giá trị gán và kiểu trả về của hàm.'],[/undefined reference|unresolved external|CS5001/i,'Không tìm thấy phần định nghĩa hàm hoặc điểm bắt đầu chương trình. Kiểm tra hàm main và các tệp được biên dịch.'],[/no matching function|CS150[123]/i,'Lời gọi hàm không khớp khai báo. Kiểm tra số lượng, thứ tự và kiểu các tham số.'],[/IndexError|out of range|out of bounds/i,'Truy cập chỉ số ngoài phạm vi. Kiểm tra độ dài mảng/chuỗi và giới hạn vòng lặp.'],[/ZeroDivisionError|division by zero/i,'Đang chia cho 0. Kiểm tra mẫu số trước phép chia.'],[/expected.*[})]|reached end|CS1513/i,'Có thể thiếu dấu ngoặc đóng. Kiểm tra các cặp ngoặc và khối lệnh trước dòng báo lỗi.']];
        return rules.find(([pattern])=>pattern.test(message))?.[1]||'Đây là thông báo của trình biên dịch hoặc bộ chạy. Kiểm tra tệp và dòng được chỉ ra; giữ nguyên thông báo gốc để đối chiếu.';
    }
    function init(){
        const section=$('editor-section'),editors=$('editors-container');row=node('div',null,'coding-row');section.insertBefore(row,editors);row.append(editors);
        const toolbar=node('div',null,'coding-toolbar');toolbar.id='coding-toolbar';title=node('strong');toolbar.append(title);const toggle=button('Đề bài',()=>opened?close():open('statement'));toggle.id='coding-dock-toggle';toolbar.append(toggle,button('Test mẫu',()=>open('tests')),button('Kết quả nộp',()=>open('submission')));section.prepend(toolbar);
        const separator=node('div',null,'coding-divider');separator.setAttribute('role','separator');separator.tabIndex=0;separator.setAttribute('aria-label','Điều chỉnh bảng đề bài');separator.setAttribute('aria-orientation','vertical');row.append(separator);
        dock=node('aside',null,'coding-dock');dock.id='coding-dock';dock.setAttribute('aria-label','Đề bài và kết quả');const head=node('header');for(const [id,label]of [['statement','Đề bài'],['tests','Test mẫu'],['submission','Bài nộp']]){const b=button(label,()=>{view=id;revision++;render();});b.dataset.view=id;b.setAttribute('role','tab');head.append(b);}const x=button('×',close);x.setAttribute('aria-label','Đóng bảng đề bài');head.append(x);language=node('select');language.setAttribute('aria-label','Ngôn ngữ đề cạnh code');for(const [value,label]of [['en','English'],['vi','Tiếng Việt']]){const o=node('option',label);o.value=value;language.append(o);}language.onchange=()=>{const problem=active()?.testState?.problem;if(problem){problem.statementLanguage=language.value;revision++;renderStatement();scheduleSessionSave();}};content=node('div',null,'coding-dock-content');dock.append(head,language,content);row.append(dock);
        function size(value){width=Math.max(260,Math.min(value,900));const actual=Math.max(260,Math.min(width,row.clientWidth-280));row.style.setProperty('--coding-dock-width',actual+'px');separator.setAttribute('aria-valuenow',String(actual));separator.setAttribute('aria-valuemin','260');separator.setAttribute('aria-valuemax',String(Math.max(260,row.clientWidth-280)));App.editor?.layout();App.editor2?.layout();}
        separator.onpointerdown=e=>{if(row.classList.contains('stacked'))return;e.preventDefault();separator.setPointerCapture(e.pointerId);};separator.onpointermove=e=>{if(separator.hasPointerCapture(e.pointerId))size(row.getBoundingClientRect().right-e.clientX);};separator.onpointerup=e=>{if(separator.hasPointerCapture(e.pointerId)){separator.releasePointerCapture(e.pointerId);electronAPI.stateWrite('coding-workspace',{width}).catch(()=>{});}};separator.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();size(e.key==='Home'?380:width+(e.key==='ArrowLeft'?20:-20));electronAPI.stateWrite('coding-workspace',{width}).catch(()=>{});}};
        new ResizeObserver(()=>{const stacked=row.clientWidth<660;row.classList.toggle('stacked',stacked);separator.tabIndex=stacked?-1:0;separator.setAttribute('aria-orientation',stacked?'horizontal':'vertical');separator.setAttribute('aria-disabled',String(stacked));if(!stacked)size(width);App.editor?.layout();}).observe(row);
        electronAPI.stateRead('coding-workspace').then(s=>{if(Number.isFinite(s?.width))size(s.width);}).catch(()=>{});
        tabDialog=node('dialog',null,'practice-library coding-tab-search');tabDialog.id='coding-tab-search';const heading=node('header');heading.append(node('h2','Find tab'),button('Đóng',()=>tabDialog.close()));query=node('input');query.type='search';query.placeholder='Tên tệp, đường dẫn hoặc tên bài';query.setAttribute('aria-label','Tìm tab đang mở');query.oninput=renderTabSearch;tabList=node('div',null,'coding-tab-list');tabDialog.append(heading,query,tabList);document.body.append(tabDialog);
        query.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();tabList.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();tabList.querySelector('button')?.click();}};tabList.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const buttons=[...tabList.querySelectorAll('button')],at=buttons.indexOf(document.activeElement);buttons[(at+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();};
        const find=button('',searchTabs);find.innerHTML='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';find.id='btn-find-tab';find.className='tab-add';find.title='Find tab (Ctrl+P)';find.setAttribute('aria-label','Find tab (Ctrl+P)');$('btn-new-tab').after(find);
        document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||document.querySelector('dialog[open]')||document.querySelector('#settings-overlay.show,#confirm-dialog.active'))return;const p=e.key.toLowerCase();if(p==='p'&&!e.shiftKey&&!currentShortcutMap.has('Ctrl+P')){e.preventDefault();e.stopImmediatePropagation();searchTabs();}if(p==='t'&&e.shiftKey&&!currentShortcutMap.has('Ctrl+Shift+T')){e.preventDefault();e.stopImmediatePropagation();void reopenClosed().catch(e=>showToast(e.message,'error'));}},true);
        document.addEventListener('visibilitychange',tick);window.addEventListener('focus',tick);window.addEventListener('blur',()=>{tick();clockTab=null;clockStart=0;});
        setInterval(()=>{tick();const tab=active();if(tab)void window.PracticeLibrary?.trackTime(tab,practiceMs(tab)).catch(()=>{});},15000);
        sync();
    }
    document.addEventListener('DOMContentLoaded',init);
    return{sync,open,close,cache,submission,accountChanged,testsChanged:()=>{if(opened&&view==='tests')renderTests();},practiceMs,rememberClosed,reopenClosed,pin,searchTabs,explain};
})();
