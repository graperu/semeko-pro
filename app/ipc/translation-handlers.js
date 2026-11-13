'use strict';
const {ipcMain}=require('electron');
const service=require('../services/competitive/statement-translation');
module.exports=()=>{
    for(const action of ['start','pause','info'])ipcMain.handle('translation-bulk-'+action,async(_,options)=>{try{return{ok:true,data:await require('../services/competitive/bulk-translation')[action](action==='start'?{hackerRank:options?.hackerRank===true}:undefined)};}catch(e){return{ok:false,error:e.message};}});
    ipcMain.handle('translation-text',async(event,value)=>{try{return{ok:true,data:await service.translate(value.texts,require('../services/competitive/bulk-translation').modelForSender(event.sender.id),false,value.targetLanguage||'vi')};}catch(e){return{ok:false,error:e.message};}});
    for(const [channel,work]of Object.entries({'translation-info':()=>service.info(),'translation-save':value=>service.save(value),'translation-remove':()=>service.remove()})){
        ipcMain.handle(channel,async(_,value)=>{try{return{ok:true,data:await work(value||{})};}catch(e){return{ok:false,error:e.message};}});
    }
};
