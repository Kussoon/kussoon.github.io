'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const files=[
 'v2/shared/test-map-viewport.cjs','v2/shared/test-map-viewport-touch-pan.cjs',
 'v2/shared/test-municipality-renderer.cjs','v2/shared/test-place-labels.cjs',
 'v2/shared/test-municipality-quiz.cjs','v2/shared/test-established-label-adapter.cjs',
 'v2/shared/test-reading-bridge.cjs','v2/national/test-2026-single-stroke.cjs',
 'v2/national/test-2026-overview-focus-toolbar.cjs','v2/national/test-2026-mobile-popup.cjs',
 'v2/national/test-density-contract.cjs','v2/national/test-shared-border-contract.cjs',
 'v2/common/js/test-office-directory-data.cjs','v2/tools/shared-topology/test-national-navigation.mjs',
 'v2/tests/national-2026-data.test.cjs',
 'v2/tests/audit-ledger.test.cjs',
];
// office-directory.test.cjs is a separate known-failing legacy suite (T01).
// It was not wired into existing CI. Its dedicated follow-up adds it here once
// obsolete pre-#93 expectations have been corrected; no test is skipped/deleted.
for(const file of files){
 const result=spawnSync(process.execPath,[file],{cwd:path.resolve(__dirname,'../..'),stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
console.log('PASS all '+files.length+' national contract commands');
