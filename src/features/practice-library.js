'use strict';
window.PracticeLibrary = (() => {
    const statuses = { working:'In Progress', practiced:'Practiced', review:'Review', solved:'Solved locally' };
    const noteDrafts=new Map();
    let entries=[],ready,queue=Promise.resolve(),dialog,list,search,filter,platformFilter,topicFilter,closingFolder=false;
    const tr = text => window.UILanguage ? UILanguage.translate(text) : text;
    function key(tab,problem) { return tab?.libraryKey || (problem?.url ? problem.url+'#'+fileExtension(tab.name) : tab?.path) || (tab.libraryKey=crypto.randomUUID()); }
    function persist(next,refresh=true) {
        const task=queue.then(async()=>{const updated=typeof next==='function'?next(entries):next;const result=await electronAPI.stateWrite('practice-library',{version:1,entries:updated});if(result?.success===false)throw Error(result.error||'Could not save practice archive');entries=updated;if(refresh)render();});
        queue=task.catch(()=>{});return task;
    }
    async function save(tab,problem,status,results=[]) {
        await ready;if(!tab)throw Error('No file selected');
        const id=key(tab,problem),old=entries.find(e=>e.id===id);
        const text=tabSourceText(tab),now=new Date().toISOString();
        const entry={id,name:problem?.name||tab.name,extension:fileExtension(tab.name),path:tab.path||null,code:text,
            problem:problem?JSON.parse(JSON.stringify(problem)):null,status:status||old?.status||'working',
            created:old?.created||now,updated:now,runs:old?.runs||0,onlineAccepted:old?.onlineAccepted||null,
            results:results.length?results.map(r=>({testIndex:r.testIndex,status:r.status,executionTime:r.executionTime})):old?.results||[]};
        if(results.length)entry.runs++;
        // Re-read after pending writes: concurrent saves must not drop other entries.
        await queue;
        await persist(current=>{const latest=current.find(e=>e.id===id);return[{...entry,status:status||latest?.status||entry.status,runs:(latest?.runs||0)+(results.length?1:0),results:results.length?entry.results:latest?.results||[],onlineAccepted:latest?.onlineAccepted||null,notes:latest?.notes||'',tags:latest?.tags||problem?.tags||[],practiceTimeMs:Math.max(latest?.practiceTimeMs||0,window.CodingWorkspace?.practiceMs(tab)||tab.practiceTimeMs||0)},...current.filter(e=>e.id!==id)];});
        return entry;
    }
    async function record(tab,problem,results) {
        if(!tab||!problem||!results.length||results.length!==(problem.tests?.length||0))return;
        await window.Learning?.record(tab,problem,results);
        await save(tab,problem,results.every(r=>r.status==='AC')?'solved':'working',results);
    }
    async function archiveFolderAndClose(){
        await ready;if(closingFolder)return;
        const folder=FileExplorer.currentFolder;if(!folder)throw Error(tr('No folder open'));
        if(isBuilding||App.isRunning||isBatchTesting)throw Error(tr('Stop the running program before closing a folder.'));
        if(typeof blockedByDebugSession==='function'&&blockedByDebugSession('Close folder'))return;
        closingFolder=true;
        try{
            const prefix=pathKey(folder).replace(/\/$/,'')+'/',inside=p=>p&&pathKey(p).startsWith(prefix);
            const tabs=App.tabs.filter(t=>inside(t.path)),active=App.tabs.find(t=>t.id===getPreferredTabId()),savedText=new Map();
            if(active)saveTestStateToTab(active);
            for(const tab of tabs){const text=tabSourceText(tab);savedText.set(tab.id,text);
                if(tab.modified||text!==tab.original){const result=await electronAPI.saveFile({path:tab.path,content:text});if(!result?.success)throw Error(result?.error||'Could not save file');markTabSaved(tab,text);}
                await persistProblemForTab(tab);
            }
            const meta=FileExplorer.contestFolder&&pathKey(FileExplorer.contestFolder)===pathKey(folder)?FileExplorer.contestMeta:null;
            if(meta){FileExplorer.SessionTimer.saveToMeta(meta);const result=await electronAPI.writeSameko(folder,meta);if(!result?.success)throw Error(result?.error||'Could not save contest progress');}
            const id='folder:'+pathKey(folder),now=new Date().toISOString(),old=entries.find(e=>e.id===id),solved=meta?.problems?.filter(p=>p.status==='solved').length||0;
            const entry={kind:'folder',id,name:meta?.name||folder.split(/[/\\]/).pop(),folderPath:folder,path:null,code:'',extension:'folder',status:old?.status||(meta?.problems?.length&&solved===meta.problems.length?'solved':'working'),created:old?.created||now,updated:now,runs:0,results:[],contestMeta:meta?JSON.parse(JSON.stringify(meta)):null,workspaceExtension:WorkspaceSupport.config()?.extension,activePath:inside(active?.path)?active.path:null,openFiles:tabs.map(t=>({path:t.path,testState:t.testState?JSON.parse(JSON.stringify(t.testState)):null}))};
            await persist(current=>{const latest=current.find(e=>e.id===id);return[{...entry,notes:latest?.notes||'',tags:latest?.tags||[],practiceTimeMs:latest?.practiceTimeMs||0},...current.filter(e=>e.id!==id)];});
            if(tabs.some(t=>tabSourceText(t)!==savedText.get(t.id)))throw Error(tr('Files changed while saving. Save the folder again.'));
            if(dialog.open)dialog.close();
            for(const tab of tabs)await closeTab(tab.id,{quiet:true});
            FileExplorer.saveCategoriesForFolder(folder);FileExplorer.leaveContest();FileExplorer.currentFolder=null;FileExplorer.activeContestId=null;FileExplorer.filterText='';FileExplorer.expandedFolders.clear();FileExplorer.loadCategoriesForFolder(null);
            const input=document.getElementById('explorer-filter');if(input)input.value='';
            await FileExplorer.refreshTree();FileExplorer.saveState();scheduleSessionSave();
            showToast(tr('Folder saved to archive and closed'),'success');return entry;
        }finally{closingFolder=false;}
    }
    async function openFolderEntry(entry){
        await electronAPI.readDirectory(entry.folderPath);
        FileExplorer.saveCategoriesForFolder(FileExplorer.currentFolder);
        if(FileExplorer.contestFolder&&FileExplorer.contestMeta)await FileExplorer.saveContestMeta(FileExplorer.contestFolder,FileExplorer.contestMeta);
        FileExplorer.leaveContest();FileExplorer.currentFolder=entry.folderPath;FileExplorer.filterText='';FileExplorer.expandedFolders.clear();FileExplorer.expandedFolders.add(entry.folderPath);FileExplorer.loadCategoriesForFolder(entry.folderPath);
        if(entry.workspaceExtension)WorkspaceSupport.setFolderLanguage(entry.workspaceExtension);
        const input=document.getElementById('explorer-filter');if(input)input.value='';
        await FileExplorer.refreshTree();FileExplorer.saveState();if(!FileExplorer.isOpen)FileExplorer.open();
        for(const file of entry.openFiles||[]){if(!file.path||!pathKey(file.path).startsWith(pathKey(entry.folderPath).replace(/\/$/,'')+'/'))continue;
            await openFileFromPath(file.path);const tab=App.tabs.find(t=>t.path&&pathKey(t.path)===pathKey(file.path));if(tab&&!tab.testState&&file.testState){tab.testState=JSON.parse(JSON.stringify(file.testState));if(getPreferredTabId()===tab.id)loadTestStateFromTab(tab);}
        }
        const active=App.tabs.find(t=>t.path&&entry.activePath&&pathKey(t.path)===pathKey(entry.activePath));if(active)setActive(active.id);
        scheduleSessionSave();
    }
    function render() {
        if(!list)return;
        const drafts=new Map([...list.querySelectorAll('.practice-library-row')].filter(row=>row.querySelector('.practice-notes')?.open).map(row=>[row.dataset.entryId,{notes:row.querySelector('textarea').value,tags:row.querySelector('.practice-notes input').value}]));
        list.replaceChildren();
        const query=(search.value||'').toLocaleLowerCase();
        const provider=e=>e.problem?.sourcePlatform||(/codeforces\.com/.test(e.problem?.url||'')?'codeforces':/leetcode\.com/.test(e.problem?.url||'')?'leetcode':/hackerrank\.com/.test(e.problem?.url||'')?'hackerrank':'local');
        const selectedTopic=topicFilter.value;topicFilter.replaceChildren(new Option('Mọi chủ đề','all'));for(const tag of [...new Set(entries.flatMap(e=>e.tags||e.problem?.tags||[]))].sort())topicFilter.append(new Option(tag,tag));topicFilter.value=[...topicFilter.options].some(o=>o.value===selectedTopic)?selectedTopic:'all';
        const shown=entries.filter(e=>(filter.value==='all'||e.status===filter.value||(filter.value==='done'&&['solved','practiced'].includes(e.status))||(filter.value==='unfinished'&&['working','review'].includes(e.status)))&&(platformFilter.value==='all'||provider(e)===platformFilter.value)&&(topicFilter.value==='all'||(e.tags||e.problem?.tags||[]).includes(topicFilter.value))&&`${e.name} ${e.extension} ${e.folderPath||''} ${e.notes||''} ${(e.tags||[]).join(' ')}`.toLocaleLowerCase().includes(query));
        dialog.querySelector('[data-save-folder]').disabled=!FileExplorer.currentFolder||closingFolder;
        document.getElementById('practice-library-count').textContent=String(shown.length)+' / '+entries.length;
        if(!shown.length){const empty=document.createElement('p');empty.textContent='No archived practice yet';list.append(empty);}
        for(const entry of shown){
            const row=document.createElement('article');row.className='practice-library-row';row.dataset.entryId=entry.id;
            const info=document.createElement('div');info.className='practice-library-info';
            const name=document.createElement('strong');name.dataset.i18nPreserve='';name.textContent=entry.name;name.title=entry.name;
            const detail=document.createElement('small');detail.textContent=`${entry.extension.toUpperCase()} · ${new Date(entry.updated).toLocaleDateString(document.documentElement.lang==='vi'?'vi-VN':'en-US')} · ${entry.results.filter(r=>r.status==='AC').length}/${entry.results.length} AC`;
            if(entry.kind==='folder'){detail.textContent=tr('Folder')+' · '+(entry.contestMeta?.problems?.length||entry.openFiles?.length||0)+' '+tr('files')+' · '+entry.folderPath;detail.title=entry.folderPath;detail.className='practice-folder-path';}
            info.append(name,detail);
            if(entry.kind!=='folder'){const time=document.createElement('small');time.className='practice-topics';time.dataset.i18nPreserve='';time.textContent=provider(entry)+' · '+(entry.tags||entry.problem?.tags||[]).join(', ')+' · ';const elapsed=document.createElement('span');elapsed.dataset.practiceTime='';elapsed.textContent=Math.floor((entry.practiceTimeMs||0)/60000)+' phút luyện';time.append(elapsed);info.append(time);}
            const online=entry.onlineAccepted,account=window.SemekoAccounts?.current();
            if(online&&account?.github?.id===online.githubId&&account.links?.[online.provider]?.handle?.toLowerCase()===online.handle?.toLowerCase()){const accepted=document.createElement('small');accepted.textContent='Accepted on linked profile';accepted.title=online.handle+' · #'+online.submissionId;info.append(accepted);}
            const select=document.createElement('select');select.setAttribute('aria-label','Practice status');
            for(const [value,label]of Object.entries(statuses)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.value=entry.status;
            select.onchange=async()=>{const value=select.value;select.disabled=true;try{await persist(current=>current.map(e=>e.id===entry.id?{...e,status:value}:e));}catch(e){select.value=entry.status;showToast(e.message,'error');}finally{select.disabled=false;}};
            const open=document.createElement('button');open.textContent='Open solution';open.className='action-btn';open.onclick=()=>openEntry(entry).catch(e=>showToast(e.message,'error'));
            if(entry.kind==='folder')open.textContent='Open folder';
            const remove=document.createElement('button');remove.textContent='Remove from archive';remove.className='action-btn';remove.onclick=async()=>{
                dialog.close();
                if(!await showConfirmDialog({title:'Remove from archive',message:'Remove this saved practice? Your source files will be kept.',confirmText:'Remove',cancelText:'Cancel'}))return;
                try{await persist(current=>current.filter(e=>e.id!==entry.id));}catch(e){showToast(e.message,'error');}
            };
            const notes=document.createElement('details');notes.className='practice-notes';const summary=document.createElement('summary');summary.textContent='Ghi chú và chủ đề';const textarea=document.createElement('textarea');textarea.value=entry.notes||'';textarea.maxLength=20000;textarea.setAttribute('aria-label','Ghi chú bài luyện');const tags=document.createElement('input');tags.value=(entry.tags||entry.problem?.tags||[]).join(', ');tags.placeholder='Chủ đề, phân cách bằng dấu phẩy';tags.setAttribute('aria-label','Chủ đề bài luyện');const saveNotes=document.createElement('button');saveNotes.className='action-btn';saveNotes.textContent='Lưu ghi chú';saveNotes.onclick=async()=>{saveNotes.disabled=true;try{const value=textarea.value,topics=[...new Set(tags.value.split(',').map(s=>s.trim()).filter(Boolean))].slice(0,30);await persist(current=>current.map(e=>e.id===entry.id?{...e,notes:value,tags:topics}:e));showToast('Đã lưu ghi chú','success');}catch(e){showToast(e.message,'error');saveNotes.disabled=false;}};notes.append(summary,textarea,tags,saveNotes);
            const draft=noteDrafts.get(entry.id)||drafts.get(entry.id);if(draft){notes.open=drafts.has(entry.id);textarea.value=draft.notes;tags.value=draft.tags;}
            const trackDraft=()=>noteDrafts.set(entry.id,{id:entry.id,notes:textarea.value,tags:tags.value});textarea.addEventListener('input',trackDraft);tags.addEventListener('input',trackDraft);
            row.append(info,select,open,remove,notes);list.append(row);
        }
        UILanguage?.apply();
    }
    async function openEntry(entry) {
        if(isBuilding||App.isRunning||isBatchTesting){showToast('Stop the running program before opening an archived solution.','warning');return;}
        if(entry.kind==='folder'){await openFolderEntry(entry);dialog.close();return;}
        dialog.close();
        if(entry.problem)await handleProblemReceived(JSON.parse(JSON.stringify(entry.problem)),{newTab:true,starter:entry.code,extension:entry.extension});
        else{newFile(entry.extension);setTabText(App.tabs.find(t=>t.id===getPreferredTabId()),entry.code);}
        const tab=App.tabs.find(t=>t.id===getPreferredTabId());tab.libraryKey=entry.id;tab.practiceTimeMs=entry.practiceTimeMs||0;
    }
    function open(){ready.then(()=>{render();if(!dialog.open)dialog.showModal();}).catch(e=>showToast(e.message,'error'));}
    function init(){
        ready=electronAPI.stateRead('practice-library').then(doc=>{entries=Array.isArray(doc?.entries)?doc.entries.filter(e=>e&&typeof e.id==='string'&&typeof e.code==='string'&&statuses[e.status]&&Array.isArray(e.results)):[];});
        dialog=document.createElement('dialog');dialog.id='practice-library';dialog.className='practice-library';
        dialog.innerHTML='<header><h2>Practice archive</h2><button type="button" class="action-btn" data-close>Close</button></header><div class="practice-library-tools"><input type="search" placeholder="Search saved practice" aria-label="Search saved practice"><select aria-label="Filter practice status"><option value="all">All practice</option></select><button class="action-btn" data-save>Save current solution</button><span id="practice-library-count"></span></div><p>Local sample results do not include platform hidden tests.</p><div class="practice-library-list"></div>';
        document.body.append(dialog);list=dialog.querySelector('.practice-library-list');search=dialog.querySelector('input');filter=dialog.querySelector('select');
        platformFilter=document.createElement('select');platformFilter.setAttribute('aria-label','Lọc nền tảng');for(const [value,label]of [['all','Mọi nền tảng'],['codeforces','Codeforces'],['leetcode','LeetCode'],['hackerrank','HackerRank'],['local','Bài trên máy']])platformFilter.append(new Option(label,value));topicFilter=document.createElement('select');topicFilter.setAttribute('aria-label','Lọc chủ đề');topicFilter.append(new Option('Mọi chủ đề','all'));filter.after(platformFilter,topicFilter);platformFilter.onchange=render;topicFilter.onchange=render;
        const folderButton=document.createElement('button');folderButton.className='action-btn';folderButton.dataset.saveFolder='';folderButton.textContent='Archive & close folder';folderButton.onclick=()=>archiveFolderAndClose().catch(e=>showToast(e.message,'error'));dialog.querySelector('.practice-library-tools').append(folderButton);
        const closeFolderButton=document.createElement('button');closeFolderButton.id='btn-archive-folder';closeFolderButton.className='explorer-action-btn folder-only';closeFolderButton.title='Archive & close folder';closeFolderButton.setAttribute('aria-label','Archive & close folder');closeFolderButton.innerHTML='<svg class="ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 3h18v5H3zM5 8v13h14V8M9 12h6"/></svg>';closeFolderButton.onclick=()=>archiveFolderAndClose().catch(e=>showToast(e.message,'error'));document.querySelector('.explorer-actions')?.append(closeFolderButton);
        for(const [value,label]of Object.entries(statuses)){const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);}
        filter.append(new Option('Đã luyện','done'),new Option('Chưa hoàn thành','unfinished'));
        search.oninput=render;filter.onchange=render;dialog.querySelector('[data-close]').onclick=()=>dialog.close();
        dialog.querySelector('[data-save]').onclick=async()=>{try{const tab=App.tabs.find(t=>t.id===getPreferredTabId());await save(tab,tab?.testState?.problem,'practiced');showToast('Practice saved to archive','success');}catch(e){showToast(e.message,'error');}};
        const button=document.createElement('button');button.id='btn-practice-library';button.className='action-btn oj-open-btn';button.textContent='Archive';button.title='Practice archive';button.onclick=open;
        document.getElementById('btn-problem-browser').after(button);
        ready.catch(e=>showToast(e.message,'error'));
    }
    document.addEventListener('DOMContentLoaded',init);
    async function syncOnline(githubId,provider,profile){await ready;const accepted=new Map((profile.accepted||[]).map(s=>[s.url,s]));const canonical=url=>String(url||'').replace(/\/$/,'');await persist(current=>current.map(entry=>{const match=[...accepted.values()].find(s=>canonical(s.url)===canonical(entry.problem?.url));return match?{...entry,onlineAccepted:{...match,githubId,provider,syncedAt:profile.syncedAt}}:entry;}));}
    async function trackTime(tab,time){
        await ready;if(!Number.isFinite(time)||time<0)return;
        const id=key(tab,tab.testState?.problem);
        if(!entries.some(e=>e.id===id&&(e.practiceTimeMs||0)+1000<time))return;
        await persist(current=>current.map(e=>e.id===id?{...e,practiceTimeMs:Math.max(e.practiceTimeMs||0,time)}:e),false);
        const row=[...list.querySelectorAll('.practice-library-row')].find(row=>row.dataset.entryId===id),label=row?.querySelector('[data-practice-time]');
        if(label)label.textContent=Math.floor(time/60000)+' phút luyện';
    }
    async function mergeImported(incoming){await ready;const added=incoming.map(e=>({...e,id:'import:'+crypto.randomUUID(),path:null,kind:e.kind==='folder'&&!e.materialized?'imported-folder':e.kind,folderPath:e.materialized?e.folderPath:undefined,openFiles:e.materialized?e.openFiles:undefined}));await persist(current=>[...added,...current]);return added.length;}
    async function mergeRecovered(incoming){await ready;await persist(current=>{const values=new Map(current.map(e=>[e.id,e]));for(const entry of incoming)if(entry&&typeof entry.id==='string'&&typeof entry.code==='string'&&statuses[entry.status]&&Array.isArray(entry.results))values.set(entry.id,{...values.get(entry.id),...entry});return [...values.values()];});}
    function applyDrafts(current,drafts){return current.map(e=>{const draft=drafts.get(e.id);return draft?{...e,notes:draft.notes,tags:[...new Set(draft.tags.split(',').map(s=>s.trim()).filter(Boolean))].slice(0,30)}:e;});}
    async function flushDrafts(){await ready;if(!noteDrafts.size)return;const pending=new Map(noteDrafts);await persist(current=>applyDrafts(current,pending),false);for(const [id,draft]of pending)if(noteDrafts.get(id)===draft)noteDrafts.delete(id);}
    function flushDraftsSync(){if(!noteDrafts.size)return true;const next=applyDrafts(entries,noteDrafts);if(!electronAPI.stateWriteSync('practice-library',{version:1,entries:next}))return false;entries=next;noteDrafts.clear();return true;}
    return{open,openEntry,save,record,syncOnline,archiveFolderAndClose,trackTime,mergeImported,mergeRecovered,flushDrafts,flushDraftsSync,drafts:()=>[...noteDrafts.values()].filter(d=>entries.some(e=>e.id===d.id)),entries:()=>JSON.parse(JSON.stringify(entries))};
})();
