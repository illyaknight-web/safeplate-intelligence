(()=>{
'use strict';
// SAFEPLATE production: automatic recall-entry modal disabled.
// Recall intelligence remains available in the Public View results,
// Recall Center, Food Journey, and Advanced View without interrupting users.
window.__SAFEPLATE_RECALL_ENTRY_ALERT__=true;
const existing=document.getElementById('safeplate-recall-entry');
if(existing) existing.remove();
})();
