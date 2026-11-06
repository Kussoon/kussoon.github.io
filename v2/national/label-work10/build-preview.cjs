'use strict';
// Generate only this noindex candidate from the current official page. Shared
// geometry/office/search/viewport assets are not copied or edited.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),source=fs.readFileSync(path.join(root,'maps/national-municipalities.html'),'utf8');let s=source;
const change=(a,b)=>{if(!s.includes(a))throw Error('Preview injection point changed: '+a.slice(0,65));s=s.replace(a,b);};
change('<link rel="canonical" href="https://kussoon.com/maps/national-municipalities.html">','<meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://kussoon.com/v2/national/label-work10/">');
change('<title>全国市区町村マップ 2026｜Kussoon</title>','<title>Work(10) 全国共通ラベル試作｜Kussoon</title>');
change('</style>', '\n#map [data-progressive-labels],#map [data-v2-labels]{display:none!important}\n.trial-note{padding:10px;border:2px solid #d29b27;background:#fff7de;line-height:1.6}#labelCounts{min-height:1.6em;font-size:13px}\n</style>');
change('<h1>全国市区町村マップ 2026</h1>','<h1>Work(10) 全国共通ラベル試作</h1><p class="trial-note">未採用の比較用ページです。地図・検索・庁舎・操作は正式版の共通エンジンを使用します。文字は画面上15〜18pxに制限し、重なる名前は拡大・検索で表示します。<a href="/maps/national-municipalities.html?pref=28">正式版（兵庫県）</a> ／ <a href="/hyogo/study-all.html">従来兵庫県版</a></p><label><input type="checkbox" id="avoidOverlap" checked>重なり回避（OFFで全地名を表示して比較）</label><p id="labelCounts" aria-live="polite"></p>');
change('<script>\n(()=>', '<script src="/v2/national/label-work10/screen-labels.js?v=work10-1"></script>\n<script>\n(()=>');
change('let nationalLabels=null,nationalView=true;', 'let nationalLabels=null,nationalView=true,labelView=null,labelMetadata=null;');
change("onZoomChange:z=>{$('zoomLevel').textContent=z.toFixed(1)+'倍';if(progressive)nationalLabels?.schedule();}","onZoomChange:z=>{$('zoomLevel').textContent=z.toFixed(1)+'倍';labelView?.update();if(progressive)nationalLabels?.schedule();}");
change('const progressiveStore=', "labelView=KussoonScreenLabels.create({map:$('map'),viewport,readings:()=>$('readingMode').value==='on',declutter:()=>$('avoidOverlap').checked,selected:()=>current?$('region').value:nationalLabels?.selected()||'',onCount:(shown,total)=>{$('labelCounts').textContent='地名 '+shown+' / '+total+'（重なる名前は拡大・検索で表示）';}});window.KussoonLabelWork10=Object.freeze({labels:labelView,viewport});$('avoidOverlap').addEventListener('change',()=>labelView.update());\nconst progressiveStore=");
change('if(progressive&&nationalView&&!current){nationalLabels?.schedule();return;}', 'if(progressive&&nationalView&&!current){labelView.update();nationalLabels?.schedule();return;}');
change('if(quizSession)return;\n // Share', 'if(quizSession){labelView.clear();return;}\n // Share');
const a=s.indexOf(' let positions=null;\n try{',s.indexOf('function drawLabels()')),b=s.indexOf('\n}\nfunction paint(',a);if(a<0||b<0)throw Error('Missing label adapter block');s=s.slice(0,a)+' labelView.setRegions(displayRegions,activeProjection);'+s.slice(b);
change('function paint({refocus=true}={}){\n if(!overview)return;', 'function paint({refocus=true}={}){\n if(!overview)return;\n labelView.clear();');
change('return KussoonV2CountyOverlay.apply(await indexRes.json(),await countyRes.json());','labelMetadata=KussoonV2CountyOverlay.apply(await indexRes.json(),await countyRes.json());return labelMetadata;');
change('onSelection:()=>{dismissedPopupCode=null;renderOfficePopup();}', 'onSelection:()=>{dismissedPopupCode=null;renderOfficePopup();labelView.update();}');
change('nationalLabels.mount(projection);', "nationalLabels.mount(projection);\n   void nationalLabels.ready.then(()=>{if(nationalView&&!current){labelView.setModels(KussoonV2NationalProgressive.models(labelMetadata,projection),'national');}});");
s=s.replace(/src="\/(v2\/[^"?]+\.js)(?:\?[^"]*)?"/g,(all,file)=>{const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12);return 'src="/'+file+'?v='+hash+'"';});
const target=path.join(__dirname,'index.html');if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==s)throw Error('Preview is stale against official source');console.log('PASS preview matches official geometry/UI source plus label-only injections');}else fs.writeFileSync(target,s);
