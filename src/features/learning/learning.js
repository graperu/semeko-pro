'use strict';
window.Learning=(()=>{
    let dialog,list,content,language,mode,note,selected=0,progress={},ready,queue=Promise.resolve();
    const data=window.LearningCurriculum;
    const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
    const key=(topic,ext)=>ext+':'+topic.id;
    function save(update){const task=queue.then(async()=>{const next=update(progress);const result=await electronAPI.stateWrite('learning-progress',{version:1,progress:next});if(result?.success===false)throw Error(result.error||'Không lưu được tiến độ');progress=next;render();});queue=task.catch(()=>{});return task;}
    function button(text,action){const b=el('button',text);b.type='button';b.className='action-btn';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){note.textContent=e.message;showToast(e.message,'error');}finally{b.disabled=false;}};return b;}
    function section(title,text){content.append(el('h3',title),el('p',text));}
    function render(){
        if(!list)return;list.replaceChildren();content.replaceChildren();const ext=language.value;
        note.textContent=`${data.topics.filter(t=>progress[key(t,ext)]?.read).length}/${data.topics.length} bài đã đọc · ${data.topics.filter(t=>progress[key(t,ext)]?.solved).length}/${data.topics.length} bài tập đạt toàn bộ test`;
        if(mode.value==='resources'){
            content.append(button('Bài tập luyện tập',()=>window.TechLibrary.open()));
            list.append(el('p','Tài liệu bên ngoài cần kết nối Internet. Các bài học trong app dùng được ngoại tuyến.'));
            for(const r of data.resources[ext]){const item=el('article');item.append(el('h3',r.title),el('p',r.description),button('Mở tài liệu chính thức',async()=>{await electronAPI.openExternalLink(r.url);}));content.append(item);}return;
        }
        for(const [i,t] of data.topics.entries()){
            const p=progress[key(t,ext)]||{};const b=button(`${p.solved?'✓ ':''}${i+1}. ${t.title}`,()=>{selected=i;render();});b.className='learning-lesson'+(selected===i?' selected':'');b.setAttribute('aria-current',String(selected===i));
            const status=el('small',`${t.level} · ${p.read?'Đã đọc':'Chưa đọc'} · ${p.solved?'Đã đạt test':'Chưa đạt test'}`);b.append(status);list.append(b);
        }
        const t=data.topics[selected];content.append(el('h2',`${selected+1}. ${t.title}`));section('Mục tiêu và kiến thức',t.theory);section(ext==='cpp'?'Cú pháp C++':'Cú pháp Python',t.syntax[ext]);
        section('Bài tập thực hành',t.task);section('Điểm dễ sai',t.pitfall);
        const actions=el('div');actions.className='learning-actions';
        actions.append(button('Mở bài tập có test',()=>start(t,ext,false)),button('Thử code ví dụ',()=>start(t,ext,true)),button('Đánh dấu đã đọc',()=>save(current=>({...current,[key(t,ext)]:{...current[key(t,ext)],read:true}}))));content.append(actions);
        const details=el('details');details.append(el('summary','Xem code ví dụ và cách giải'));const pre=el('pre',t[ext]);pre.dataset.i18nPreserve='';details.append(pre);content.append(details);
        const examples=el('div');examples.className='learning-samples';for(const [i,test]of t.tests.entries()){const box=el('article');box.append(el('h4',`Test ${i+1}`),el('p','Đầu vào'),el('pre',test[0]),el('p','Kết quả mong đợi'),el('pre',test[1]));examples.append(box);}content.append(examples);
        content.append(el('p','Bài tập có test cố định. Bấm Chạy để kiểm tra; chỉ đạt toàn bộ test mới được đánh dấu hoàn thành. Bộ test học tập không chứng minh chương trình đúng với mọi đầu vào.'));
        const nav=el('div');nav.className='learning-actions';if(selected>0)nav.append(button('Bài trước',()=>{selected--;render();}));if(selected<data.topics.length-1)nav.append(button('Bài tiếp',()=>{selected++;render();}));content.append(nav);
    }
    async function start(topic,ext,example){
        if(isBuilding||App.isRunning||isBatchTesting)throw Error('Hãy dừng chương trình đang chạy trước khi mở bài học.');
        const starter=example?topic[ext]:ext==='cpp'?'#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() {\n    // TODO: Doc du lieu, xu ly va in ket qua.\n    return 0;\n}\n':'# TODO: Doc du lieu, xu ly va in ket qua.\n';
        await handleProblemReceived({name:`Học ${ext==='cpp'?'C++':'Python'} - ${topic.title}`,url:`semeko://learn/${ext}/${topic.id}`,group:'Học lập trình',fixedTests:true,learningId:key(topic,ext),learningExample:example,tests:topic.tests.map(([input,output])=>({input,output}))},{newTab:true,extension:ext,starter});
        dialog.close();showToast('Đã mở bài học với test cố định. Bấm Chạy để kiểm tra.','info');
    }
    async function record(tab,problem,results){
        await ready;if(!problem?.learningId||problem.learningExample||!results.length)return;
        const ext=fileExtension(tab.name),topic=data.topics.find(t=>key(t,ext)===problem.learningId);if(!topic||results.length!==topic.tests.length)return;
        if(results.every(r=>r.status==='AC'))await save(current=>({...current,[problem.learningId]:{...current[problem.learningId],read:true,solved:true,completedAt:new Date().toISOString()}}));
    }
    async function open(){try{await ready;render();if(!dialog.open)dialog.showModal();}catch(e){showToast(e.message,'error');}}
    function init(){
        ready=electronAPI.stateRead('learning-progress').then(doc=>{progress=doc?.progress&&typeof doc.progress==='object'&&!Array.isArray(doc.progress)?doc.progress:{};});
        dialog=el('dialog');dialog.id='learning-center';dialog.dataset.i18nPreserve='';
        const header=el('header');header.append(el('h2','Học lập trình'),button('Đóng',()=>dialog.close()));dialog.append(header);
        const tools=el('div');tools.className='learning-tools';language=el('select');language.setAttribute('aria-label','Ngôn ngữ học');for(const [v,label]of [['cpp','C++'],['py','Python']]){const o=el('option',label);o.value=v;language.append(o);}mode=el('select');mode.setAttribute('aria-label','Nội dung học');for(const [v,label]of [['lessons','Lộ trình học'],['resources','Thư viện tài liệu']]){const o=el('option',label);o.value=v;mode.append(o);}language.onchange=mode.onchange=render;tools.append(language,mode);dialog.append(tools);
        note=el('p');note.setAttribute('role','status');dialog.append(note);const body=el('div');body.className='learning-body';list=el('nav');list.setAttribute('aria-label','Danh sách bài học');content=el('main');body.append(list,content);dialog.append(body);document.body.append(dialog);
        const launch=button('Học lập trình',open);launch.id='btn-learning';launch.title='Học lập trình';launch.classList.add('oj-open-btn');document.getElementById('btn-problem-browser').after(launch);ready.catch(e=>showToast(e.message,'error'));
    }
    document.addEventListener('DOMContentLoaded',init);return{open,record};
})();
