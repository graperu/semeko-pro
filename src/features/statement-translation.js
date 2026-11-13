'use strict';
window.StatementTranslation=(()=>{
    let section,button,toggle,note,languageSelect,original='',translated='',revision=0,showing=false;
    const tr=text=>window.UILanguage?UILanguage.translate(text):text;
    const $=id=>document.getElementById(id);
    async function refresh(){
        const result=await electronAPI.translationInfo();if(!result.ok)throw Error(result.error);
        $('translation-base').value=result.data.baseUrl;$('translation-model').value=result.data.model;$('translation-key').value='';
        $('translation-key').placeholder=result.data.hasKey?'Key saved. Leave blank to keep it.':'Enter API key';
    }
    async function save(){
        const key=$('translation-key');
        const result=await electronAPI.translationSave({baseUrl:$('translation-base').value.trim(),model:$('translation-model').value.trim(),apiKey:key.value});
        key.value='';if(!result.ok)throw Error(result.error);await refresh();showToast('Translation settings saved','success');
    }
    function setStatement(html,saved){
        revision++;original=html||'';translated=typeof saved==='string'?saved:'';showing=!!translated;
        if(button){button.closest('.statement-translation-bar').hidden=!original;button.disabled=!original;toggle.hidden=!translated;toggle.textContent=showing?'Show original':'Show Vietnamese';note.textContent='';button.textContent='Translate to Vietnamese';languageSelect.value='vi';languageSelect.disabled=!original;
            if(translated)$('oj-statement').innerHTML=translated;
            else if(original){const current=revision;queueMicrotask(()=>{if(current===revision&&languageSelect.value==='vi')run();});}
        }
    }
    async function translateArticle(html,targetLanguage='vi'){
        if(window.ProblemBrowser?.formatMath)html=await ProblemBrowser.formatMath(html);
        const container=document.createElement('div');container.innerHTML=html;
        const skip='pre,code,kbd,samp,var,.katex,.tex-span,math,svg,script,style'+(targetLanguage==='en'?'':',.sample-test,.challenge_sample_input_body,.challenge_sample_output_body,.input,.output');
        const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);let node;const nodes=[],texts=[],protectedValues=[];
        while((node=walker.nextNode())){
            if(node.parentElement.closest(skip)||!/[\p{L}]{2}/u.test(node.data))continue;
            // Split long prose nodes before adding placeholders so a large
            // statement can be translated without exceeding the IPC limit.
            if(node.data.length>2000)node.splitText(2000);
            let text=node.data.replace(/\b\d+(?:[.,]\d+)*(?:e[+-]?\d+)?\b/gi,value=>{const id=protectedValues.length;protectedValues.push(value);return 'SEMEKO_KEEP_'+id+'_END';});
            texts.push(text);nodes.push(node);
        }
        if(!texts.length)return reviewArticle(html);
        const data=[];
        for(let at=0;at<texts.length;){
            const batch=[];let size=0;
            while(at<texts.length&&batch.length<100&&(size+texts[at].length<=60000||!batch.length)){size+=texts[at].length;batch.push(texts[at++]);}
            const response=await electronAPI.translateStatement({texts:batch,targetLanguage});if(!response.ok)throw Error(response.error);
            if(!Array.isArray(response.data)||response.data.length!==batch.length)throw Error('Translation response does not match the statement');
            data.push(...response.data);
        }
        const result={data};
        if(!Array.isArray(result.data)||result.data.length!==nodes.length)throw Error('Translation response does not match the statement');
        result.data.forEach((text,i)=>{const source=nodes[i].data;nodes[i].data=(source.match(/^\s*/)?.[0]||'')+text.trim().replace(/SEMEKO_KEEP_(\d+)_END/g,(_,id)=>protectedValues[Number(id)]??'')+(source.match(/\s*$/)?.[0]||'');});
        return targetLanguage==='en'?container.innerHTML:reviewArticle(container.innerHTML);
    }
    function auditNodes(source,translation){
        const skip='pre,code,kbd,samp,var,.katex,.tex-span,math,svg,script,style,.sample-test,.input,.output';
        const read=html=>{const container=document.createElement('div');container.innerHTML=html;const nodes=[],walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))if(!node.parentElement.closest(skip))nodes.push(node);return{container,nodes};};
        const a=read(source),b=read(translation),normalize=s=>s.replace(/\s+/g,' ').trim();
        const originalTexts=new Set(a.nodes.map(n=>normalize(n.data)));
        const nodes=b.nodes.filter(n=>{const text=normalize(n.data);if(!originalTexts.has(text))return false;if(/[\u0400-\u04ff]{3}/.test(text))return true;
            if(/[^\x00-\x7f]/.test(text.replace(/[“”‘’–—…≤≥×·]/g,'')))return false;
            return(text.match(/[A-Za-z]{2,}/g)||[]).length>=4&&(text.match(/\b(the|you|are|given|return|find|each|integer|array|must|there|that|this|with|from|have|such|where|will|is|also|answer)\b/gi)||[]).length>=2;});
        return{container:b.container,nodes};
    }
    function auditArticle(source,translation){const probe=document.createElement('div');probe.innerHTML=source;for(const n of probe.querySelectorAll('pre,code,var,.katex,.tex-span,math,svg,script,style'))n.remove();return Math.max(auditNodes(source,translation).nodes.length,/[\u0400-\u04ff]{3}/.test(probe.textContent)?1:0);}
    async function normalizeEnglish(html){const probe=document.createElement('div');probe.innerHTML=html;for(const n of probe.querySelectorAll('pre,code,var,.katex,.tex-span,math,svg,script,style'))n.remove();return /[\u0400-\u04ff]{3}/.test(probe.textContent)?translateArticle(html,'en'):html;}
    async function repairArticle(source,translation){
        const {container,nodes}=auditNodes(source,translation);
        if(nodes.length){const fragment=document.createElement('div');for(const n of nodes){const p=document.createElement('p');p.textContent=n.data;fragment.append(p);}const result=document.createElement('div');result.innerHTML=await translateArticle(fragment.innerHTML);if(result.children.length!==nodes.length)throw Error('Translation repair response does not match the statement');nodes.forEach((n,i)=>{n.data=result.children[i].textContent;});}
        return reviewArticle(container.innerHTML);
    }
    async function run(){
        if(!original||button.disabled)return;const current=revision,source=original;languageSelect.value='vi';button.disabled=true;note.textContent='Translating statement…';
        try{const result=translated||await translateArticle(source);if(current!==revision)return;translated=result;showing=languageSelect.value==='vi';$('oj-statement').innerHTML=showing?translated:original;toggle.hidden=false;toggle.textContent=showing?'Show original':'Show Vietnamese';note.textContent='Machine translation. Check the original for precise meaning.';}
        catch(e){if(current===revision){note.textContent=e.message;languageSelect.value='en';}}
        finally{if(current===revision)button.disabled=false;}
    }
    function settings(){
        const browser=$('oj-browser');if(browser.open)browser.close();openSettings();document.querySelector('.settings-tab[data-tab="languages"]').click();section.scrollIntoView({block:'start'});refresh().catch(e=>showToast(e.message,'error'));
    }
    function init(){
        if(!$('panel-languages'))return;
        section=document.createElement('section');section.id='statement-translation-settings';
        section.innerHTML='<h3>Statement translation API</h3><p class="setting-desc">OpenAI-compatible Chat Completions API. Only statement text is sent when you press Translate. Your provider may charge for usage.</p><div class="setting-row"><label for="translation-base">Base URL</label><input id="translation-base" type="url" placeholder="https://provider.example/v1" autocomplete="off"></div><div class="setting-row"><label for="translation-model">Model name</label><input id="translation-model" type="text" placeholder="Enter your provider model ID" autocomplete="off"></div><div class="setting-row"><label for="translation-key">API key</label><input id="translation-key" type="password" placeholder="Enter API key" autocomplete="off" spellcheck="false"></div><div class="translation-settings-actions"><button class="action-btn" data-save>Save translation settings</button><button class="action-btn" data-test>Test translation connection</button><button class="action-btn" data-remove>Remove saved API key</button></div>';
        $('panel-languages').append(section);
        const bulk=document.createElement('div');bulk.className='translation-settings-actions';const status=document.createElement('p');status.setAttribute('role','status');
        status.style.whiteSpace='pre-line';status.dataset.i18nPreserve='';
        function showProgress(d){const lines=[];for(const [id,name]of [['leetcode','LeetCode (LC)'],['codeforces','Codeforces (CF)'],['hackerrank','HackerRank (HR)']]){const p=d.platforms?.[id];if(p)lines.push(`${name}: ${p.done.toLocaleString('vi-VN')}/${p.total.toLocaleString('vi-VN')} đề — ${p.percent}%\n${p.failedSource??0} lỗi tải đề · ${p.failedTranslation??p.failed} lỗi dịch · ${p.retrying??0} đang thử lại · ${p.skipped} bỏ qua/Premium`);}lines.push(`Trạng thái: ${d.status}\nĐang xử lý: ${d.current||'—'}${d.error?'\n'+d.error:''}`);if(d.audit)lines.push('Rà bản Anh/Việt: '+d.audit.status+' · '+(d.audit.checked||0)+'/'+(d.audit.total||0)+' · '+(d.audit.queued||0)+' đề cần bổ sung');status.textContent=lines.join('\n\n');}
        async function updateProgress(action='info',options){const r=await electronAPI.translationBulk(action,options);if(!r.ok)throw Error(r.error);let d=r.data;if(!d.platforms){const latest=await electronAPI.translationBulk('info');if(latest.ok)d=latest.data;}if(d.status==='complete')d.status=d.failed?'Đã hết lượt chờ — vẫn còn đề lỗi':'Đã xử lý hết lượt chờ (không gồm Premium)';showProgress(d);}
        for(const [action,label,options] of [['start','Dịch hàng loạt CF + LC + HR / Tiếp tục',{hackerRank:true}],['pause','Tạm dừng hàng đợi'],['info','Xem tiến độ dịch']]){const b=document.createElement('button');b.className='action-btn';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await updateProgress(action,options);}catch(e){status.textContent=e.message;}finally{b.disabled=false;}};bulk.append(b);}section.append(bulk,status);
        setInterval(()=>{if(section.getClientRects().length)updateProgress().catch(()=>{});},10000);
        section.querySelector('[data-save]').onclick=()=>save().catch(e=>showToast(e.message,'error'));
        section.querySelector('[data-test]').onclick=async event=>{event.target.disabled=true;try{await save();const r=await electronAPI.translateStatement({texts:['Translate this programming problem.']});if(!r.ok)throw Error(r.error);showToast('Translation connection successful','success');}catch(e){showToast(e.message,'error');}finally{event.target.disabled=false;}};
        section.querySelector('[data-remove]').onclick=async()=>{const result=await electronAPI.translationRemove();if(!result.ok){showToast(result.error,'error');return;}await refresh();showToast('Translation API key removed','success');};
        const bar=document.createElement('div');bar.className='statement-translation-bar';bar.innerHTML='<button class="action-btn" data-translate disabled>Translate to Vietnamese</button><button class="action-btn" data-original hidden>Show original</button><button class="action-btn" data-config>Translation settings</button><span role="status" aria-live="polite"></span>';
        $('oj-statement').before(bar);button=bar.querySelector('[data-translate]');toggle=bar.querySelector('[data-original]');note=bar.querySelector('span');
        const label=document.createElement('label');label.textContent='Ngôn ngữ đề: ';label.dataset.i18nPreserve='';languageSelect=document.createElement('select');languageSelect.setAttribute('aria-label','Ngôn ngữ đề bài');languageSelect.innerHTML='<option value="en">English — Tiếng Anh</option><option value="vi">Tiếng Việt</option>';languageSelect.disabled=true;label.append(languageSelect);bar.prepend(label);
        languageSelect.onchange=()=>{if(languageSelect.value==='vi'){if(translated){showing=true;$('oj-statement').innerHTML=translated;toggle.textContent='Show original';}else run();}else{showing=false;$('oj-statement').innerHTML=original;toggle.textContent='Show Vietnamese';}};
        button.onclick=run;toggle.onclick=()=>{showing=!showing;languageSelect.value=showing?'vi':'en';$('oj-statement').innerHTML=showing?translated:original;toggle.textContent=showing?'Show original':'Show Vietnamese';};bar.querySelector('[data-config]').onclick=settings;
        refresh().catch(()=>{});
    }
    document.addEventListener('DOMContentLoaded',init);
    async function reviewArticle(html){
        const container=document.createElement('div');container.innerHTML=html;const nodes=[],texts=[];
        for(const pre of container.querySelectorAll('pre')){
            let explanation=false;const walker=document.createTreeWalker(pre,NodeFilter.SHOW_TEXT);let node;
            while((node=walker.nextNode())){
                if(node.parentElement.closest('code,var,.katex,math,svg'))continue;
                const label=node.data.trim();
                if(/^Explanation\s*:$/i.test(label)){node.data=node.data.replace(/Explanation/i,'Giải thích');explanation=true;continue;}
                if(/^Input\s*:$/i.test(label)){node.data=node.data.replace(/Input/i,'Đầu vào');explanation=false;continue;}
                if(/^Output\s*:$/i.test(label)){node.data=node.data.replace(/Output/i,'Đầu ra');explanation=false;continue;}
                if(explanation&&/[A-Za-z]{3}/.test(node.data)){nodes.push(node);texts.push(node.data);}
            }
        }
        if(texts.length){const protectedValues=[];const protectedTexts=texts.map(text=>text.replace(/"[^"\n]*"|'[^'\n]*'|\b\d+(?:[.,]\d+)*\b/g,value=>{const id=protectedValues.push(value)-1;return 'SEMEKO_KEEP_'+id+'_END';}));const r=await electronAPI.translateStatement({texts:protectedTexts});if(!r.ok)throw Error(r.error);if(r.data.length!==nodes.length)throw Error('Review response mismatch');nodes.forEach((n,i)=>{n.data=r.data[i].replace(/SEMEKO_KEEP_(\d+)_END/g,(_,id)=>protectedValues[Number(id)]);});}
        return window.ProblemBrowser?.formatMath?ProblemBrowser.formatMath(container.innerHTML):container.innerHTML;
    }
    return{refresh,save,translateArticle,reviewArticle,auditArticle,repairArticle,normalizeEnglish,setStatement};
})();
