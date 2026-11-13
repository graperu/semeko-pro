'use strict';
// A real Chrome profile owned by Semeko, never the user's default Chrome profile.
// Chrome stores cookies/password-manager data; credentials are not copied to UI.
const {app}=require('electron'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const live=new Map(),pending=new Map();
function profile(id){if(!/^\d+$/.test(String(id)))throw Error('Invalid account identity');return path.join(app.getPath('userData'),'platform-chrome',String(id));}
function executable(){return[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).map(p=>path.join(p,'Google/Chrome/Application/chrome.exe')).find(p=>fs.existsSync(p));}
async function attach(file){const lines=fs.readFileSync(file,'utf8').trim().split(/\r?\n/),port=Number(lines[0]);if(!Number.isInteger(port)||port<1||port>65535||!/^\/devtools\/browser\/[A-Za-z0-9-]+$/.test(lines[1]||''))throw Error('Chrome is not ready');return require('playwright-core').chromium.connectOverCDP('ws://127.0.0.1:'+port+lines[1],{timeout:2000});}
async function connect(id){
 const existing=live.get(String(id));if(existing?.isConnected())return existing;if(pending.has(String(id)))return pending.get(String(id));
 const task=(async()=>{const dir=profile(id),file=path.join(dir,'DevToolsActivePort');fs.mkdirSync(dir,{recursive:true});let browser;
  try{browser=await attach(file);}catch{}
  if(!browser){const exe=executable();if(!exe)throw Error('Chưa tìm thấy Google Chrome. Cài Chrome rồi thử lại.');const child=spawn(exe,['--user-data-dir='+dir,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--no-first-run','--no-default-browser-check','about:blank'],{detached:true,stdio:'ignore',windowsHide:true});let failure;child.on('error',e=>failure=e);child.unref();const deadline=Date.now()+30000;while(Date.now()<deadline&&!browser){if(failure)throw failure;await new Promise(r=>setTimeout(r,350));try{browser=await attach(file);}catch{}}}
  if(!browser)throw Error('Không kết nối được Chrome dành cho Semeko. Đóng cửa sổ Chrome của Semeko rồi thử lại.');live.set(String(id),browser);browser.on('disconnected',()=>{if(live.get(String(id))===browser)live.delete(String(id));});return browser;
 })().finally(()=>pending.delete(String(id)));pending.set(String(id),task);return task;
}
async function context(id){return(await connect(id)).contexts()[0];}
async function open(id,provider,url){
 const origin='https://'+(provider==='codeforces'?'codeforces.com':'leetcode.com');const ctx=await context(id),page=await ctx.newPage();try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});}catch(e){if(e.name!=='TimeoutError'){await page.close().catch(()=>{});throw e;}}await page.bringToFront();
 return{transport:'chrome',page,isDestroyed:()=>page.isClosed(),focus:()=>page.bringToFront(),close:()=>page.close().catch(()=>{}),on:(event,fn)=>{if(event==='closed')page.on('close',fn);},loadURL:u=>page.goto(u,{waitUntil:'domcontentloaded',timeout:45000}),webContents:{getURL:()=>page.url(),executeJavaScript:script=>{if(new URL(page.url()).origin!==origin)throw Error('Trang đã chuyển khỏi nền tảng chính thức. Hoàn tất đăng nhập rồi thử lại.');return page.evaluate(script);},on:()=>{},setWindowOpenHandler:()=>{}}};
}
async function request(id,provider,url,options){const expected='https://'+(provider==='codeforces'?'codeforces.com':'leetcode.com');if(new URL(url).origin!==expected)throw Error('Invalid platform URL');const ctx=await context(id),headers={...options.headers};const page=ctx.pages().find(p=>p.url().startsWith(expected+'/'));if(page)headers['User-Agent']=await page.evaluate(()=>navigator.userAgent);if(provider==='leetcode'&&options.method==='POST'){const token=(await ctx.cookies(expected)).find(c=>c.name==='csrftoken');if(token)headers['x-csrftoken']=token.value;headers.Referer=expected+'/';}const response=await ctx.request.fetch(url,{method:options.method||'GET',headers,data:options.body,maxRedirects:0,timeout:30000});try{if(!response.ok())throw Error('Nền tảng trả HTTP '+response.status());return await response.json();}finally{await response.dispose();}}
async function logout(id,provider){const ctx=await context(id),host=provider==='codeforces'?'codeforces.com':'leetcode.com';for(const cookie of await ctx.cookies())if(cookie.domain===host||cookie.domain.endsWith('.'+host))await ctx.clearCookies({name:cookie.name,domain:cookie.domain,path:cookie.path});}
async function openExternal(url){const u=new URL(url);if(u.origin!=='https://github.com'||u.pathname!=='/login/device')throw Error('Invalid GitHub verification URL');const exe=executable();if(!exe)return require('electron').shell.openExternal(url);await new Promise((resolve,reject)=>{const child=spawn(exe,[url],{detached:true,stdio:'ignore',windowsHide:true});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});}
module.exports={profile,open,request,logout,openExternal,active:id=>live.get(String(id))?.isConnected()||false};
