'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os');
const {_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'plans/artifacts/i18n');
const technical=new Set(['AC','EOF','GNU','VTK','OK','Alt','Ctrl','Shift','Esc','Cascadia Code','Consolas','Fira Code','JetBrains Mono','Chrome','Codeforces','LeetCode','HackerRank','Codeforces · LeetCode · HackerRank','Competitive Companion','Discord','Electron','GitHub','Google','Java','Python','Linux','Node','Semeko Pro','Tiếng Việt','Dark Molokai','Dracula','Kawaii Dark','Kawaii Light','Monokai','Nord','Sakura','Solarized Dark','Allman','Horstmann','Lisp','Pico','Ratliff','Stroustrup','Whitesmith','latest','latestmajor','Sum: 15','contest','src','tests','main.cpp','utils.h','input.txt','int','main','main()','cout <<','hello','"Hi"','<iostream>','#include','#include <iostream>...']);
let app,page;const errors=[],samples=new Set();
async function collect(){for(const text of await page.evaluate(()=>{
 const out=new Set(),skip='script,style,input,textarea,.monaco-editor,.xterm,pre,code,.code-line,.tcf-json-highlight,.tab-name,.explorer-item-name,.cat-name,#oj-statement,#oj-problem-title,.sdbg-name,.sdbg-val,[data-i18n-preserve]';
 function visit(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){const el=n.nodeType===1?n:n.parentElement;if(el?.closest(skip))continue;if(n.nodeType===3){if(/[A-Za-z]{2}/.test(n.data))out.add(n.data.trim());}else{for(const key of ['title','placeholder','aria-label']){const text=n.getAttribute(key);if(text&&/[A-Za-z]{2}/.test(text))out.add(text);}if(n.shadowRoot)visit(n.shadowRoot);}}}visit(document.body);return [...out];
}))samples.add(text);}
(async()=>{fs.mkdirSync(OUT,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-vi-coverage-'))],cwd:ROOT,env});
 for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
 page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>{newFile('cpp');openSettings();});
 await collect();
 await page.locator('.settings-tab[data-tab="compiler"]').click();
 for(const ext of ['cpp','c','py','java','cs']){await page.evaluate(ext=>syncCompilerSettingsLanguage(ext),ext);await collect();}
 await page.evaluate(()=>ThemeMarketplace.openMarketplace());await collect();
 await page.evaluate(()=>{ThemeMarketplace.closeMarketplace();ThemeCustomizer.open('monokai');});await collect();
 for(const panel of ['syntax','backgrounds','advanced']){await page.locator('[data-tcf-panel="'+panel+'"]').click();await collect();}
 await page.evaluate(()=>ThemeCustomizer.close(true));
 await page.evaluate(()=>LocalHistory.showUntitledHistoryModal(App.tabs.find(t=>t.id===getPreferredTabId())));await collect();
 await page.evaluate(()=>{LocalHistory.hideHistoryModal();showNewFileMenu({clientX:100,clientY:100,preventDefault(){}});});await collect();
 await page.evaluate(()=>{tabContextMenu?.remove();App.settings.appearance.language='vi';UILanguage.apply();});
 await page.evaluate(async()=>{App.settings.appearance.language='en';UILanguage.apply();closeSettings();await ensureMonaco();App.editor.focus();App.editor.trigger('i18n-test','editor.action.showContextMenu',{});});
 await page.waitForTimeout(80);
 const editorMenu=await page.locator('.monaco-menu .action-label').allTextContents();
 for(const text of editorMenu)if(text.trim())samples.add(text.trim());
 await page.evaluate(()=>{App.settings.appearance.language='vi';UILanguage.apply();});
 assert((await page.locator('.monaco-menu .action-label').allTextContents()).includes('Sao chép'));
 await page.keyboard.press('Escape');
 const pending=await page.evaluate(values=>values.filter(text=>UILanguage.translate(text)===text),[...samples]);
 // Already-Vietnamese feature labels and source filenames are not untranslated English.
 const missing=pending.filter(t=>!/[đĐăĂâÂêÊôÔơƠưƯ\u1EA0-\u1EF9]/.test(t)&&!/^untitled(?:_\d+)?\.(?:c|cpp|py|java|cs)$/.test(t)&&!technical.has(t)&&!['Semeko','ms','Markdown'].includes(t)&&!/^\.[a-z]+$/.test(t)&&!t.startsWith('#include ')&&!t.startsWith('> g++ ')&&!/^(?:Ctrl|Shift|Alt)[+]/.test(t)&&!/^\d+(?:px|ms)$/.test(t));
 fs.writeFileSync(path.join(OUT,'coverage.json'),JSON.stringify({checked:samples.size,missing},null,2));assert.deepStrictEqual(missing,[],'Untranslated application UI copy');
 const dynamic=await page.evaluate(()=>['Testing 2/5...','Downloading: 42%','Test 3: WA','Saved Settings.cpp','Revert Primary text','11,481 problems · Codeforces · select one to preview'].map(s=>({source:s,translated:UILanguage.translate(s)})));
 assert(dynamic.every(x=>x.source!==x.translated));
 await page.evaluate(()=>{setStatus('Testing 2/5...');const span=document.createElement('span');span.className='sdbg-val';span.id='vi-value-probe';span.textContent='Run';document.body.append(span);});
 await page.waitForTimeout(100);assert.strictEqual(await page.locator('#vi-value-probe').textContent(),'Run');
 await page.evaluate(()=>openSettings());await page.screenshot({path:path.join(OUT,'settings-vi.png')});
 await page.evaluate(()=>ThemeCustomizer.open('monokai'));await page.waitForTimeout(100);
 const preview=await page.locator('.tcf-preview-host').evaluate(host=>({run:host.shadowRoot.querySelector('.run-main').textContent.trim(),code:host.shadowRoot.querySelector('.code').textContent}));
 assert.strictEqual(preview.run,'Chạy');assert(preview.code.includes('using namespace'));await page.screenshot({path:path.join(OUT,'theme-vi.png')});
 await page.evaluate(()=>{App.settings.appearance.language='en';UILanguage.apply();});
 assert.strictEqual(await page.locator('#tcf-dialog-title').innerText(),'Theme Customizer');
 assert.strictEqual(await page.locator('.tcf-preview-host').evaluate(host=>host.shadowRoot.querySelector('.run-main').textContent.trim()),'Run');
 assert.deepStrictEqual(errors,[]);console.log('PASS '+samples.size+' UI text/tooltip samples, all language panels, marketplace, theme panels, shadow preview, history, file menus, dynamic messages and English round trip');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
