// Verify the original and candidate differ only in the requested UI aspects.
// Usage: node v2/geography/test-ui-comparison.cjs [site-root]
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.resolve(process.argv[2]||".");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const a=read("v2/geography/ui-before-b.html"),b=read("v2/geography/ui-candidate.html"),live=read("v2/geography/index.html");
function onlyOnce(text,old,newText){assert.equal(text.split(old).length,2,"expected once: "+old.slice(0,70));return text.replace(old,newText)}
function breadcrumb(text){return text.match(/function breadcrumb\(node,stage,town\)\{[\s\S]*?\n\}(?=\nfunction externalLinks)/)?.[0]}
const oldBread=breadcrumb(a),newBread=breadcrumb(b);
assert.ok(oldBread&&newBread,"Breadcrumb function missing");
assert.ok(newBread.includes("setAttribute('aria-current','page')"),"Current location not announced");
assert.ok(newBread.includes("stage==='node'")&&newBread.includes("if(town)"),"Breadcrumb stages not preserved");
let expected=onlyOnce(a,".town-grid .reading{font-size:11px}",".town-grid .reading{font-size:13px}");
expected=onlyOnce(expected,oldBread,newBread);
expected=onlyOnce(expected,"<title>世界から町へ｜地域階層ナビゲーション試作｜Kussoon V2</title>","<title>比較案B｜世界から町へ｜Kussoon V2</title>");
expected=onlyOnce(expected,'<p class="pilot">Kussoon 地域階層ナビゲーション｜V2比較試作・検索エンジン登録対象外</p>','<p class="pilot">比較案B（読み仮名13px・現在地の音声案内）｜<a href="/v2/geography/ui-comparison.html">A/B比較ページに戻る</a>｜検索エンジン登録対象外</p>');
assert.equal(b,expected,"B候補に依頼外の差分があります");
let approved=onlyOnce(b,"<title>比較案B｜世界から町へ｜Kussoon V2</title>","<title>世界から町へ｜地域階層ナビゲーション試作｜Kussoon V2</title>");
approved=onlyOnce(approved,'<p class="pilot">比較案B（読み仮名13px・現在地の音声案内）｜<a href="/v2/geography/ui-comparison.html">A/B比較ページに戻る</a>｜検索エンジン登録対象外</p>','<p class="pilot">Kussoon 地域階層ナビゲーション｜B案正式採用（読み仮名13px・現在地の音声案内）｜検索エンジン登録対象外</p>');
assert.equal(live,approved,"正式階層画面はB案と識別用文言以外完全一致する必要があります");
const compare=read("v2/geography/ui-comparison.html");
for(const str of ['name="robots" content="noindex,follow"','id="frameA"','id="frameB"','id="showA"','id="showB"','id="targetCity"','/v2/geography/ui-before-b.html']){
 assert.ok(compare.includes(str),"Comparison UI missing "+str);
}
for(const [name,html] of [["archive-A",a],["candidate-B",b],["current-B",live],["comparison",compare]]){
 const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,name+" JS missing");new vm.Script(script,{filename:name+".js"});
}
console.log("PASS: archived A intact; formally adopted live page equals B candidate except identification");
console.log("PASS: archived A and live B comparison page, noindex, JS syntax");
