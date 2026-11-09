'use strict';
// Preserve the original PDF layout (including figures), with extracted text
// available separately for translation. Never infer test cases from PDF columns.
module.exports=async(bytes,options={})=>{
 const {createCanvas}=require('@napi-rs/canvas'),pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const fontDir=require('path').join(require('path').dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts').replace(/\\/g,'/')+'/';
 const task=pdf.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,disableFontFace:true,standardFontDataUrl:fontDir});
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 try{
  const doc=await task.promise;if(doc.numPages>30)throw Error('PDF statement exceeds 30 pages');
  const pages=[];
  for(let i=options.firstPage||1;i<=Math.min(options.lastPage||doc.numPages,doc.numPages);i++){
   const page=await doc.getPage(i),viewport=page.getViewport({scale:1.4}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
   await page.render({canvasContext:canvas.getContext('2d'),viewport,canvas}).promise;
   const content=await page.getTextContent();let text='';for(const item of content.items)text+=(item.str||'')+(item.hasEOL?'\n':' ');
   pages.push('<section><img alt="Original PDF page '+i+'" src="'+canvas.toDataURL('image/png')+'"><details><summary>Văn bản trang '+i+' — dùng để dịch</summary><p>'+escape(text).replace(/\n/g,'<br>')+'</p></details></section>');
  }
  return '<div class="problem-statement" data-pdf-statement="true">'+pages.join('')+'</div>';
 }finally{await task.destroy();}
};
