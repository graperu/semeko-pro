'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-math-'))],cwd:ROOT,env});let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const result=await page.evaluate(async()=>{
const array=String.raw`\begin{array}{c|cc} & j=1 & j=2 \\ \hline i=1 & 0 & 5 \\ i=2 & 3 & 0 \end{array}`;
const fixtures=[
 ['codeforces','<div class="problem-statement"><p>Players and rounds.</p><script type="math/tex; mode=display">'+array+'</script><p>Answer $$$16\\oplus 32=48$$$.</p><pre>1 2\n3 4</pre></div>'],
 ['codeforces','<div class="problem-statement"><p>'+array+'</p><p>Answer 16\\oplus 32\\oplus 48.</p></div>'],
 ['leetcode','<p>Value \\(x_i^2 + \\frac{1}{2}\\).</p>'],
 ['hackerrank','<p>Value $a_1 + a_2$.</p>'],
 ['codeforces','<div class="problem-statement"><script type="math/tex">\\href{javascript:alert(1)}{bad}</script><img src="https://evil.example/x" onerror="alert(1)"><script>alert(1)</script><p>Safe.</p></div>']
];
fixtures.push(['codeforces','<div class="problem-statement"><p>'+String.raw`For the set \mathcal{A} = \{0, 2, 3\}: \{0, 2, 3\} \to \{0, 1, 3\}. Values of \operatorname{mex} are 2, 0, 2, 1.`+'</p><pre>'+String.raw`\{raw sample\}`+'</pre></div>']);
const out=[];
fixtures.push(['leetcode','<p>'+String.raw`Giá trị $x^2$ và mex ^{\text{*}}, \ldots, \oplus, \cdot, \Rightarrow.`+'</p>']);
fixtures.push(['codeforces','<div class="problem-statement"><p>'+String.raw`Giá trị của mex ^{\text{*}} của tập hợp; x_{i}^{2}, \frac{a}{b}, \sqrt{n}, \mathbb{N}.`+'</p><pre>'+String.raw`x_{i}^{2} ^{\text{*}}`+'</pre><code>file_name ^{raw}</code></div>']);
for(const [provider,html]of fixtures){const safe=await ProblemBrowser.safeStatement(html,provider);const div=document.createElement('div');div.innerHTML=safe;out.push({provider,math:div.querySelectorAll('.katex').length,array:div.querySelectorAll('.mtable').length,scripts:div.querySelectorAll('script,[onerror],a[href^="javascript:"]').length,pre:div.querySelector('pre')?.textContent,errors:div.querySelectorAll('.katex-error').length,html:safe});}
const target=document.getElementById('oj-statement');target.innerHTML=out.at(-1).html;if(target.textContent.includes('$$$'))throw Error('Raw math delimiters remain');document.getElementById('oj-browser').showModal();return out;
});
assert(result[0].math>=2);assert(result[0].array>=1);assert(result[1].math>=2);assert(result[1].array>=1);assert.strictEqual(result[0].pre,'1 2\n3 4');for(const r of result){assert.strictEqual(r.scripts,0);assert.strictEqual(r.errors,0);}assert(result[2].math>0);assert(result[3].math>0);await page.evaluate(()=>document.fonts.ready);assert.deepStrictEqual(errors,[]);
assert(result.at(-1).math>=5);assert.strictEqual(result.at(-1).pre,String.raw`x_{i}^{2} ^{\text{*}}`);
const legacy=await page.evaluate(()=>{const root=document.getElementById('oj-statement').cloneNode(true);for(const n of root.querySelectorAll('.katex,pre,code'))n.remove();return{prose:root.textContent,code:document.querySelector('#oj-statement code').textContent};});assert(!legacy.prose.includes('\\'));assert(legacy.prose.includes('Giá trị của mex'));assert.strictEqual(legacy.code,'file_name ^{raw}');
const cacheRoundtrip=await page.evaluate(async()=>{
 const tex=String.raw`a_1,a_2,\ldots,a_n;\quad -10^4\le a_i\le10^4;\quad \min\left(\frac{a_i}{a_j},3\cdot10^5\right);\quad \sum_{i=1}^{n}\oplus a_i`;
 const rows=[];
 for(const provider of ['codeforces','leetcode','hackerrank','28tech']){
  let html='<p>Chỉ số và số mũ: \\('+tex+'\\)</p>';if(provider==='codeforces')html='<div class="problem-statement">'+html+'</div>';
  const fresh=await ProblemBrowser.safeStatement(html,provider),old=document.createElement('div');old.innerHTML=fresh;for(const el of old.querySelectorAll('[style]'))el.removeAttribute('style');
  let serialized=old.innerHTML;for(let i=0;i<2;i++)serialized=await ProblemBrowser.safeStatement(provider==='codeforces'?'<div class="problem-statement">'+serialized+'</div>':serialized,provider);
  const restored=document.createElement('div');restored.innerHTML=serialized;rows.push({provider,math:restored.querySelectorAll('.katex').length,source:restored.querySelector('annotation')?.textContent,positioned:restored.querySelectorAll('.vlist [style]').length,errors:restored.querySelectorAll('.katex-error').length,html:serialized});
 }
 document.getElementById('oj-statement').innerHTML=rows.map(r=>'<h3>'+r.provider+'</h3>'+r.html).join('');return{rows,tex};
});for(const row of cacheRoundtrip.rows){assert.strictEqual(row.math,1);assert.strictEqual(row.source,cacheRoundtrip.tex);assert(row.positioned>0);assert.strictEqual(row.errors,0);}
const extra=await page.evaluate(async()=>{
 const cases=[String.raw`Giá trị \oplus_{i=1}^{n} (ans(i,j)\cdot i\cdot j), 1 \le t \le 10^{4}, 0 \lt n.`,String.raw`Số lớn nhất \max, \min\left(\dfrac{a_i}{a_j},3\cdot10^{5}\right), \ldots.`,String.raw`Ký tự $$$s_i=\replacedVerb { L }$$$ và $x^2$ cùng ^{\text{*}}.`];
 const rows=[];for(const provider of ['codeforces','leetcode','hackerrank','28tech'])for(const prose of cases){let html='<p>'+prose+'</p>';if(provider==='codeforces')html='<div class="problem-statement">'+html+'</div>';const safe=await ProblemBrowser.safeStatement(html,provider),el=document.createElement('div');el.innerHTML=safe;const math=el.querySelectorAll('.katex').length,errors=el.querySelectorAll('.katex-error').length;for(const n of el.querySelectorAll('.katex'))n.remove();rows.push({provider,math,errors,remaining:el.textContent});}return rows;
});for(const row of extra){assert(row.math>0);assert.strictEqual(row.errors,0);assert(!row.remaining.includes('\\'));assert(!row.remaining.includes('$$'));}
fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/statement-math.png')});console.log('PASS fresh/legacy tables, XOR, raw starred superscript, subscript, fractions, radicals, math alphabets; Vietnamese prose, code and sample bytes unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
