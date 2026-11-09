'use strict';
window.SemekoAccounts=(()=>{
    let dialog,body,note,account=null,ticket=null,timer=null,resultDialog,activeSubmission=null;
    const tr=text=>window.UILanguage?UILanguage.translate(text):text;
    async function call(promise){const r=await promise;if(!r.ok)throw Error(r.error);return r.data;}
    function stopPoll(){clearTimeout(timer);timer=null;if(ticket)electronAPI.accountCancel(ticket);ticket=null;}
    function button(label,action){const b=document.createElement('button');b.type='button';b.className='action-btn';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){note.textContent=e.message;if(!dialog?.open)showToast(e.message,'error');}finally{b.disabled=false;}};return b;}
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
        [...body.querySelectorAll('.official-result')].forEach((row,i)=>{const job=account.official.history[i];row.append(button('Xem kết quả chấm',()=>openResults(job.ticket)));if(job.submissionId)row.append(button('Cập nhật kết quả máy chủ',async()=>{await call(electronAPI.officialRefresh(job.ticket));}));});
        UILanguage?.apply();
    }
    async function open(){account=await call(electronAPI.accountInfo());render();if(!dialog.open)dialog.showModal();}
    function renderResult(job){
        if(!resultDialog||job.ticket!==activeSubmission)return;
        const $=selector=>resultDialog.querySelector(selector),labels={preparing:'Chuẩn bị nộp',submitting:'Đang gửi lời giải',judging:'Máy chủ đang chấm',pending:'Đang chờ kết quả cuối',unknown:'Chưa rõ kết quả gửi — không tự nộp lại',error:'Có lỗi khi nộp bài',stopped:'Đã ngừng theo dõi'};
        resultDialog.dataset.state=job.phase==='finished'?(job.accepted?'success':'failure'):['error'].includes(job.phase)?'failure':'pending';
        $('[data-verdict]').textContent=job.phase==='finished'?(job.accepted?'Thành công — ':'Không đạt — ')+(job.verdict||''):labels[job.phase]||job.phase;
        $('[data-identity]').textContent=[job.provider,job.handle,job.submissionId?'Bài nộp #'+job.submissionId:'Chưa nhận mã bài nộp'].join(' · ');
        $('[data-problem]').textContent=job.problemURL;
        $('[data-count]').textContent=job.passed!=null?'Đạt '+job.passed+(job.total!=null?' / '+job.total:'')+' test'+(job.total==null?' (máy chủ chưa cung cấp tổng số)':''):'Máy chủ chưa trả số test';
        $('[data-failed]').textContent=job.failedTest?'Không đạt ở test '+job.failedTest:'';
        const progress=$('progress');progress.hidden=job.total==null&&job.phase!=='judging';if(job.total>0){progress.max=job.total;progress.value=Math.min(job.passed||0,job.total);}else progress.removeAttribute('value');
        $('[data-performance]').textContent=[job.runtime!=null?'Thời gian: '+job.runtime+(job.provider==='codeforces'?' ms':''):'',job.memory!=null?'Bộ nhớ: '+(job.provider==='codeforces'?(job.memory/1048576).toFixed(2)+' MB':job.memory):'',job.score!=null?'Điểm: '+job.score:''].filter(Boolean).join(' · ');
        $('[data-error]').textContent=job.error||job.pollError||'';
        const detail=job.detail||{};for(const key of ['input','actual','expected','error']){const el=$('[data-case-'+key+']');el.textContent=detail[key]||'';el.parentElement.hidden=!detail[key];}
        $('[data-case]').hidden=!Object.values(detail).some(Boolean);$('[data-refresh]').disabled=!job.submissionId;$('[data-official]').disabled=!job.submissionId;
    }
    async function openResults(id){
        account=await call(electronAPI.accountInfo());const job=id?account.official?.history?.find(j=>j.ticket===id):account.official?.history?.[0];
        if(!job){showToast('Chưa có bài nộp chính thức','info');return;}
        activeSubmission=job.ticket;for(const popup of document.querySelectorAll('dialog[open]'))if(popup!==resultDialog)popup.close();renderResult(job);if(!resultDialog.open)resultDialog.showModal();
    }
    async function submitOfficial(){
        const tab=App.tabs.find(t=>t.id===getPreferredTabId()),problem=tab?.testState?.problem;
        if(!problem?.url){showToast('Open an online problem first','warning');return;}
        const extension=(tab.path||tab.name||'').split('.').pop().toLowerCase();const code=tabSourceText(tab);
        const data=await call(electronAPI.accountInfo()),provider=new URL(problem.url).hostname==='codeforces.com'?'codeforces':'leetcode',connection=data.official?.connections?.[provider];
        if(!connection){await open();note.textContent='Bấm Đăng nhập '+provider+' và hoàn tất xác minh trước khi nộp.';return;}
        for(const id of ['semeko-accounts','practice-library','oj-browser']){const popup=document.getElementById(id);if(popup?.open)popup.close();}
        if(!await showConfirmDialog({title:'Nộp và chấm trên nền tảng',message:'Gửi lời giải hiện tại lên '+provider+' bằng tài khoản '+connection.handle+'. Máy chủ nền tảng sẽ chấm bài.\n\n'+tab.name+' ('+extension+')\n'+problem.url,confirmText:'Nộp lời giải',cancelText:'Cancel'}))return;
        const sent=await call(electronAPI.officialSubmit({url:problem.url,code,extension,expectedOwner:data.github.id,expectedHandle:connection.handle}));await openResults(sent.ticket);
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
        resultDialog=document.createElement('dialog');resultDialog.id='official-results';resultDialog.className='practice-library official-results';resultDialog.innerHTML='<header><h2>Kết quả nộp bài chính thức</h2><button class="action-btn" data-close>Đóng</button></header><section class="official-results-body"><strong data-verdict role="status" aria-live="polite"></strong><p data-identity></p><p data-problem></p><h3 data-count></h3><progress aria-label="Tiến độ test trên máy chủ"></progress><p data-failed></p><p data-performance></p><p data-error role="status"></p><section data-case><h3>Test máy chủ trả về</h3><div><h4>Đầu vào</h4><pre data-case-input></pre></div><div><h4>Kết quả của bạn</h4><pre data-case-actual></pre></div><div><h4>Kết quả mong đợi</h4><pre data-case-expected></pre></div><div><h4>Chi tiết lỗi</h4><pre data-case-error></pre></div></section><p class="official-results-hint">Đây là kết quả chấm từ nền tảng. App chỉ hiện thông tin test máy chủ cung cấp; không có toàn bộ dữ liệu test ẩn.</p><div class="official-results-actions"><button class="action-btn" data-refresh>Cập nhật kết quả</button><button class="action-btn" data-official>Mở bài nộp chính thức</button></div></section>';document.body.append(resultDialog);resultDialog.querySelector('[data-close]').onclick=()=>resultDialog.close();
        resultDialog.querySelector('[data-refresh]').onclick=async()=>{try{await call(electronAPI.officialRefresh(activeSubmission));}catch(e){resultDialog.querySelector('[data-error]').textContent=e.message;}};
        resultDialog.querySelector('[data-official]').onclick=async()=>{try{await call(electronAPI.officialOpenResult(activeSubmission));}catch(e){resultDialog.querySelector('[data-error]').textContent=e.message;}};
        const accountButton=button('Account',open);accountButton.id='btn-account';accountButton.title='Account';accountButton.classList.add('oj-open-btn');document.getElementById('btn-practice-library').after(accountButton);
        const submitButton=button('Submit online',()=>submit(false));submitButton.id='btn-submit-online';const browser=button('Submit in browser',()=>submit(true));browser.id='btn-submit-browser';
        // Keep submission actions beside the problem import footer, not in the Run button.
        document.querySelector('.oj-footer').prepend(submitButton,browser);
        const archive=document.getElementById('practice-library');archive?.querySelector('.practice-library-tools').append(button('Submit online',()=>submit(false)),button('Submit in browser',()=>submit(true)));
        const officialButton=button('Nộp và nhận kết quả',submitOfficial);officialButton.id='btn-submit-official';document.querySelector('.oj-footer').prepend(officialButton);
        const quickSubmit=button('Nộp bài',submitOfficial);quickSubmit.id='btn-submit-header';quickSubmit.title='Nộp lời giải lên nền tảng và xem kết quả chấm';quickSubmit.innerHTML='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6"/></svg><span>Nộp bài</span>';document.getElementById('run-split').after(quickSubmit);
        document.getElementById('btn-buildrun').title='Run trên máy (F11) — không nộp bài lên nền tảng';
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
            account=latest;render();if(event.ticket===activeSubmission)renderResult(event);
        }catch(e){note.textContent=e.message;}});
    }
    document.addEventListener('DOMContentLoaded',init);
    return{open,submit,submitOfficial,openResults,current:()=>account};
})();
