const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const official=fs.readFileSync(path.join(__dirname,'../../../maps/national-municipalities.html'),'utf8');
assert(s.includes('<script src="/hyogo/v2-regions.js"></script>'));
assert(s.includes('nationalLabels.anchors().filter(m=>targets.has(m.code))'));
assert(s.includes('if(bounds.length!==targets.size)'));
assert(s.includes('study-region-view #map [data-progressive-labels] [data-national-code]:not(:is('));
assert(s.includes('}else if(matchedStudyPref){'));
assert(s.includes("document.body.classList.remove('study-region-view')"));
assert(!s.includes('KussoonScreenLabels'));
for(const name of ['/v2/progressive-preview/national-progressive-labels.js','/v2/progressive-preview/prefecture-colors.js','/v2/progressive-preview/map-viewport.js'])assert(s.includes(name)&&official.includes(name),name);
for(const m of s.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)){if(m[1].trim())new Function(m[1]);}
console.log('Region focus trial static contract: OK');
