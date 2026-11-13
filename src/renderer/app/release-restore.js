'use strict';
// Run before course/progress modules read localStorage. Only an explicit restore
// stages this file; ordinary launches leave storage untouched.
try{const values=window.electronAPI?.releaseBrowserRestore();if(values)for(const [key,value]of Object.entries(values))if(typeof value==='string'&&!/token|password|secret|api.?key|session.?bridge/i.test(key))localStorage.setItem(key,value);}catch(error){console.error('Could not restore UI state',error.message);}
