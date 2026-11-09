'use strict';
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function samples(text){
    // Accept single-problem, explicitly labelled samples only. Never infer expected answers.
    if((text.match(/^\s*Input Format\s*$/gim)||[]).length!==1)return[];
    const labels=[...text.matchAll(/^\s*(Sample Input|Sample Output)(?:\s+(\d+))?\s*$/gim)];const tests=[];
    for(let i=0;i<labels.length;i+=2){const a=labels[i],b=labels[i+1];if(!b||a[1].toLowerCase()!=='sample input'||b[1].toLowerCase()!=='sample output'||(a[2]||'0')!==(b[2]||'0'))return[];
        const input=text.slice(a.index+a[0].length,b.index).trim();let output=text.slice(b.index+b[0].length,labels[i+2]?.index??text.length).split(/^\s*(?:Explanation|Giải thích|Note|Ghi chú)\s*$/im)[0].trim();
        if(!input||!output||/Input Format|Output Format|Constraints|https?:\/\//i.test(input+'\n'+output))return[];
        tests.push({input:input+'\n',output:output+'\n'});
    }return tests;
}
exports.samples=samples;
exports.build=(item,pages,catalog)=>{
    if(pages.every(p=>!p.trim()))throw Error('Tài liệu này gồm ảnh quét, chưa có lớp chữ để tách đề. Cần nhận dạng OCR và kiểm tra lại trước khi tạo bài tập; không thể chạy bài trống.');
    // Word/Wingdings bullets embedded in PDFs are private-use glyphs, not text.
    pages=pages.map(require('../../shared/pdf-text'));
    const text=pages.join('\n\n'),tests=samples(text);
    const headings=[...text.matchAll(/^\s*(?:Câu|Bài)\s+(\d+)\s*[:.]\s*([^\n]+)$/gim)];
    if(headings.length>1){
        const children=headings.map((h,i)=>{
            const body=text.slice(h.index,headings[i+1]?.index??text.length);
            const answer=/^[^\S\n]*(?:[\uE000-\uF8FF•*]\s*)?Đáp án\s*:/im.exec(body);
            const statement=answer?body.slice(0,answer.index):body;
            return{index:i,title:`Bài ${Number(h[1])}. ${h[2].trim()}`,html:'<article class="native-exercise"><div class="native-exercise-body">'+escape(statement.trim())+'</div></article>',referenceAnswer:answer?body.slice(answer.index+answer[0].length).trim():null,tests:samples(statement),mode:/^(Frontend|Backend)$/.test(item.root)?'reading':'stdin'};
        });
        return{provider:'28tech',id:item.id,title:require('../../shared/learning-title')(item.name),url:`https://github.com/${catalog.repository}/blob/${catalog.commit}/`+item.path.split('/').map(encodeURIComponent).join('/'),children,html:'',tests:[],mode:'collection',note:'Chọn từng bài trong nhóm để đọc đề. Đáp án được tách khỏi phần đề.'};
    }
    const reading=/^(Frontend|Backend)$/.test(item.root);
    const html='<article class="native-exercise">'+pages.map((p,i)=>'<section><h3>Trang '+(i+1)+'</h3><div class="native-exercise-body">'+escape(p)+'</div></section>').join('')+'</article>';
    return{provider:'28tech',id:item.id,title:require('../../shared/learning-title')(item.name),number:'',difficulty:item.root,paid:false,tags:[item.group.split('/').slice(-1)[0]],url:`https://github.com/${catalog.repository}/blob/${catalog.commit}/`+item.path.split('/').map(encodeURIComponent).join('/'),html,tests,mode:reading?'reading':'stdin',snippets:{},note:tests.length?`${tests.length} test mẫu trích từ đề gốc. Đối chiếu nếu PDF có công thức hoặc bố cục phức tạp.`:'Đã trích nội dung để đọc trong app; chưa nhận dạng chắc chắn test mẫu. Không tự sinh đáp án.'};
};
