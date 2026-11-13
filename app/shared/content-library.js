'use strict';
// A process reads one committed generation. New generations take effect after
// reopening the app, so require caches never mix old and new catalogs.
const fs=require('fs'),path=require('path');let snapshot;
const jsonCache=new Map();
function root(){if(process.env.SEMEKO_CONTENT_HOME)return process.env.SEMEKO_CONTENT_HOME;try{return path.join(require('electron').app.getPath('userData'),'content-library');}catch{return null;}}
function current(){if(snapshot!==undefined)return snapshot;try{snapshot=JSON.parse(fs.readFileSync(process.env.SEMEKO_CONTENT_INDEX||path.join(root(),'active.json'),'utf8'));}catch{snapshot={packs:{}};}return snapshot;}
function snapshotFile(){const file=path.join(root(),'sessions',process.pid+'.json');require('./atomic-json-publish')(file,current());return file;}
function file(logical,fallback){const entry=Object.values(current().packs||{}).map(p=>p.files?.[logical]).find(Boolean);if(entry&&/^[a-f0-9]{64}$/.test(entry.sha256)&&/^(json|gz|png|pdf)$/.test(entry.ext)){const local=path.join(root(),'objects',entry.sha256+'.'+entry.ext);if(fs.existsSync(local))return local;}return fallback;}
function config(relative){return file('config/'+relative,path.join(__dirname,'../config',relative));}
function json(relative){const resolved=config(relative);if(!jsonCache.has(resolved))jsonCache.set(resolved,JSON.parse(fs.readFileSync(resolved,'utf8')));return jsonCache.get(resolved);}
module.exports={root,current,file,config,snapshotFile,json};
