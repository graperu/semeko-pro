'use strict';
window.SemekoAccounts=(()=>{
    let dialog,body,note,account=null,ticket=null,timer=null;
    const tr=text=>window.UILanguage?UILanguage.translate(text):text;
    async function call(promise){const r=await promise;if(!r.ok)throw Error(r.error);return r.data;}
    function stopPoll(){clearTimeout(timer);timer=null;if(ticket)electronAPI.accountCancel(ticket);ticket=null;}
    function button(label,action){const b=document.createElement('button');b.type='button';b.className='action-btn';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){note.textContent=e.message;}finally{b.disabled=false;}};return b;}
    function render(){
        if(!body||!account)return;body.replaceChildren();
        if(!account.github){
            const title=document.createElement('p');title.textContent=account.configured?'Sign in with GitHub to link your practice profiles.':'GitHub login is not configured for this build';body.append(title);
            if(account.configured)body.append(button('Sign in with GitHub',async()=>{
                stopPoll();const flow=await call(electronAPI.accountStart());ticket=flow.ticket;
                note.textContent=tr('Enter this code on GitHub:')+' '+flow.code;
                async function check(){if(ticket!==flow.ticket)return;try{const result=await call(electronAPI.accountPoll(flow.ticket));if(ticket!==flow.ticket)return;if(result.pending){timer=setTimeout(check,Math.max(1,result.interval)*1000);return;}ticket=null;account=result.account;note.textContent='GitHub sign-in successful';render();}catch(e){stopPoll();note.textContent=e.message;}}
                timer=setTimeout(check,flow.interval*1000);
            }));
        }else{
            const heading=document.createElement('strong');heading.dataset.i18nPreserve='';heading.textContent=account.github.login;body.append(heading,button('Sign out',async()=>{stopPoll();account=await call(electronAPI.accountLogout());note.textContent='Signed out';render();}));
            for(const provider of ['codeforces','leetcode']){
                const row=document.createElement('section');row.className='account-platform';const heading=document.createElement('h3');heading.textContent=provider==='codeforces'?'Codeforces':'LeetCode';
                const input=document.createElement('input');input.placeholder='Platform username';input.setAttribute('aria-label',heading.textContent+' username');input.value=account.links[provider]?.handle||'';input.autocomplete='off';
                row.append(heading,input,button('Link profile',async()=>{account=await call(electronAPI.accountLink({provider,handle:input.value.trim()}));note.textContent='Public profile linked. Ownership is not verified.';render();}),button('Sync results',async()=>{account=await call(electronAPI.accountSync(provider));await window.PracticeLibrary?.syncOnline(account.github.id,provider,account.links[provider]);note.textContent='Public results synced';render();}),button('Unlink',async()=>{account=await call(electronAPI.accountUnlink(provider));render();}));
                const connection=account.official?.connections?.[provider];
                row.append(button('Đăng nhập '+heading.textContent,async()=>{await call(electronAPI.officialLogin(provider));note.textContent='Đăng nhập và hoàn tất xác minh trên cửa sổ chính thức vừa mở.';}));
                if(connection){const verified=document.createElement('p');verified.dataset.i18nPreserve='';verified.textContent='Phiên đăng nhập chính thức: '+connection.handle;row.append(verified,button('Đăng xuất '+heading.textContent,async()=>{await call(electronAPI.officialLogout(provider));account=await call(electronAPI.accountInfo());render();}));}
                const p=account.links[provider];if(p){const stats=document.createElement('p');for(const [index,[label,value]]of (provider==='codeforces'?[['Rating',p.rating],['Rank',p.rank]]:[['Rating',p.rating==null?null:Math.round(p.rating)],['Rank',p.rank],['Solved',p.solved]]).entries()){if(index)stats.append(' · ');const name=document.createElement('span');name.textContent=label;const number=document.createElement('span');number.dataset.i18nPreserve='';number.textContent=': '+(value??'—');stats.append(name,number);}const warning=document.createElement('small');warning.textContent='Public profile link; ownership not verified. Recent submissions only.';row.append(stats,warning);}
                body.append(row);
            }
        }
        if(account.official?.history?.length){const section=document.createElement('section');section.className='account-platform';const heading=document.createElement('h3');heading.textContent='Kết quả chấm trên nền tảng';section.append(heading);for(const job of account.official.history){const row=document.createElement('div');row.dataset.i18nPreserve='';row.className='official-result '+(job.phase==='finished'?(job.accepted?'official-success':'official-failure'):'');const text=document.createElement('p');text.textContent=[job.provider,job.submissionId?'#'+job.submissionId:'',job.verdict||job.phase,job.passed!=null?'Đạt '+job.passed+(job.total!=null?'/'+job.total:'')+' test':'',job.failedTest?'Lỗi ở test '+job.failedTest:'',job.error||job.pollError||''].filter(Boolean).join(' · ');row.append(text);const problem=document.createElement('small');problem.textContent=job.problemURL;row.append(problem);if(job.detail&&Object.values(job.detail).some(Boolean)){const details=document.createElement('details'),label=document.createElement('summary'),content=document.createElement('pre');label.textContent='Chi tiết máy chủ trả về';content.textContent=['Đầu vào: '+job.detail.input,'Kết quả: '+job.detail.actual,'Mong đợi: '+job.detail.expected,job.detail.error].join('\n');details.append(label,content);row.append(details);}section.append(row);}body.append(section);}
        [...body.querySelectorAll('.official-result')].forEach((row,i)=>{const job=account.official.history[i];if(job.submissionId)row.append(button('Cập nhật kết quả máy chủ',async()=>{await call(electronAPI.officialRefresh(job.ticket));}));});
        UILanguage?.apply();
    }
    async function open(){account=await call(electronAPI.accountInfo());render();if(!dialog.open)dialog.showModal();}
    async function submitOfficial(){
        const tab=App.tabs.find(t=>t.id===getPreferredTabId()),problem=tab?.testState?.problem;
        if(!problem?.url){showToast('Open an online problem first','warning');return;}
        const extension=(tab.path||tab.name||'').split('.').pop().toLowerCase();const code=tabSourceText(tab);
        const data=await call(electronAPI.accountInfo()),provider=new URL(problem.url).hostname==='codeforces.com'?'codeforces':'leetcode',connection=data.official?.connections?.[provider];
        if(!connection){await open();note.textContent='Bấm Đăng nhập '+provider+' và hoàn tất xác minh trước khi nộp.';return;}
        for(const id of ['semeko-accounts','practice-library','oj-browser']){const popup=document.getElementById(id);if(popup?.open)popup.close();}
        if(!await showConfirmDialog({title:'Nộp và chấm trên nền tảng',message:'Gửi lời giải hiện tại lên '+provider+' bằng tài khoản '+connection.handle+'. Máy chủ nền tảng sẽ chấm bài.\n\n'+tab.name+' ('+extension+')\n'+problem.url,confirmText:'Nộp lời giải',cancelText:'Cancel'}))return;
        await call(electronAPI.officialSubmit({url:problem.url,code,extension,expectedOwner:data.github.id,expectedHandle:connection.handle}));await open();note.textContent='Đang gửi và chờ kết quả chấm chính thức. Không bấm nộp lại khi chưa rõ kết quả.';
    }
    async function submit(external){
        const tab=App.tabs.find(t=>t.id===getPreferredTabId()),problem=tab?.testState?.problem;
        if(!problem?.url){showToast('Open an online problem first','warning');return;}
        for(const id of ['semeko-accounts','practice-library','oj-browser']){const popup=document.getElementById(id);if(popup?.open)popup.close();}
        if(!await showConfirmDialog({title:'Submit on official platform',message:tr('Your solution will be copied. Sign in on the official page, paste the code, choose the language and confirm Submit yourself. Local test results do not count as online acceptance.')+'\n\n'+tab.name+'\n'+problem.url,confirmText:'Open submission page',cancelText:'Cancel'}))return;
        try{await call(electronAPI.accountSubmit({url:problem.url,code:tabSourceText(tab),external}));showToast('Solution copied. Confirm submission on the official page.','info');}catch(e){showToast(e.message,'error');}
    }
    function init(){
        dialog=document.createElement('dialog');dialog.id='semeko-accounts';dialog.className='practice-library';dialog.innerHTML='<header><h2>Semeko account</h2><button class="action-btn" data-close>Close</button></header><p>GitHub identifies your local Semeko profile. Linking a public username does not sign you in to Codeforces or LeetCode.</p><div data-body></div><p role="status" aria-live="polite" data-status></p>';
        document.body.append(dialog);body=dialog.querySelector('[data-body]');note=dialog.querySelector('[data-status]');dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',stopPoll);
        const accountButton=button('Account',open);accountButton.id='btn-account';accountButton.title='Account';accountButton.classList.add('oj-open-btn');document.getElementById('btn-practice-library').after(accountButton);
        const submitButton=button('Submit online',()=>submit(false));submitButton.id='btn-submit-online';const browser=button('Submit in browser',()=>submit(true));browser.id='btn-submit-browser';
        // Keep submission actions beside the problem import footer, not in the Run button.
        document.querySelector('.oj-footer').prepend(submitButton,browser);
        const archive=document.getElementById('practice-library');archive?.querySelector('.practice-library-tools').append(button('Submit online',()=>submit(false)),button('Submit in browser',()=>submit(true)));
        const officialButton=button('Nộp và nhận kết quả',submitOfficial);officialButton.id='btn-submit-official';document.querySelector('.oj-footer').prepend(officialButton);
        archive?.querySelector('.practice-library-tools').append(button('Nộp và nhận kết quả',submitOfficial));
        electronAPI.onOfficialSubmission(async event=>{try{
            let latest=await call(electronAPI.accountInfo());if(String(latest.github?.id)!==String(event.owner))return;
            if(event.phase==='signed-in'){
                try{latest=await call(electronAPI.accountLink({provider:event.provider,handle:event.handle}));}catch(_){}
                note.textContent='Đã đăng nhập '+event.provider+': '+event.handle;
            }
            if(event.phase==='finished'){
                showToast(event.provider+': '+event.verdict,event.accepted?'success':'warning');note.textContent='Kết quả từ máy chủ '+event.provider+': '+event.verdict;
                if(event.accepted)await window.PracticeLibrary?.syncOnline(latest.github.id,event.provider,{syncedAt:new Date().toISOString(),accepted:[{url:event.problemURL,submissionId:event.submissionId,handle:event.handle,time:Math.floor(event.createdAt/1000)}]});
            }
            account=latest;render();
        }catch(e){note.textContent=e.message;}});
    }
    document.addEventListener('DOMContentLoaded',init);
    return{open,submit,current:()=>account};
})();
