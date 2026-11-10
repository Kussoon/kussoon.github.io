#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('v2/verification/municipality-boundaries/index.html'),css=read('v2/verification/municipality-boundaries/trial.css'),js=read('v2/verification/municipality-boundaries/trial.js'),renderer=read('v2/progressive-preview/municipality-renderer.js'),rules=read('v2/national/MAINTENANCE_RULES.md');
assert(html.includes('内部境界線だけを比較'),'page must describe a single-variable comparison');
assert(html.includes('正式版の市区町村境界・クイズ表示は変更していません'),'page must disclose trial-only scope');
assert(html.includes('municipality-renderer.js')&&js.includes('renderer.render('),'trial must reuse shared renderer');
assert(rules.includes('|R02 県境・市区町村境|'),'R02 must exist and be applied');
assert(renderer.includes('partitionArcs')&&renderer.includes("setAttribute('class','coastlines')"),'shared renderer must retain separate coastline layer');
assert(css.includes('.land{fill:#f2f0dd;stroke:none}')&&css.includes('.land.outside{fill:#d5dee2}'),'trial fills must remain identical');
assert(css.includes('.borders{stroke:#fff;stroke-width:1.2}')&&css.includes('.candidate .borders{stroke:#657b84;stroke-width:1.1}'),'only candidate shared-boundary style may differ');
assert(css.includes('.coastlines{stroke:#486574;stroke-width:2.4}'),'coastline style must remain unchanged');
assert(css.includes('vector-effect:non-scaling-stroke'),'line widths must not scale with zoom');
assert(js.includes('if(usage[i]>1)shared.push(arcs[i])')&&js.includes('else if(usage[i]===1)outer.push(arcs[i])'),'trial must classify shared and outer arcs exclusively');
assert(js.includes("'01'")&&js.includes("'13'")&&js.includes("'28'")&&js.includes("'34'")&&js.includes("'37'")&&js.includes("'42'")&&js.includes("'46'")&&js.includes("'47'"),'representative prefectures missing');
assert(js.includes("for(const svg of [$('mapCurrent'),$('mapCandidate')])")&&js.includes('syncView()'),'both maps must render together and share viewport');
assert(js.includes("ratio('#657b84',fill)")&&js.includes("ratio('#ffffff','#f2f0dd')"),'contrast ratios must be recorded');
function luminance(hex){const channels=hex.match(/[a-f0-9]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const fill of ['#f2f0dd','#d5dee2','#d8ebf7'])assert(contrast('#657b84',fill)>=3,'candidate line must reach 3:1 against '+fill);
assert(contrast('#ffffff','#f2f0dd')<3,'current white internal line should document its low contrast');
const pages=['v2/verification/municipality-boundaries/index.html','v2/verification/municipality-boundaries/trial.css','v2/verification/municipality-boundaries/trial.js'];
assert(pages.every(file=>fs.existsSync(path.join(root,file))),'independent page files must exist');
console.log('PASS: R02 shared-arc separation, single-variable palette, identical fills/coastline, and candidate 3:1 contrast.');
