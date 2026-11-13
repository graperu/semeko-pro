'use strict';
module.exports=()=>{if(!(process.env.CSC_LINK||process.env.WIN_CSC_LINK||process.env.AZURE_TENANT_ID))throw Error('Public release blocked: configure a Windows code-signing certificate (CSC_LINK / WIN_CSC_LINK) or approved signing service. Never distribute an unsigned auto-update.');};
