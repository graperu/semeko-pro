'use strict';
// PDF.js deliberately excludes Electron renderer/utility roles from Node
// detection. This isolated process has Node APIs and no DOM: select its Node
// factories without granting any additional OS or Electron privileges.
Object.defineProperty(process,'type',{value:'browser',configurable:true});
const books=require('./book-courses');let chain=Promise.resolve();
process.parentPort.on('message',event=>{const value=event.data;chain=chain.then(async()=>{try{const data=await books.renderDirect(value.id,value.page);process.parentPort.postMessage({ticket:value.ticket,data});}catch(e){process.parentPort.postMessage({ticket:value.ticket,error:e.message});}});});
