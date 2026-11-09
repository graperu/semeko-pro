'use strict';
window.TechLibrary=(()=>{
    let dialog,list,preview,note,search,group,root,type,items=[],page=0,revision=0;
    const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
    const codeExt=new Set(['cpp','py','c','java']);
    const caption=text=>String(text).replace(/28\s*tech/gi,'').replace(/\[\s*\]/g,'').replace(/\s{2,}/g,' ').trim();
    function button(label,action){const b=el('button',label);b.type='button';b.className='action-btn';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){note.textContent=e.message;}finally{b.disabled=false;}};return b;}
    function options(select,values,label){select.replaceChildren();const all=el('option',label);all.value='';select.append(all);for(const value of values){const o=el('option',caption(value));o.value=value;select.append(o);}}
    function render(reset=false){if(reset)page=0;list.replaceChildren();const q=search.value.toLocaleLowerCase();const shown=items.filter(i=>(!root.value||i.root===root.value)&&(!group.value||i.group===group.value)&&(!type.value||(type.value==='code'?codeExt.has(i.ext):i.ext===type.value))&&(i.name+' '+i.group).toLocaleLowerCase().includes(q));page=Math.min(page,Math.max(0,Math.ceil(shown.length/50)-1));note.textContent=`${shown.length}/${items.length} tài liệu · Trang ${page+1}/${Math.max(1,Math.ceil(shown.length/50))}`;
        for(const item of shown.slice(page*50,page*50+50)){const b=button(caption(item.title||item.name),()=>select(item));b.className='learning-lesson';b.title=item.path;b.append(el('small',`${item.ext.toUpperCase()||'FILE'} · ${caption(item.group.split('/').slice(-2).join(' / '))}`));list.append(b);}
        const nav=el('div');nav.className='learning-actions';const back=button('Trước',()=>{page--;render();}),next=button('Sau',()=>{page++;render();});back.disabled=page===0;next.disabled=(page+1)*50>=shown.length;nav.append(back,next);list.append(nav);
    }
    function blank(item){if(isBuilding||App.isRunning||isBatchTesting)throw Error('Hãy dừng chương trình đang chạy trước.');const ext={Python:'py',C:'c',Java:'java'}[item.root]||'cpp';newFile(ext);dialog.close();showToast('Đã mở tab luyện tập. Đọc đề PDF và nhập test mẫu để kiểm thử.','info');}
    async function select(item){const rev=++revision;const heading=el('h2',caption(item.title||item.name));heading.title=item.path;preview.replaceChildren(heading,el('p',caption(item.group.split('/').slice(-2).join(' / '))));
        const url='https://github.com/Yumi-Miyamoto/28Tech-Full-Source/blob/'+window.TechLibrary.commit+'/'+item.path.split('/').map(encodeURIComponent).join('/');
        const actions=el('div');actions.className='learning-actions';actions.append(button('Xem nguồn GitHub',()=>electronAPI.openExternalLink(url)));preview.append(actions);
        if(item.ext==='pdf'){
            const description=el('p','Đang đọc tiêu đề và nội dung trang đầu…');preview.append(description);
            electronAPI.learningTechDescribe(item.id).then(r=>{if(rev!==revision)return;if(!r.ok){description.textContent='Chưa đọc được chủ đề: '+r.error;return;}description.textContent=`${r.data.pages} trang · `+(r.data.summary||'Tài liệu ảnh quét — chưa nhận dạng được tiêu đề bên trong.');}).catch(e=>{if(rev===revision)description.textContent=e.message;});
            actions.prepend(button('Đọc đề và luyện trong app',async()=>{dialog.close();await ProblemBrowser.openLibrary(item.id);}));
            preview.append(el('p','Tài liệu PDF gốc: có thể chứa đề bài, bài tập hoặc slide. Đọc trong cửa sổ Semeko; bản tải được giữ trên máy để mở lại.'));
            actions.prepend(button('Đọc PDF trong app',async()=>{const r=await electronAPI.learningTechOpen(item.id);if(!r.ok)throw Error(r.error);}));
            if(!['Frontend','Backend'].includes(item.root))actions.prepend(button('Tạo bài luyện từ tài liệu',()=>blank(item)));
            else preview.append(el('p','Tài liệu web/JavaScript: đọc và tự thực hành; chưa có runtime JavaScript trong bộ chấm.'));return;
        }
        if(!['cpp','py','c','java','h','txt','md','html','json','csv'].includes(item.ext)){preview.append(el('p','File gốc được giữ trong danh mục đầy đủ. Bấm Xem nguồn GitHub để xem hoặc tải bằng công cụ phù hợp.'));return;}
        const loading=el('p','Đang tải nội dung…');preview.append(loading);
        try{const r=await electronAPI.learningTechSource(item.id);if(rev!==revision)return;if(!r.ok)throw Error(r.error);loading.remove();
            preview.append(el('p',codeExt.has(item.ext)?'Mã nguồn tham khảo. Không coi lời giải là đề bài; chưa có bộ test chuẩn được gắn cho file này.':'Nội dung tài liệu gốc, hiển thị dạng văn bản.'));
            if(codeExt.has(item.ext))actions.prepend(button('Mở code để luyện tập',()=>{if(isBuilding||App.isRunning||isBatchTesting)throw Error('Hãy dừng chương trình đang chạy trước.');newFile(item.ext);setTabText(App.tabs.find(t=>t.id===getPreferredTabId()),r.data.code);dialog.close();}));
            const pre=el('pre',r.data.code);pre.dataset.i18nPreserve='';preview.append(pre);
        }catch(e){if(rev===revision)loading.textContent='Không tải được nội dung: '+e.message;}
    }
    async function open(){
        if(!dialog){dialog=el('dialog');dialog.id='tech-library';dialog.dataset.i18nPreserve='';const head=el('header');head.append(el('h2','Bài tập luyện tập'),button('Đóng',()=>{revision++;dialog.close();}));dialog.append(head,el('p','Danh mục toàn bộ file của repo cộng đồng, không phải khóa học chính thức. PDF đề/slide, mã nguồn và tài nguyên được phân loại riêng; không tự tạo bộ test giả.'));
            const tools=el('div');tools.className='learning-tools';search=el('input');search.type='search';search.placeholder='Tìm tên bài hoặc chủ đề';search.setAttribute('aria-label','Tìm bài luyện tập');root=el('select');root.setAttribute('aria-label','Môn học luyện tập');group=el('select');group.setAttribute('aria-label','Nhóm bài luyện tập');type=el('select');type.setAttribute('aria-label','Loại tài liệu luyện tập');options(type,['pdf','code','md','pptx','html','mp4'],'Mọi loại file');tools.append(search,root,type,group);dialog.append(tools);note=el('p');note.setAttribute('role','status');dialog.append(note);const body=el('div');body.className='learning-body';list=el('nav');preview=el('main');body.append(list,preview);dialog.append(body);document.body.append(dialog);search.oninput=type.onchange=group.onchange=()=>render(true);root.onchange=()=>{options(group,[...new Set(items.filter(i=>!root.value||i.root===root.value).map(i=>i.group))].sort(),'Tất cả nhóm');render(true);};
        }
        document.getElementById('learning-center')?.close();if(!dialog.open)dialog.showModal();
        try{if(!items.length){const r=await electronAPI.learningTechList();if(!r.ok)throw Error(r.error);items=r.data.items;window.TechLibrary.commit=r.data.commit;options(root,[...new Set(items.map(i=>i.root))].sort(),'Tất cả môn');options(group,[...new Set(items.map(i=>i.group))].sort(),'Tất cả nhóm');}render();}catch(e){note.textContent=e.message;}
    }
    return{open};
})();
