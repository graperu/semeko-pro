const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const acquire=require('../../app/shared/process-lock'),file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'semeko-owner-')),'owner');
const release=acquire(file);assert(release);assert.strictEqual(acquire(file),null);
const moduleFile=require.resolve('../../app/shared/process-lock');
const code=`const lock=require(${JSON.stringify(moduleFile)})(${JSON.stringify(file)});process.stdout.write(lock?'acquired':'blocked');if(lock)lock();`;
assert.strictEqual(execFileSync(process.execPath,['-e',code],{encoding:'utf8'}),'blocked');release();
assert.strictEqual(execFileSync(process.execPath,['-e',code],{encoding:'utf8'}),'acquired');assert(!fs.existsSync(file));
console.log('PASS exclusive queue ownership across processes and clean release');
