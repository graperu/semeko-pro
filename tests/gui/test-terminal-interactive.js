'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
const programs={
 c:'#include <stdio.h>\nint main(){long a,b;printf("First: ");fflush(stdout);scanf("%ld",&a);printf("Second: ");fflush(stdout);scanf("%ld",&b);printf("Sum=%ld\\n",a+b);}',
 cpp:'#include <iostream>\nint main(){long a,b;std::cout<<"First: "<<std::flush;std::cin>>a;std::cout<<"Second: "<<std::flush;std::cin>>b;std::cout<<"Sum="<<a+b<<"\\n";}',
 py:'a=int(input("First: "));b=int(input("Second: "));print("Sum="+str(a+b))',
 java:'import java.util.*;public class Main{public static void main(String[]args){Scanner s=new Scanner(System.in);System.out.print("First: ");System.out.flush();long a=s.nextLong();System.out.print("Second: ");System.out.flush();long b=s.nextLong();System.out.println("Sum="+(a+b));}}',
 cs:'using System;class Program{static void Main(){Console.Write("First: ");long a=long.Parse(Console.ReadLine());Console.Write("Second: ");long b=long.Parse(Console.ReadLine());Console.WriteLine("Sum="+(a+b));}}'
};
(async()=>{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-stdin-'))],env,cwd:ROOT});let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());
for(const [ext,code]of Object.entries(programs)){
 await page.evaluate(async({ext,code})=>{newFile(ext);setTabText(App.tabs.find(t=>t.id===getPreferredTabId()),code);App.settings.execution.autoSendInput=false;await buildRun();},{ext,code});
 await page.waitForFunction(()=>currentRun && runOutputText(currentRun).includes('First:'));
 await page.locator('#terminal').click({position:{x:20,y:20}});await page.waitForFunction(()=>document.activeElement?.id==='terminal-in');
 await page.keyboard.type('17');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>currentRun && runOutputText(currentRun).includes('Second:'));
 await page.locator('#terminal-in').fill('-5');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>!App.isRunning);assert((await page.evaluate(()=>App.outputByTab[getPreferredTabId()].text)).includes('Sum=12'));assert(await page.locator('#terminal-in').isDisabled());console.log('PASS '+ext+' interactive prompts, click output to type, Enter, negative input, clean exit');
}
await page.evaluate(async()=>{newFile('py');setTabText(App.tabs.find(t=>t.id===getPreferredTabId()),'import sys\nprint(repr(sys.stdin.read()))');await buildRun();});await page.locator('#terminal-in').fill('  Run  ');await page.keyboard.press('Enter');await page.locator('#btn-eof').click();await page.waitForFunction(()=>!App.isRunning);assert((await page.evaluate(()=>App.outputByTab[getPreferredTabId()].text)).includes("'  Run  \\n'"));console.log('PASS whitespace-preserving input and EOF');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
