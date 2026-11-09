'use strict';
// Normalize only extracted PDF text, never editor source, stdin or program output.
module.exports=text=>String(text||'').replace(/[\uE000-\uF8FF]/g,'•').replace(/\u00ad/g,'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
