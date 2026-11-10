'use strict';
// Approved internal-boundary contrast regression. This checks style tokens and
// preserves the single shared-arc layer, existing coastline, quiz feedback and pulse.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const quiz=read('v2/municipalities/shared/quiz.css');
const national=read('maps/national-municipalities.html');
const renderer=read('v2/progressive-preview/municipality-renderer.js');
const rules=read('v2/national/MAINTENANCE_RULES.md');
assert.match(quiz,/.borders\\{fill:none;stroke:#657b84;stroke-width:1.1;vector-effect:non-scaling-stroke/,'shared quiz internal boundary style');
assert.match(national,/.borders\\{fill:none;stroke:#657b84;stroke-width:1.1;vector-effect:non-scaling-stroke/,'public nationwide internal boundary style');
assert.match(quiz,/.coastlines\\{fill:none;stroke:#486574;stroke-width:2.4;vector-effect:non-scaling-stroke/,'quiz coastline must remain distinct and unchanged');
assert.match(national,/.coastlines\\{fill:none;stroke:#486574;stroke-width:2.4;vector-effect:non-scaling-stroke/,'nationwide coastline must remain unchanged');
assert.match(quiz,/.land\\.correct\\{fill:#8ed6a7\\}\\.land\\.wrong\\{fill:#f0aaa0\\}/,'quiz correct/incorrect colors must remain unchanged');
assert.match(quiz,/hyogoQuiz2Pulse[\\s\\S]*fill:#ffcd52[\\s\\S]*fill:#d9dea5/,'quiz pulse colors must remain unchanged');
assert.match(renderer,/const borders=element\\('path'\\)/,'one shared boundary layer must remain');
assert.match(renderer,/borders\\.setAttribute\\('pointer-events','none'\\)/,'boundary layer must not block taps');
assert.match(renderer,/fragment\\.append\\(borders\\)/,'boundary path must be appended once');
assert.match(renderer,/coastlines/,'coastline layer stays independent');
assert.match(quiz,/stroke:none/,'municipality polygons remain fill-only');
assert.match(rules,/R02[^\\n]*#657b84[^\\n]*#486574/,'R02 must record approved style and separate coastline');
function luminance(hex){const c=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const fill of ['#f2f0dd','#d5dee2','#d8ebf7'])assert(contrast('#657b84',fill)>=3,'neutral map contrast target against '+fill);
for(const fill of ['#b4d9ec','#f1d5a5','#bee0c1','#dcc8ea','#f1c2c2','#d9dea5','#c9cfed','#bce3db'])assert(contrast('#657b84',fill)>=2.8,'fixed prefecture palette contrast must stay near 3:1 against '+fill);
assert(contrast('#657b84','#f0aaa0')>=2.3,'quiz feedback fill contrast should remain materially stronger than the former white border');
console.log('PASS: adopted #657b84/1.1px shared borders, independent #486574/2.4px coastlines, no polygon strokes, fixed quiz feedback, WCAG neutral target and fixed-prefecture palette contrast.');
