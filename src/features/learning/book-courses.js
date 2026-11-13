'use strict';
window.BookCourses=(()=>{
    let dialog,nav,main,courseSelect,title,note,courses=[],current,chapter,pageNumber=1,revision=0,openTicket=0;
    const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
    const T=(vi,en)=>window.BookStudyUI?.language()==='en'?en:vi;
    const button=(text,action)=>{const b=el('button',text);b.type='button';b.className='action-btn';b.onclick=()=>Promise.resolve(action()).catch(e=>note.textContent=e.message);return b;};
    async function call(work){const result=await work;if(!result.ok)throw Error(result.error);return result.data;}
    async function showPage(number){window.BookStudyUI?.invalidate();
        if(!chapter||number<chapter.firstPage||number>chapter.lastPage)return;
        const rev=++revision;pageNumber=number;main.replaceChildren();note.textContent=T('Đang mở trang ','Opening page ')+number+'…';
        try{
            const data=await call(electronAPI.coursePage({id:current.id,page:number}));if(rev!==revision)return;
            const tools=el('div');tools.className='book-page-tools';
            const prev=button('←',()=>showPage(pageNumber-1)),next=button('→',()=>showPage(pageNumber+1));prev.disabled=number===chapter.firstPage;next.disabled=number===chapter.lastPage;
            prev.setAttribute('aria-label',T('Trang trước','Previous page'));next.setAttribute('aria-label',T('Trang sau','Next page'));
            const input=el('input');input.type='number';input.min=chapter.firstPage;input.max=chapter.lastPage;input.value=number;input.setAttribute('aria-label',T('Trang sách','Book page'));input.onchange=()=>{const n=Number(input.value);if(Number.isInteger(n)&&n>=chapter.firstPage&&n<=chapter.lastPage)showPage(n);else input.value=pageNumber;};
            tools.append(prev,input,el('span','/ '+current.pageCount),next);main.append(tools);
            const image=el('img');image.src=data.image;image.alt=current.title+T(' · Trang ',' · Page ')+number;image.className='book-page';main.append(image);
            const text=el('details');text.append(el('summary',T('Văn bản để chọn và sao chép','Selectable original text')));const pre=el('pre',data.text);text.append(pre);main.append(text);
            note.textContent=T('Trang ','Page ')+number+' · '+chapter.title+T(' · Giữ nguyên hình, bảng và công thức của sách',' · Original figures, tables and formulas preserved');
            localStorage.setItem('semeko-book-location',JSON.stringify({id:current.id,chapterId:chapter.id,page:number}));
            await window.BookStudyUI?.reader({book:current,chapter,page:number,image,main});
        }catch(e){if(rev!==revision)return;note.textContent=e.message;main.append(button(T('Thử lại','Retry'),()=>showPage(number)));}
    }
    function exercises(){revision++;main.replaceChildren();title.textContent=(nav.querySelector('[data-chapter].selected')?.dataset.localizedTitle||chapter.title)+T(' — Bài tập',' — Exercises');
        if(!chapter.exercises.length)main.append(el('p',T('Chưa có bài tách riêng trong phần này. Nội dung đầy đủ vẫn có trong các trang sách.','No separate exercises in this section yet. Full content remains available on the book pages.')));
        if(window.BookStudyUI)BookStudyUI.exerciseList(chapter,main,item=>{dialog.close();return ProblemBrowser.openLibrary(item.id,BookStudyUI.language());});
        else for(const item of chapter.exercises){const b=button(item.title,()=>{dialog.close();return ProblemBrowser.openLibrary(item.id);});b.className='oj-result';main.append(b);}
        note.textContent=chapter.exercises.length+T(' bài được tách riêng · Có thể đối chiếu phần bài tập trên trang sách',' separate exercises · Compare with the exercises on the original pages');
    }
    async function selectChapter(value,requestedPage){window.BookStudyUI?.invalidate();
        const rev=++revision;title.textContent=value.title;main.replaceChildren();note.textContent=T('Đang mở chương…','Opening chapter…');
        const result=await call(electronAPI.courseChapter({id:current.id,chapterId:value.id}));if(rev!==revision)return;chapter=result;
        for(const b of nav.querySelectorAll('[data-chapter]'))b.classList.toggle('selected',b.dataset.chapter===chapter.id);
        const tools=document.getElementById('book-chapter-tools');tools.replaceChildren(button(T('Lý thuyết / trang sách','Theory / original pages'),()=>{title.textContent=chapter.title;return showPage(pageNumber>=chapter.firstPage&&pageNumber<=chapter.lastPage?pageNumber:chapter.firstPage);}),button(T('Bài tập (','Exercises (')+chapter.exercises.length+')',exercises));
        if(chapter.sections.length){const jump=el('select');jump.setAttribute('aria-label',T('Mục trong chương','Chapter section'));const placeholder=el('option',T('Đi tới mục trong chương…','Jump to a chapter section…'));placeholder.value='';jump.append(placeholder);for(const section of chapter.sections){const option=el('option',section.title);option.value=section.page;jump.append(option);}jump.onchange=()=>{if(jump.value)showPage(Number(jump.value));};tools.append(jump);}
        await showPage(requestedPage>=chapter.firstPage&&requestedPage<=chapter.lastPage?requestedPage:chapter.firstPage);
    }
    async function selectCourse(id,saved){
        revision++;current=courses.find(c=>c.id===id);nav.replaceChildren();chapter=null;
        for(const c of current.chapters){const b=button(c.title,()=>selectChapter(c));b.className='oj-result';b.dataset.chapter=c.id;b.append(el('small',T('Trang ','Pages ')+c.firstPage+'–'+c.lastPage));nav.append(b);}
        await selectChapter(current.chapters.find(c=>c.id===saved?.chapterId)||current.chapters[0],saved?.page);
    }
    async function open(location){
        const ticket=++openTicket;
        if(!dialog){
            dialog=el('dialog');dialog.id='book-courses';dialog.className='oj-browser';dialog.dataset.i18nPreserve='';dialog.addEventListener('close',()=>{openTicket++;revision++;window.BookStudyUI?.invalidate();});
            const header=el('header');header.className='book-header';header.append(el('h2','Khóa học từ sách'),button('Đóng',()=>{revision++;dialog.close();}));dialog.append(header);
            courseSelect=el('select');courseSelect.setAttribute('aria-label','Chọn khóa học');courseSelect.onchange=()=>selectCourse(courseSelect.value).catch(e=>note.textContent=e.message);dialog.append(courseSelect);
            note=el('p');note.className='book-note';note.setAttribute('role','status');dialog.append(note);
            const body=el('div');body.className='book-body';nav=el('nav');nav.setAttribute('aria-label','Chương và phần sách');const pane=el('section');pane.className='book-pane';title=el('h3');const tools=el('div');tools.id='book-chapter-tools';main=el('main');pane.append(title,tools,main);body.append(nav,pane);dialog.append(body);document.body.append(dialog);
        }
        if(!dialog.open)dialog.showModal();
        try{courses=await call(electronAPI.courseList());courseSelect.replaceChildren();for(const c of courses){const o=el('option',c.title+' · '+c.pageCount+T(' trang',' pages'));o.value=c.id;courseSelect.append(o);}let saved;try{saved=JSON.parse(localStorage.getItem('semeko-book-location'));}catch{}if(location?.bookId){const target=courses.find(c=>c.id===location.bookId),section=target?.chapters.find(c=>location.page>=c.firstPage&&location.page<=c.lastPage);if(section)saved={id:target.id,chapterId:section.id,page:location.page};}courseSelect.value=courses.some(c=>c.id===saved?.id)?saved.id:courses[0].id;
            await window.BookStudyUI?.attach(dialog,{current:()=>current,main:()=>main,message:text=>note.textContent=text,jump:openAt,refresh:open,cancelLoad:()=>{revision++;}});
            if(ticket!==openTicket||!dialog.open)return;await selectCourse(courseSelect.value,saved);}catch(e){note.textContent=e.message;}
    }
    async function openAt(bookId,page){if(!dialog?.open)return open({bookId,page});const book=courses.find(b=>b.id===bookId);if(!book)return;const found=book.chapters.find(c=>page>=c.firstPage&&page<=c.lastPage);if(!found)return;courseSelect.value=bookId;if(current?.id!==bookId)await selectCourse(bookId,{chapterId:found.id,page});else await selectChapter(found,page);}
    document.addEventListener('DOMContentLoaded',()=>{const b=button('▤',open);b.id='btn-book-courses';b.title='Khóa học — 4 sách C/C++';b.setAttribute('aria-label',b.title);document.getElementById('btn-problem-browser').after(b);});
    return{open,openAt};
})();
