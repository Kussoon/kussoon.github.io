/* Guard public nationwide map contract R03/R07/R11/R12/R13/R18.
 * This static regression is intentionally narrow: it does not substitute
 * for Safari tap testing or geometry/worker browser tests.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
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
// R05/R18/R19: selection menus, name visibility and island-inclusive extent.
const prefGrid=html.match(/<div class="choice-options prefecture-options" id="prefChoices"/);
assert(prefGrid,'Prefectures use custom downward list');
assert(/\.prefecture-options\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/.test(html),'Prefectures display in 3 columns');
assert(/\.choice-options\{margin-top:6px/.test(html),'Both picker lists expand below their trigger');
assert(/id="prefTrigger"[^>]*>都道府県を選ぶ/.test(html),'No prefecture field heading, use initial prompt');
assert(/id="regionTrigger"[^>]*disabled>次に市区町村を選択/.test(html),'Municipality prompt reads next select municipality');
assert(/id="pref" hidden aria-hidden="true"/.test(html)&&/id="region" hidden aria-hidden="true"/.test(html),'Native selects retain internal app values without separate headings');
assert(/function buildChoices\(type\)/.test(html)&&/native\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/.test(html),'Custom picker selection uses existing navigation handlers');
assert(/syncChoicePickers\(\);\s*updateSearch\(\);/.test(html),'Picker labels follow changes from map and search');
assert(/id="showNames" checked hidden aria-hidden="true"/.test(html),'Surrounding-label toggle is hidden but preserved for legacy state');
assert(/selected=\$\('region'\)\.value,all=true,readings=/.test(html),'Region labels are always shown outside quizzes');
assert(/id="nationExtent" hidden aria-hidden="true" tabindex="-1"><option value="all" selected>/.test(html),'Full nation extent including remote islands is fixed');
assert(!html.includes('全国主要域（北海道〜沖縄）'),'Former limited extent is no longer selectable');
assert(!html.includes('都道府県は下の「地域・表示範囲を選んで移動」で選べます。'),'Redundant introductory instruction removed');
assert(html.indexOf('市区町村の位置を押すと吹き出しが出ます。')<html.indexOf('吹き出しは上下に移動でき')&&html.indexOf('吹き出しは上下に移動でき')<html.indexOf('地図内のボタンでよみがなが出せます'),'Popup guidance follows selection guidance');
assert(html.indexOf('2026年版行政区域を使用しています')<html.indexOf('class="page-links bottom-links"'),'Site navigation is at bottom after boundary disclaimer');
// R13/R14/R19: UI layout and municipality-focused zoom-out recovery.
assert(/\.search-and-choose\{display:grid;grid-template-columns:minmax\(0,1fr\)/.test(html),'Search and region controls are vertically stacked');
assert(/<div class="search-and-choose">[\s\S]*?<div class="search-area">[\s\S]*?<div id="areaSettings"/.test(html),'Search and region controls remain in the same section');
assert(!html.includes('まず都道府県を選択'),'Outdated municipality prompt is absent');
assert(!html.includes('id="locatorPanel"')&&!html.includes("drawOverview($('locator')"),'Unneeded national locator widget and render are removed');
const viewportSource=read('v2/progressive-preview/map-viewport.js');
assert(/setMinZoom\(value\)/.test(viewportSource),'Shared viewport provides per-instance minimum zoom');
assert(/viewport\.setMinZoom\(Math\.max\(0\.000001,minZoom\)\)/.test(html),'Focused municipality allows zooming out beyond local 1x');
assert(/viewport\.setMinZoom\(1\)/.test(html),'Nationwide/non-focused views restore original 1x minimum');
assert(/minZoom=Math\.min\(1,W\/\(prefWidth\+W\*\.25\),H\/\(prefHeight\+H\*\.25\)\)/.test(html),'Minimum zoom uses real prefecture projected bounds');
const viewportWindow={};
const viewportSvg={style:{},setAttribute(){},addEventListener(){},removeEventListener(){}};
const viewportDocument={addEventListener(){},removeEventListener(){}};
vm.runInNewContext(viewportSource,{window:viewportWindow,document:viewportDocument});
const viewport=viewportWindow.KussoonV2MapViewport.init({svg:viewportSvg});
viewport.zoomOut();
assert.equal(viewport.view().w,850,'Ordinary view never shrinks beyond 1x');
viewport.setContentBounds({minX:-3000,minY:-2400,maxX:3000,maxY:2400});
viewport.setMinZoom(.15);
viewport.zoomOut();
assert.ok(viewport.view().w>850,'Municipality-focused view zooms back out from 1x');
viewport.setMinZoom(1);
assert.equal(viewport.view().w,850,'Restoring original 1x limit clamps the view');
viewport.reset();
assert.equal(viewport.view().w,850,'Reset keeps original view');
// R18/R19 (#302): permanent region controls and no wasted footer gap.
assert(/<div id="areaSettings" class="region-picker"><h2 class="picker-heading">地域・表示範囲を選んで移動<\/h2>/.test(html),'Region controls stay visible without a collapsible summary');
assert(!/<details id="areaSettings"/.test(html),'Region controls must not collapse');
assert(/\.search-and-choose #areaSettings \.picker-heading\{font:inherit;font-weight:700/.test(html),'Picker heading matches search label font');
assert(!html.includes('読み仮名や5桁コードでも検索できます。同名の自治体は都道府県名で確認してください。'),'Long search helper removed');
assert(/main\{max-width:960px;margin:auto;padding:16px 12px 8px\}/.test(html),'Main bottom spacing is compact');
assert(/@media\(max-width:600px\)\{main\{padding:10px 8px 8px\}/.test(html),'Small-screen bottom spacing is compact');
// R03/R04/R18: municipality names are a lightweight first-stage picker.
assert(/prefectureNamesFor:pref=>index\?\.entries\.filter\(r=>r\.pref===pref\)/.test(progressive),'Prefecture name index filters only selected prefecture');
assert(/void nationalLabels\.ready\.then\(\(\)=>\{[\s\S]*?const choices=nationalLabels\.prefectureNamesFor\(code\)/.test(html),'Picker reads loaded nationwide label index before details');
assert(/region\.disabled=false;\s*syncChoicePickers\(\)/.test(html),'Municipality dropdown activates at name-index stage');
const earlyChoices=html.indexOf('void nationalLabels.ready.then(');
const heavyGeometry=html.indexOf('await progressiveStore.get(code)',earlyChoices);
assert(earlyChoices>=0&&heavyGeometry>earlyChoices,'Lightweight list starts before 20m geometry loading');
assert(!/if\(progressive\)entry\.offices=await getOffices\(code\)/.test(html),'Office data no longer blocks municipality choice');
assert(/void getOffices\(code\)\.then\(offices=>\{[\s\S]*?renderOfficePopup\(\)/.test(html),'Office information updates popup independently');
assert(/if\(!current\)\{if\(pendingPrefSelection\?\.id===requestId\)pendingPrefSelection\.code=\$\('region'\)\.value;return;\}/.test(html),'Early municipality selections are retained until detail arrives');
assert(/const wanted=pendingPrefSelection\?\.id===id\?pendingPrefSelection\.code:selectedCode/.test(html),'Loading detail honors selected municipality');
assert(/if\(id!==requestId\|\|current\)return;\s*const choices=nationalLabels\.prefectureNamesFor/.test(html),'Obsolete or already-complete picker response is ignored');
assert(/<li>区域の点滅は、もう一度押すと止まります。<\/li><li>地図内のボタンでよみがなが出せます。<\/li>/.test(html),'Repeated-tap flashing hint appears immediately before reading hint');
// R07/R08/R17: all municipal map labels follow the same full-name contract.
const labelSource=read('v2/shared/place-labels.js');
const adapterSource=read('v2/shared/established-label-adapter.js');
assert(/regions:displayRegions,project:activeProjection/.test(html),'Both prefecture label engines receive full-name display models');
assert(/labelName:full/.test(html),'Prefecture detail supplies full-name field');
assert(/region\.labelName\|\|region\.fullName\|\|region\.name/.test(labelSource),'Visible labels use full names, including city prefixes');
assert(/region\.labelName\|\|region\.fullName\|\|region\.name/.test(adapterSource),'Collision and containment widths measure full municipality names');
assert(/name:r\.fullName\|\|r\.name/.test(progressive),'Nationwide labels use the formal name');
const nationalApi={};
new Function('window',progressive)(nationalApi);
const sample=JSON.parse(read('v2/progressive-preview/label-index.json'));
nationalApi.KussoonV2NationalProgressive.applyDisplayNames(sample);
const named=Object.fromEntries(sample.entries.map(item=>[item.code,item]));
assert.equal(named['01106'].fullName,'札幌市南区','Sapporo southern ward full name');
assert.equal(named['14101'].fullName,'横浜市鶴見区','Yokohama Tsurumi ward full name');
assert.equal(named['13101'].fullName,'東京都千代田区','Tokyo Chiyoda ward full name');
assert.equal(named['13104'].fullName,'東京都新宿区','Tokyo Shinjuku ward full name');
assert.equal(named['13123'].fullName,'東京都江戸川区','Tokyo Edogawa ward full name');
const tokyoWards=sample.entries.filter(r=>/^131(0[1-9]|1[0-9]|2[0-3])$/.test(r.code));
assert.equal(tokyoWards.length,23,'All 23 Tokyo special wards are present');
assert(tokyoWards.every(r=>r.fullName==='東京都'+r.name),'All Tokyo special wards show 東京都 prefix');
assert(tokyoWards.every(r=>r.parts?.[0]?.name==='東京都'&&r.parts?.[0]?.reading==='とうきょうと'),'Tokyo ward reading parts include prefixed reading');
assert(sample.entries.filter(r=>r.parts?.length===2&&r.code.startsWith('01')&&r.name.endsWith('区')).every(r=>r.fullName.startsWith('札幌市')),'All Sapporo wards carry city prefix');
assert(sample.entries.filter(r=>r.parts?.length===2&&r.code.startsWith('14')&&r.name.endsWith('区')).every(r=>r.fullName.includes('市')),'Kanagawa designated-city wards carry their own city prefix');
assert(/readingPartsFor\(r\.code\)/.test(html),'Tokyo prefix reading is retained in prefecture details');
// Full-name rendering must work even if an older drawing library reads .name.
assert(/return \{\.\.\.r,name:full,labelName:full\}/.test(html),'Default prefecture label models provide full name in legacy and new fields');
assert(/return \{\.\.\.r,name:full,labelName:full,readingParts:parts/.test(html),'Tokyo ward model includes full name and verified readings');
for(const asset of ['place-labels.js','established-label-adapter.js','national-progressive-labels.js']){
 assert(html.includes(asset+'?v=307'),'Updated asset gets a new cache key: '+asset);
}
// R05/R07/R08: two-line city/ward (and verified county/town) labels, even readings OFF.
const placeLabelsSource=read('v2/shared/place-labels.js');
const adapterText=read('v2/shared/established-label-adapter.js');
const adminSource=read('v2/progressive-preview/administrative-labels.js');
assert(/const split=Array\.isArray\(region\.readingParts\)/.test(placeLabelsSource),'Prefecture label renderer recognizes two verified parts');
assert(/split\?\[\s*\{text:split\[0\]\.name,small:false,y:-9\},\s*\{text:split\[1\]\.name,small:false,y:11\}/.test(placeLabelsSource),'Reading OFF renders city and ward on two rows');
assert(/split\?\[\s*\{text:split\[0\]\.name,size,y:-9\},\s*\{text:split\[1\]\.name,size,y:11\}/.test(adapterText),'Collision/territory fitting uses both non-reading rows');
assert(/readingPartsFor\(r\.code\)/.test(html)&&/parts\.map\(p=>p\.name\)\.join\(''\)===full/.test(html),'Prefecture models reuse verified name parts');
const administrative={};
new Function('window',adminSource)(administrative);
const twoRows=administrative.KussoonAdministrativeLabels.rows;
const wardModel={name:'札幌市中央区',fullName:'札幌市中央区',major:'札幌市',
 readingParts:[{name:'札幌市',reading:'さっぽろし'},{name:'中央区',reading:'ちゅうおうく'}]};
assert.deepEqual(Array.from(twoRows(wardModel)),['札幌市','中央区'],'Nationwide city and ward split without duplicated city');
assert.deepEqual(Array.from(twoRows({...wardModel,readingParts:null})),['札幌市','中央区'],'Cached source fallback does not duplicate city name');
const tokyoModel={name:'東京都新宿区',fullName:'東京都新宿区',readingParts:[{name:'東京都',reading:'とうきょうと'},{name:'新宿区',reading:'しんじゅくく'}]};
assert.deepEqual(Array.from(twoRows(tokyoModel)),['東京都','新宿区'],'Tokyo special ward splits into prefecture and ward');
assert.deepEqual(Array.from(twoRows({name:'川辺郡猪名川町',fullName:'川辺郡猪名川町',county:'川辺郡',readingParts:[{name:'川辺郡',reading:'かわべぐん'},{name:'猪名川町',reading:'いながわちょう'}]})),['川辺郡','猪名川町'],'County and municipality use two lines');
for(const asset of ['place-labels.js','established-label-adapter.js','national-progressive-labels.js','administrative-labels.js']){
 assert(html.includes(asset+'?v=307'),'Two-line label code uses fresh cache key for '+asset);
}
// R14/R19: return buttons precede the map, without modifying their IDs or handlers.
const breadcrumbOffset=html.indexOf('id="breadcrumb"');
const nationOffset=html.indexOf('id="nationBtn"');
const prefectureOffset=html.indexOf('id="prefBtn"');
const frameOffset=html.indexOf('id="mapFrame"');
assert(breadcrumbOffset>=0&&breadcrumbOffset<nationOffset&&nationOffset<prefectureOffset&&prefectureOffset<frameOffset,'Nationwide and prefecture return buttons are above the map');
assert.equal((html.match(/id="nationBtn"/g)||[]).length,1,'Exactly one nationwide return button');
assert.equal((html.match(/id="prefBtn"/g)||[]).length,1,'Exactly one prefecture return button');
assert(!html.includes('都道府県は上の選択欄から指定できます。地図を拡大して市区町村をタップしてください。'),'Redundant navigation instructions removed');
assert(!html.includes('吹き出しは上部の帯で上下に移動でき、×で閉じられます。'),'Obsolete popup-drag guidance removed');
// A region-specific learning page uses the unchanged nationwide renderer.
assert(/new URLSearchParams\(location\.search\)\.get\('pref'\)/.test(html),'Prefecture deep link accepts pref query parameter');
assert(/manifest\.entries\.find\(item=>item\.pref===requestedPref\)/.test(html),'Only prefectures present in the live manifest are accepted');
assert(/if\(matchedPref\)\{paint\(\);void goPref\(requestedPref\);\}/.test(html),'Recognized prefectures open the existing goPref path');
assert(/else\{paint\(\);\$\('status'\)/.test(html),'Unknown query values keep national initial display');
console.log('Public nationwide tap and county detail contract: OK');
