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
// R07/R08/R15/R16/R17/R18/R35/R36: production search-first layout and draggable information popup.
const searchPosition=html.indexOf('<section class="panel" aria-label="地域を探す">');
const mapPosition=html.indexOf('<section class="panel map-panel"');
assert(searchPosition>=0&&mapPosition>searchPosition,'Search and region select must appear before map');
assert(/<link rel="canonical" href="https:\/\/kussoon\.com\/maps\/national-municipalities\.html">/.test(html),'Production canonical URL');
assert(!/noindex|【試作】|正式版には反映していません/.test(html),'Production page has no trial branding');
assert(/id="placeSearch"/.test(html)&&/id="areaSettings"/.test(html),'Search and region picker preserved');
assert(/id="popupReading" class="popup-reading" hidden/.test(html),'Popup has initial-off reading line');
assert(/syncPopupReading\(code,r\)/.test(html),'Popup reading is synced when opening');
assert(/\$\('readingMode'\)\.addEventListener\('change',[\s\S]*?syncPopupReading/.test(html),'Readings update with ON/OFF');
assert(/cursor:ns-resize/.test(html)&&/setPointerCapture\(event\.pointerId\)/.test(html),'Vertical-only popup handle preserved');
assert(/Math\.max\(minimum,Math\.min\(maximum,desired\)\)/.test(html),'Vertical drag bounded to keep handle visible');
assert(/\.popup-scroll\{[^\n]*overflow:auto/.test(html),'Popup body retains independent scrolling');
assert(/id="popupClose"/.test(html),'Popup close control preserved');
// Search / map-only fullscreen / full-card vertical drag: R11/R13/R15/R16/R18/R19/R35.
assert(/placeholder="例: やま、川、岡"/.test(html),'Search placeholder uses short matching examples');
assert(/id="searchResultsRail"[^>]*role="scrollbar"/.test(html),'Search results have an accessible left scrollbar');
assert(/search-results-shell\{position:relative[^\n]*padding-left:18px/.test(html),'Results reserve left gutter for scrollbar');
assert(/syncSearchScrollRail\(\)/.test(html),'Scrollbar thumb synchronizes with results');
assert(/市区町村の位置を押すと吹き出しが出ます/.test(html),'Simple map-use instructions');
assert(/地図内のボタンでよみがなが出せます/.test(html),'Reading-toggle instructions');
assert(/id="mapFullscreen"/.test(html)&&/fullscreenButton\.addEventListener\('click'/.test(html),'Fullscreen map control exists');
assert(!/if\(document\.body\.classList\.contains\('map-screen-mode'\)\)\{\$\('officePopup'\)\.hidden=true;return;\}/.test(html),'Fullscreen mode must not suppress popup rendering');
assert(/body\.map-screen-mode #officePopup,#mapFrame:fullscreen #officePopup\{left:8px;bottom:8px;z-index:9\}/.test(html),'Fullscreen popup appears at bottom-left above map toolbar');
assert(/document\.fullscreenEnabled&&mapFrame\.requestFullscreen/.test(html),'Native fullscreen when supported');
assert(/position:fixed;inset:0;width:100vw;height:100dvh/.test(html),'iPhone uses viewport-sized fallback');
assert(/const handle=popup;/.test(html),'All noninteractive popup surfaces support vertical drag');
assert(/event\.target\.closest\('button,a,input,select,textarea/.test(html),'Links and controls keep their normal taps');
assert(/id="popupScrollDown"/.test(html)&&/syncPopupScrollControls/.test(html),'Overflowing popup has explicit scroll controls');
// R18/R19/R37: code-order results, public-only status and fullscreen popup.
assert(/results\.sort\(\(a,b\)=>String\(a\.code\)\.localeCompare\(String\(b\.code\),'ja',\{numeric:true\}\)\)/.test(html),'Search candidates sort by five-digit municipality code before slicing');
const municipalityCodes=['10209','10208','03201','45203','12205'].sort((a,b)=>a.localeCompare(b,'ja',{numeric:true}));
assert.deepEqual(municipalityCodes,['03201','10208','10209','12205','45203'],'Leading-zero municipality codes sort nationwide');
assert(!html.includes('開発時の比較版</a>'),'Development comparison link omitted from public navigation');
assert(html.includes('読み込みに時間がかかることがあります。'),'Simplified loading notice');
assert(!html.includes('読み込みに時間がかかることがありますが、ご容赦ください。'),'Old loading notice removed');
assert(/new MutationObserver\(syncPublicStatus\)/.test(html),'Routine map status is hidden without removing error/loading status');
assert(/読み込み中[\s\S]*読み込みエラー/.test(html),'Loading and error signals remain visible');
// R13/R14/R37: compact two-button zoom row and top-right fullscreen button.
assert(/<div class="map-zoom-row" role="group"[^>]*>\s*<button type="button" id="mapZoomIn"[^>]*>＋<\/button>\s*<button type="button" id="mapZoomOut"[^>]*>－<\/button>/.test(html),'Zoom controls are side-by-side, plus on the left');
assert(/\.map-zoom-row\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(html),'Zoom control width is split evenly');
assert(/\.map-fullscreen-button\{position:absolute;right:8px;top:8px/.test(html),'Fullscreen control is at top-right');
assert(/body\.map-screen-mode #mapFullscreen,#mapFrame:fullscreen #mapFullscreen\{right:max\(8px,env\(safe-area-inset-right\)\);top:max\(8px,env\(safe-area-inset-top\)\)\}/.test(html),'Fullscreen top-right honors safe-area');
assert(/\.map-toolbar button\{[^\n]*font-size:14px/.test(html),'Map toolbar labels are larger');
assert(/@media\(max-width:500px\)\{\.map-toolbar\{width:88px\}\.map-toolbar button\{min-height:44px;font-size:13px\}/.test(html),'Mobile controls remain legible');
console.log('Public nationwide tap and county detail contract: OK');
