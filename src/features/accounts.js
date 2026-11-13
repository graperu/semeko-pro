'use strict';
window.SemekoAccounts=(()=>{
    let dialog,body,note,account=null,ticket=null,timer=null,resultDialog,activeSubmission=null;
    let submitFlight=null,pendingSubmit=null,pendingSubmitTimer=null,cancelPendingButton,lastIndicatorLanguage;
    const tr=text=>window.UILanguage?UILanguage.translate(text):text;
    async function call(promise){const r=await promise;if(!r.ok)throw Error(r.error);return r.data;}
    function stopPoll(){clearTimeout(timer);timer=null;if(ticket)electronAPI.accountCancel(ticket);ticket=null;}
    function button(label,action){const b=document.createElement('button');b.type='button';b.className='action-btn';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){note.textContent=e.message;if(!dialog?.open)showToast(e.message,'error');}finally{b.disabled=b.dataset.officialSubmit==='true'?!!submitFlight||!!pendingSubmit:false;}};return b;}
    function submitControls(){
        for(const button of document.querySelectorAll('[data-official-submit]'))button.disabled=!!submitFlight||!!pendingSubmit;
        if(cancelPendingButton)cancelPendingButton.hidden=!pendingSubmit;
    }
    function clearPending(){
        const old=pendingSubmit;pendingSubmit=null;clearTimeout(pendingSubmitTimer);pendingSubmitTimer=null;old?.sourceListener?.dispose();submitControls();return old;
    }
    function cancelPending(message='Đã hủy chờ nộp. Chưa gửi bài lên nền tảng.'){
        if(!pendingSubmit)return;clearPending();note.textContent=message;showToast(message,'info');
    }
    function problemURL(tab,code){
        const normalize=value=>{try{
            const url=new URL(value);if(url.protocol!=='https:'||url.port||url.username||url.password)return null;
            if(url.hostname==='codeforces.com'&&/^\/(?:problemset\/problem\/\d+\/[A-Za-z]\d*|contest\/\d+\/problem\/[A-Za-z]\d*)\/?$/.test(url.pathname))return url.origin+url.pathname.replace(/\/$/,'');
            if(url.hostname==='leetcode.com'&&/^\/problems\/[a-z0-9-]+(?:\/description)?\/?$/.test(url.pathname))return url.origin+'/problems/'+url.pathname.split('/')[2]+'/';
        }catch(_){}return null;};
        if(tab.testState?.problem?.url)return normalize(tab.testState.problem.url);
        const links=[...code.slice(0,4096).matchAll(/^\s*(?:\/\/|#)\s*(https:\/\/\S+)\s*$/gm)].map(m=>normalize(m[1])).filter(Boolean);
        const unique=[...new Set(links)];return unique.length===1?unique[0]:null;
    }
    function snapshot(){
        const tab=App.tabs.find(t=>t.id===getPreferredTabId());if(!tab)throw Error('Mở tệp lời giải trước khi nộp');
        const code=tabSourceText(tab),url=problemURL(tab,code);if(!url)throw Error('Chọn bài CF/LeetCode trong Luyện tập hoặc thêm link đề ở dòng chú thích đầu lời giải.');
        const extension=(tab.path||tab.name||'').split('.').pop().toLowerCase();
        if(!['cpp','c','cc','cxx','py','java','cs'].includes(extension)||!code.trim())throw Error('Mở lời giải C/C++, Python, Java hoặc C# có nội dung trước khi nộp.');
        return{tabId:tab.id,path:tab.path||'',name:tab.name,code,url,extension:['cc','cxx'].includes(extension)?'cpp':extension,provider:new URL(url).hostname==='codeforces.com'?'codeforces':'leetcode'};
    }
    function unchanged(value){
        const tab=App.tabs.find(t=>t.id===value.tabId);
        return !!tab&&getPreferredTabId()===value.tabId&&(tab.path||'')===value.path&&tab.name===value.name&&tabSourceText(tab)===value.code&&problemURL(tab,value.code)===value.url;
    }
    async function sendSnapshot(value,data,connection){
        if(String(data.github?.id)!==String(value.owner))throw Error('Tài khoản Semeko đã thay đổi. Chưa gửi bài; kiểm tra lại rồi bấm Nộp.');
        if(!unchanged(value))throw Error('Tệp, đề bài hoặc lời giải đã thay đổi. Chưa gửi bài; kiểm tra lại rồi bấm Nộp.');
        if(value.handle&&value.handle!==connection.handle)throw Error('Tài khoản nền tảng đã thay đổi. Chưa gửi bài; kiểm tra lại rồi bấm Nộp.');
        for(const id of ['semeko-accounts','practice-library','oj-browser']){const popup=document.getElementById(id);if(popup?.open)popup.close();}
        if(connection.transport!=='bridge'&&!await showConfirmDialog({title:'Nộp và chấm trên nền tảng',message:'Gửi lời giải hiện tại lên '+value.provider+' bằng tài khoản '+connection.handle+'.\n\n'+value.name+' ('+value.extension+')\n'+value.url,confirmText:'Nộp lời giải',cancelText:'Cancel'}))return;
        if(!unchanged(value))throw Error('Lời giải đã thay đổi trong lúc xác nhận. Chưa gửi bài; bấm Nộp lại.');
        const preparing={owner:String(value.owner),provider:value.provider,handle:connection.handle,problemURL:value.url,phase:'submitting'};
        window.CodingWorkspace?.open('submission');window.CodingWorkspace?.submission(preparing);
        try{const sent=await call(electronAPI.officialSubmit({url:value.url,code:value.code,extension:value.extension,expectedOwner:value.owner,expectedHandle:connection.handle}));await openResults(sent.ticket,{inline:true});}
        catch(e){window.CodingWorkspace?.submission({...preparing,phase:'error',error:e.message});throw e;}
    }
    async function resumePending(data,event){
        const value=pendingSubmit;if(!value||event.provider!==value.provider)return false;
        clearPending();const flight=Symbol('resume');submitFlight=flight;submitControls();
        try{
            if(Date.now()>value.expiresAt)throw Error('Đã hết thời gian chờ kết nối. Chưa gửi bài; bấm Nộp lại.');
            const connection=data.official?.connections?.[value.provider];
            if(!connection||connection.connected===false||connection.handle!==event.handle)throw Error('Tài khoản trình duyệt chưa được xác nhận. Chưa gửi bài; kết nối lại.');
            await sendSnapshot(value,data,connection);
        }catch(e){note.textContent=e.message;showToast(e.message,'warning');}
        finally{if(submitFlight===flight)submitFlight=null;submitControls();}
        return true;
    }
    function updateAccountIndicator(){
        const control=document.getElementById('btn-account');if(!control)return;lastIndicatorLanguage=document.documentElement.lang;
        const providers=['codeforces','leetcode'],connections=account?.official?.connections||{};
        const active=providers.filter(p=>connections[p]&&connections[p].connected!==false),saved=providers.some(p=>connections[p]);
        control.dataset.connection=active.length?'connected':saved?'interrupted':'disconnected';
        const title=tr('Account connections')+' · '+providers.map(p=>(p==='codeforces'?'CF':'LC')+': '+(connections[p]?.handle?connections[p].handle+' — ':'')+tr(connections[p]?(connections[p].connected===false?'Connection interrupted':'Connected'):'Not connected')).join(' · ');
        control.title=title;control.setAttribute('aria-label',title);
    }
    function render(){
        if(!body||!account)return;
        const historyExpanded=body.querySelector('.account-history')?.open||false;
        window.CodingWorkspace?.accountChanged();
        const expanded=new Set([...body.querySelectorAll('.account-connection-card')].filter(row=>row.querySelector('.account-public-profile')?.open).map(row=>row.dataset.provider));
        const active=document.activeElement,focusedProvider=body.contains(active)?active.closest('.account-connection-card')?.dataset.provider:null;
        const focusedAction=active?.dataset.action,focusedTag=active?.tagName;
        body.replaceChildren();updateAccountIndicator();
        if(!account.github){
            if(account.rememberedLogin){const remembered=document.createElement('p');remembered.dataset.i18nPreserve='';remembered.textContent='Tài khoản đã lưu: '+account.rememberedLogin+(account.sessionExpired?' — cần xác nhận lại phiên cũ':'');body.append(remembered);}
            const title=document.createElement('p');title.textContent=account.configured?'Sign in with GitHub to link your practice profiles.':'GitHub login is not configured for this build';body.append(title);
            if(account.configured)body.append(button('Sign in with GitHub',async()=>{
                stopPoll();const flow=await call(electronAPI.accountStart());ticket=flow.ticket;
                note.textContent=tr('Enter this code on GitHub:')+' '+flow.code;
                async function check(){if(ticket!==flow.ticket)return;try{const result=await call(electronAPI.accountPoll(flow.ticket));if(ticket!==flow.ticket)return;if(result.pending){timer=setTimeout(check,Math.max(1,result.interval)*1000);return;}ticket=null;account=result.account;note.textContent='GitHub sign-in successful';render();}catch(e){stopPoll();note.textContent=e.message;}}
                timer=setTimeout(check,flow.interval*1000);
            }));
        }else{
            const heading=document.createElement('strong');heading.dataset.i18nPreserve='';heading.textContent=account.github.login;const owner=document.createElement('div');owner.className='account-owner';owner.append(heading,button('Sign out',async()=>{stopPoll();cancelPending('Đã hủy chờ nộp vì đăng xuất. Chưa gửi bài.');account=await call(electronAPI.accountLogout());note.textContent='Signed out';render();}));body.append(owner);
            const cards=document.createElement('div');cards.className='account-platform-grid';
            for(const provider of ['codeforces','leetcode']){
                const connection=account.official?.connections?.[provider],connected=!!connection&&connection.connected!==false,name=provider==='codeforces'?'Codeforces':'LeetCode';
                const row=document.createElement('section');row.className='account-platform account-connection-card';row.dataset.provider=provider;row.dataset.state=connected?'connected':connection?'interrupted':'disconnected';row.setAttribute('aria-label',name);
                const top=document.createElement('div');top.className='account-platform-heading';
                const heading=document.createElement('h3');heading.textContent=name;
                const badge=document.createElement('span');badge.className='account-connection-badge';badge.dataset.connectionStatus='';const stateLabel=document.createElement('span');stateLabel.textContent=connected?'Connected':connection?'Connection interrupted':'Not connected';badge.append(stateLabel);top.append(heading,badge);
                const identity=document.createElement('strong');identity.className='account-platform-identity';identity.dataset.i18nPreserve='';identity.textContent=connection?.handle||'—';
                const help=document.createElement('p');help.className='account-platform-help';help.textContent=connected?'Ready to submit from Semeko':connection?'Reconnect the browser before submitting.':'Connect once to submit from the app.';
                const actions=document.createElement('div');actions.className='account-platform-actions';
                const connect=button(connected?'Connected':connection?'Reconnect':'Connect',async()=>{const login=await call(electronAPI.officialLogin(provider));if(login.connected){account=await call(electronAPI.accountInfo());render();note.textContent='Đã kết nối '+provider+'. Có thể nộp bài ngay trong Semeko.';return;}note.textContent=login.bridge?'Mở trang kết nối trên trình duyệt đang dùng. Cài tiện ích một lần và bấm Kết nối hồ sơ này; phiên sẽ tự chuyển vào Semeko sau khi đăng nhập.':'Chrome đã mở để đăng nhập nền tảng. Không cần đăng nhập Google hay bật đồng bộ Chrome. Semeko sẽ tự nhận tài khoản, lưu phiên và quay lại app.';});
                connect.dataset.action='connect';connect.classList.add('account-connect');connect.disabled=connected;connect.setAttribute('aria-label',(connected?'Connected':connection?'Reconnect':'Connect')+' '+name);actions.append(connect);
                if(connection){const disconnect=button('Disconnect',async()=>{await call(electronAPI.officialLogout(provider));account=await call(electronAPI.accountInfo());render();});disconnect.dataset.action='disconnect';disconnect.setAttribute('aria-label','Disconnect '+name);actions.append(disconnect);}
                const publicProfile=document.createElement('details');publicProfile.className='account-public-profile';publicProfile.dataset.action='public-profile';publicProfile.open=expanded.has(provider);
                const summary=document.createElement('summary');summary.textContent='Public profile';publicProfile.append(summary);
                const warning=document.createElement('p');warning.textContent='Public profile statistics are separate from the browser account used to submit.';
                const tools=document.createElement('div');tools.className='account-public-tools';
                const input=document.createElement('input');input.placeholder='Platform username';input.setAttribute('aria-label',name+' username');input.value=account.links[provider]?.handle||'';input.autocomplete='off';
                tools.append(input,button('Link profile',async()=>{account=await call(electronAPI.accountLink({provider,handle:input.value.trim()}));note.textContent='Public profile linked. Ownership is not verified.';render();}),button('Sync results',async()=>{account=await call(electronAPI.accountSync(provider));await window.PracticeLibrary?.syncOnline(account.github.id,provider,account.links[provider]);note.textContent='Public results synced';render();}),button('Unlink',async()=>{account=await call(electronAPI.accountUnlink(provider));render();}));
                [...tools.querySelectorAll('button')].forEach((control,index)=>{control.dataset.action=['link-profile','sync-results','unlink'][index];});
                publicProfile.append(warning,tools);
                const profile=account.links[provider];if(profile){const stats=document.createElement('p');stats.className='account-public-stats';for(const [index,[label,value]]of (provider==='codeforces'?[['Rating',profile.rating],['Rank',profile.rank]]:[['Rating',profile.rating==null?null:Math.round(profile.rating)],['Rank',profile.rank],['Solved',profile.solved]]).entries()){if(index)stats.append(' · ');const name=document.createElement('span');name.textContent=label;const number=document.createElement('span');number.dataset.i18nPreserve='';number.textContent=': '+(value??'—');stats.append(name,number);}publicProfile.append(stats);}
                row.append(top,identity,help,actions,publicProfile);cards.append(row);
            }
            body.append(cards);
        }
        if(account.official?.history?.length){
            const section=document.createElement('details');section.className='account-platform account-history';
            section.open=historyExpanded;
            const heading=document.createElement('summary');heading.textContent='Lịch sử nộp bài ('+account.official.history.length+')';section.append(heading);
            const clear=button('Xóa lịch sử',async()=>{await call(electronAPI.officialDismissHistory());account=await call(electronAPI.accountInfo());render();note.textContent='Đã xóa lịch sử hiển thị trên máy. Bài đang chấm được giữ lại.';});clear.dataset.action='clear-history';section.append(clear);
            const list=document.createElement('div');list.className='account-history-list';section.append(list);
            for(const job of account.official.history){
                const row=document.createElement('div');row.dataset.i18nPreserve='';row.className='official-result account-history-row';row.dataset.ticket=job.ticket;
                const identity=document.createElement('strong');
                let problem=job.problemURL||'';try{const u=new URL(problem);problem=job.provider==='codeforces'?(u.pathname.match(/(?:problemset\/problem|contest)\/(\d+)\/(?:problem\/)?([A-Za-z]\d*)/)||[]).slice(1).join('')||u.pathname:u.pathname.split('/').filter(Boolean).slice(-1)[0];}catch{}
                identity.textContent=(job.provider==='codeforces'?'CF':'LC')+' · '+problem;identity.title=job.problemURL||'';
                const status=document.createElement('span');const labels={unknown:'Chưa rõ kết quả',error:'Lỗi kết nối',preparing:'Chuẩn bị gửi',submitting:'Đang gửi',judging:'Đang chấm',pending:'Chờ kết quả',stopped:'Đã dừng'};
                status.textContent=job.verdict||labels[job.phase]||job.phase;status.className='account-history-status';status.title=job.error||job.pollError||status.textContent;
                row.dataset.state=job.phase==='finished'?(job.accepted?'success':'failure'):job.phase==='error'?'failure':'pending';
                const view=button('Chi tiết',()=>openResults(job.ticket));view.setAttribute('aria-label','Xem kết quả '+problem);
                const remove=button('×',async()=>{await call(electronAPI.officialDismissHistory(job.ticket));account=await call(electronAPI.accountInfo());render();const history=body.querySelector('.account-history');if(history)history.open=true;});remove.dataset.action='delete-history';remove.setAttribute('aria-label','Xóa khỏi lịch sử: '+problem);remove.title='Xóa khỏi lịch sử trên máy';remove.disabled=['preparing','submitting','judging','pending'].includes(job.phase);
                row.append(identity,status,view,remove);list.append(row);
            }
            body.append(section);
        }
        UILanguage?.apply();
        if(focusedProvider){const row=[...body.querySelectorAll('.account-connection-card')].find(row=>row.dataset.provider===focusedProvider);const target=focusedAction?row?.querySelector('[data-action="'+focusedAction+'"]'):row?.querySelector(focusedTag==='INPUT'?'input':'summary');if(target&&!target.disabled)target.focus({preventScroll:true});}
    }
    async function open(){account=await call(electronAPI.accountInfo());render();if(!dialog.open)dialog.showModal();}
    function renderResult(job){
        if(!resultDialog||job.ticket!==activeSubmission)return;
        const $=selector=>resultDialog.querySelector(selector),labels={preparing:'Chuẩn bị nộp',submitting:'Đang gửi lời giải',judging:'Máy chủ đang chấm',pending:'Đang chờ kết quả cuối',unknown:'Chưa rõ kết quả gửi — không tự nộp lại',error:'Có lỗi khi nộp bài',stopped:'Đã ngừng theo dõi'};
        resultDialog.dataset.state=job.phase==='finished'?(job.accepted?'success':'failure'):['error'].includes(job.phase)?'failure':'pending';
        const notSent=job.phase==='error'&&!job.submissionId;
        $('[data-verdict]').textContent=notSent?'Chưa gửi bài — cần xử lý kết nối':job.phase==='finished'?(job.accepted?'Thành công — ':'Không đạt — ')+(job.verdict||''):labels[job.phase]||job.phase;
        $('[data-identity]').textContent=[job.provider,job.handle,job.submissionId?'Bài nộp #'+job.submissionId:'Chưa nhận mã bài nộp'].join(' · ');
        $('[data-problem]').textContent=job.problemURL;
        $('[data-count]').textContent=notSent?'Chưa có bài nộp trên nền tảng':job.passed!=null?'Đạt '+job.passed+(job.total!=null?' / '+job.total:'')+' test'+(job.total==null?' (máy chủ chưa cung cấp tổng số)':''):'Máy chủ chưa trả số test';
        $('[data-failed]').textContent=job.failedTest?'Không đạt ở test '+job.failedTest:'';
        const progress=$('progress');progress.hidden=job.total==null&&job.phase!=='judging';if(job.total>0){progress.max=job.total;progress.value=Math.min(job.passed||0,job.total);}else progress.removeAttribute('value');
        $('[data-performance]').textContent=[job.runtime!=null?'Thời gian: '+job.runtime+(job.provider==='codeforces'?' ms':''):'',job.memory!=null?'Bộ nhớ: '+(job.provider==='codeforces'?(job.memory/1048576).toFixed(2)+' MB':job.memory):'',job.score!=null?'Điểm: '+job.score:''].filter(Boolean).join(' · ');
        $('[data-error]').textContent=job.error||job.pollError||'';
        $('.official-results-hint').textContent=notSent?'Lỗi xảy ra trước khi nhận bài nộp. Chưa có kết quả chấm từ nền tảng.':'Đây là kết quả từ nền tảng. App chỉ hiện thông tin test máy chủ cung cấp.';
        const detail=job.detail||{};for(const key of ['input','actual','expected','error']){const el=$('[data-case-'+key+']');el.textContent=detail[key]||'';el.parentElement.hidden=!detail[key];}
        $('[data-case]').hidden=!Object.values(detail).some(Boolean);$('[data-refresh]').disabled=!job.submissionId;$('[data-official]').disabled=!job.submissionId;
    }
    async function openResults(id,{inline=false}={}){
        account=await call(electronAPI.accountInfo());const job=id?account.official?.history?.find(j=>j.ticket===id):account.official?.history?.[0];
        if(!job){showToast('Chưa có bài nộp chính thức','info');return;}
        if(inline&&window.CodingWorkspace){CodingWorkspace.open('submission');CodingWorkspace.submission(job);return;}
        activeSubmission=job.ticket;for(const popup of document.querySelectorAll('dialog[open]'))if(popup!==resultDialog)popup.close();renderResult(job);if(!resultDialog.open)resultDialog.showModal();
    }
    async function submitOfficial(){
        if(submitFlight||pendingSubmit){showToast('Đang xử lý lần nộp hiện tại; không gửi thêm bài.','info');return;}
        const flight=Symbol('submit');submitFlight=flight;submitControls();
        try{
            const value=snapshot(),data=await call(electronAPI.accountInfo());
            if(!data.github){await open();note.textContent='Đăng nhập GitHub trong Semeko trước khi kết nối nền tảng. Chưa gửi bài.';return;}
            value.owner=data.github.id;const connection=data.official?.connections?.[value.provider];value.handle=connection?.handle||null;
            if(!connection||connection.connected===false){
                value.expiresAt=Date.now()+600000;pendingSubmit=value;
                const tab=App.tabs.find(t=>t.id===value.tabId);value.sourceListener=tab?.model?.onDidChangeContent?.(()=>cancelPending('Lời giải đã thay đổi. Đã hủy chờ nộp; chưa gửi bài.'));
                pendingSubmitTimer=setTimeout(()=>{if(pendingSubmit===value)cancelPending('Đã hết thời gian chờ kết nối. Chưa gửi bài; bấm Nộp lại.');},600000);submitControls();
                await open();
                if(pendingSubmit!==value)return;
                if(String(account.github?.id)!==String(value.owner)){cancelPending('Tài khoản Semeko đã thay đổi. Chưa gửi bài.');return;}
                note.textContent='Đang kết nối '+value.provider+' để nộp '+value.name+'. Chưa gửi bài. Kết nối xong sẽ tự nộp nếu lời giải và tài khoản không đổi.';
                const login=await call(electronAPI.officialLogin(value.provider));
                if(login.connected&&pendingSubmit===value){const fresh=await call(electronAPI.accountInfo());await resumePending(fresh,{provider:value.provider,handle:fresh.official?.connections?.[value.provider]?.handle});}
                return;
            }
            await sendSnapshot(value,data,connection);
        }catch(e){if(pendingSubmit)clearPending();throw e;}
        finally{if(submitFlight===flight)submitFlight=null;submitControls();}
    }
    async function submit(external){
        const tab=App.tabs.find(t=>t.id===getPreferredTabId()),problem=tab?.testState?.problem;
        if(!problem?.url){showToast('Open an online problem first','warning');return;}
        for(const id of ['semeko-accounts','practice-library','oj-browser']){const popup=document.getElementById(id);if(popup?.open)popup.close();}
        if(!await showConfirmDialog({title:'Submit on official platform',message:tr('Your solution will be copied. Sign in on the official page, paste the code, choose the language and confirm Submit yourself. Local test results do not count as online acceptance.')+'\n\n'+tab.name+'\n'+problem.url,confirmText:'Open submission page',cancelText:'Cancel'}))return;
        try{await call(electronAPI.accountSubmit({url:problem.url,code:tabSourceText(tab),external}));showToast('Solution copied. Confirm submission on the official page.','info');}catch(e){showToast(e.message,'error');}
    }
    function init(){
        dialog=document.createElement('dialog');dialog.id='semeko-accounts';dialog.className='practice-library';dialog.setAttribute('aria-labelledby','semeko-accounts-title');dialog.innerHTML='<header><h2 id="semeko-accounts-title">Semeko account</h2><button class="action-btn" data-close>Close</button></header><p>Connect Codeforces or LeetCode once, then submit your current solution from Semeko.</p><div data-body></div><p role="status" aria-live="polite" data-status></p>';
        document.body.append(dialog);body=dialog.querySelector('[data-body]');note=dialog.querySelector('[data-status]');cancelPendingButton=button('Hủy chờ nộp',()=>cancelPending());cancelPendingButton.id='account-cancel-submit';cancelPendingButton.hidden=true;dialog.append(cancelPendingButton);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',stopPoll);
        resultDialog=document.createElement('dialog');resultDialog.id='official-results';resultDialog.className='practice-library official-results';resultDialog.innerHTML='<header><h2>Kết quả nộp bài chính thức</h2><button class="action-btn" data-close>Đóng</button></header><section class="official-results-body"><strong data-verdict role="status" aria-live="polite"></strong><p data-identity></p><p data-problem></p><h3 data-count></h3><progress aria-label="Tiến độ test trên máy chủ"></progress><p data-failed></p><p data-performance></p><p data-error role="status"></p><section data-case><h3>Test máy chủ trả về</h3><div><h4>Đầu vào</h4><pre data-case-input></pre></div><div><h4>Kết quả của bạn</h4><pre data-case-actual></pre></div><div><h4>Kết quả mong đợi</h4><pre data-case-expected></pre></div><div><h4>Chi tiết lỗi</h4><pre data-case-error></pre></div></section><p class="official-results-hint">Đây là kết quả chấm từ nền tảng. App chỉ hiện thông tin test máy chủ cung cấp; không có toàn bộ dữ liệu test ẩn.</p><div class="official-results-actions"><button class="action-btn" data-refresh>Cập nhật kết quả</button><button class="action-btn" data-official>Mở bài nộp chính thức</button></div></section>';document.body.append(resultDialog);resultDialog.querySelector('[data-close]').onclick=()=>resultDialog.close();
        resultDialog.querySelector('[data-refresh]').onclick=async()=>{try{await call(electronAPI.officialRefresh(activeSubmission));}catch(e){resultDialog.querySelector('[data-error]').textContent=e.message;}};
        resultDialog.querySelector('[data-official]').onclick=async()=>{try{await call(electronAPI.officialOpenResult(activeSubmission));}catch(e){resultDialog.querySelector('[data-error]').textContent=e.message;}};
        const accountButton=button('Account',open);accountButton.id='btn-account';accountButton.title=tr('Account connections');accountButton.setAttribute('aria-label',tr('Account connections'));accountButton.dataset.connection='disconnected';accountButton.classList.add('oj-open-btn');document.getElementById('btn-practice-library').after(accountButton);
        function alternatives(buttons,id){
            const details=document.createElement('details');details.className='submission-alternatives';if(id)details.id=id;
            const summary=document.createElement('summary');summary.textContent='More actions';const menu=document.createElement('div');menu.className='submission-alternatives-menu';
            for(const control of buttons){control.addEventListener('click',()=>{details.open=false;});menu.append(control);}details.append(summary,menu);return details;
        }
        const submitButton=button('Submit online',()=>submit(false));submitButton.id='btn-submit-online';const browser=button('Submit in browser',()=>submit(true));browser.id='btn-submit-browser';
        const officialButton=button('Submit current file',submitOfficial);officialButton.id='btn-submit-official';officialButton.dataset.officialSubmit='true';officialButton.title='Submit the currently open file, not the selected preview problem.';
        document.querySelector('.oj-footer').prepend(alternatives([officialButton,submitButton,browser],'oj-more-actions'));
        document.addEventListener('click',event=>{for(const details of document.querySelectorAll('.submission-alternatives[open]'))if(!details.contains(event.target))details.open=false;});
        document.addEventListener('keydown',event=>{
            if(event.key!=='Escape')return;
            const details=[...document.querySelectorAll('.submission-alternatives[open]')].find(el=>el.closest('dialog[open]'));
            if(details){event.preventDefault();event.stopImmediatePropagation();details.open=false;details.querySelector('summary').focus();}
        },true);
        const archive=document.getElementById('practice-library');archive?.querySelector('.practice-library-tools').append(alternatives([button('Submit online',()=>submit(false)),button('Submit in browser',()=>submit(true))]));
        const quickSubmit=button('Nộp bài',submitOfficial);quickSubmit.id='btn-submit-header';quickSubmit.dataset.officialSubmit='true';quickSubmit.title='Nộp lời giải lên nền tảng và xem kết quả chấm';quickSubmit.innerHTML='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6"/></svg><span>Nộp bài</span>';document.getElementById('run-split').after(quickSubmit);
        document.getElementById('btn-buildrun').title='Run trên máy (F11) — không nộp bài lên nền tảng';
        const archiveSubmit=button('Nộp và nhận kết quả',submitOfficial);archiveSubmit.dataset.officialSubmit='true';archive?.querySelector('.practice-library-tools').append(archiveSubmit);
        new MutationObserver(()=>{if(lastIndicatorLanguage!==document.documentElement.lang)updateAccountIndicator();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
        void call(electronAPI.accountInfo()).then(data=>{if(!account){account=data;updateAccountIndicator();}}).catch(()=>{});
        electronAPI.onOfficialSubmission(async event=>{try{
            let latest=await call(electronAPI.accountInfo());
            if(pendingSubmit&&String(latest.github?.id)!==String(pendingSubmit.owner))cancelPending('Tài khoản Semeko đã thay đổi. Đã hủy chờ nộp; chưa gửi bài.');
            if(String(latest.github?.id)!==String(event.owner))return;
            window.CodingWorkspace?.submission(event);
            if(event.phase==='login-status'){note.textContent=event.message;return;}
            if(event.phase==='signed-in'){
                account=latest;render();
                note.textContent='Đăng nhập thành công — '+event.provider+': '+event.handle;showToast(note.textContent,'success');
                await resumePending(latest,event);
                // Profile statistics are optional and must never delay sign-in feedback or submission.
                void call(electronAPI.accountLink({provider:event.provider,handle:event.handle})).then(async()=>{
                    const fresh=await call(electronAPI.accountInfo());
                    if(String(fresh.github?.id)===String(event.owner)){account=fresh;render();}
                }).catch(()=>{});
                return;
            }
            if(event.phase==='finished'){
                showToast(event.provider+': '+event.verdict,event.accepted?'success':'warning');note.textContent='Kết quả từ máy chủ '+event.provider+': '+event.verdict;
                if(event.accepted)await window.PracticeLibrary?.syncOnline(latest.github.id,event.provider,{syncedAt:new Date().toISOString(),accepted:[{url:event.problemURL,submissionId:event.submissionId,handle:event.handle,time:Math.floor(event.createdAt/1000)}]});
            }
            account=latest;render();if(event.ticket===activeSubmission)renderResult(event);
        }catch(e){note.textContent=e.message;}});
    }
    document.addEventListener('DOMContentLoaded',init);
    return{open,submit,submitOfficial,openResults,problemURL,current:()=>account};
})();
