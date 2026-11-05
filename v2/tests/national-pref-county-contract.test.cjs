/* Guard public nationwide map contract R03/R07/R11/R12/R13/R18.
 * This static regression is intentionally narrow: it does not substitute
 * for Safari tap testing or geometry/worker browser tests.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('maps/national-municipalities.html');
const progressive=read('v2/progressive-preview/national-progressive-labels.js');
const county=read('v2/progressive-preview/county-overlay.js');
const click=html.match(/\$\('map'\)\.addEventListener\('click',e=>\{([\s\S]*?)\n\}\);/);
assert(click,'Public map click handler exists');
assert(!/goPref\(target\.dataset\.pref\)/.test(click[1]),'Map tap must not navigate to a whole prefecture');
assert(/if\(target\.dataset\.pref\)return;/.test(click[1]),'Prefecture shape is noninteractive on map');
assert(/\$\('pref'\)\.addEventListener\('change'/.test(html),'Prefecture dropdown remains active');
assert(!/results=\[\.\.\.prefMatches/.test(html),'Search does not offer prefecture-only navigation');
assert(/fullNameFor:code=>index\?\.entries\.find/.test(progressive),'Verified full name lookup exposed');
assert(/selectedName=nationalLabels\?\.fullNameFor\(code\)/.test(html),'Popup title prefers county-aware name');
assert(/entry\.fullName=item\.county\+entry\.name/.test(county),'County overlay defines verified full name');
assert(/nationalLabels\?\.fullNameFor\(r\.code\)/.test(html),'Prefecture region picker uses county-aware name');
assert(/indexed\?\.fullName\)region\.fullName=indexed\.fullName/.test(progressive),'Detail selection adopts overlay full name');
assert(/parentName&&result\.offices\.length>1&&\!selectedName\.startsWith\(parentName\)\?parentName\+selectedName:selectedName/.test(html),'Popup heading must not repeat parent municipality');
// R07/R17 example: map label and popup title are both 大阪市鶴見区, not 大阪市鶴見区・大阪市.
const popupHeading=(selectedName,parentName,count)=>parentName&&count>1&&!selectedName.startsWith(parentName)?parentName+selectedName:selectedName;
assert.equal(popupHeading('大阪市鶴見区','大阪市',2),'大阪市鶴見区');
assert.equal(popupHeading('鶴見区','大阪市',2),'大阪市鶴見区');
assert.equal(popupHeading('川辺郡猪名川町','',1),'川辺郡猪名川町');
assert.equal(popupHeading('神戸市中央区','神戸市',2),'神戸市中央区');
console.log('Public nationwide tap and county detail contract: OK');
