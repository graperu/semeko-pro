'use strict';
// Free distribution: no paid certificate and no unattended unsigned installs.
const base=require('./windows-release.cjs'),path=require('path'),cp=require('child_process');
module.exports={...base,beforePack:async()=>{for(const script of ['release-security-check.cjs','verify-offline-runtimes.cjs'])cp.execFileSync(process.execPath,[path.join(__dirname,script)],{stdio:'inherit'});},win:{...base.win,verifyUpdateCodeSignature:false,signExecutable:false,signExts:[],signtoolOptions:undefined},publish:[{provider:'github',owner:'graperu',repo:'semeko-pro-downloads',releaseType:'release'}]};
