/* Kussoon V2 — strictly verified reading lookup for 2026 municipality polygons.
 * The existing 2021-era localgovjp CC0 readings are optional and may be stale.
 * Match by official five-digit code AND exact visible name; for designated
 * city wards, require the full name and an explicit "city ward" reading.
 * A missing or renamed municipality never receives a guessed reading.
 */
(function(global){
'use strict';
const kana=s=>String(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\s　]/g,'');
const validReading=s=>/^[ぁ-ゖー]+$/.test(s);
// 2024-01-01 Hamamatsu ward reorganization: verified officially by the city.
// https://www.city.hamamatsu.shizuoka.jp/ksh/imf/tkdk.html
// https://www.city.hamamatsu.shizuoka.jp/ksh/faq/2.html
const reorganizedWards=Object.freeze({
 '22138':{name:'浜松市中央区',reading:'はままつし ちゅうおうく'},
 '22139':{name:'浜松市浜名区',reading:'はままつし はまなく'},
 '22140':{name:'浜松市天竜区',reading:'はままつし てんりゅうく'}
});
function verify(region,entry){
 if(!region||!entry||!/^[0-9]{5}$/.test(String(region.code||'')))return null;
 const display=String(region.name||''),full=String(entry.name||''),raw=String(entry.reading||'').trim();
 if(!display||!full||!raw)return null;
 if(full===display){
  const reading=kana(raw);
  return validReading(reading)?{reading,parts:[{name:display,reading}],verifiedName:full}:null;
 }
 // The 2026 TopoJSON builder retains N03_004 (parent city) for designated
 // wards, losing the N03_005 ward field. Restore a source-explicit ward name
 // only when the FIVE-DIGIT ward code agrees and its full source name begins
 // with precisely the geographic parent city. Never synthesize a ward name.
 if(display.endsWith('市')&&full.startsWith(display)){
  const ward=full.slice(display.length),p=raw.split(/\s+/);
  if(!ward.endsWith('区')||!ward||p.length!==2)return null;
  const cityReading=kana(p[0]),wardReading=kana(p[1]);
  if(!validReading(cityReading)||!validReading(wardReading))return null;
  return {reading:cityReading+wardReading,parts:[{name:display,reading:cityReading},{name:ward,reading:wardReading}],verifiedName:full,displayName:ward};
 }
 // Only a designated-city ward may match an unambiguous full name suffix.
 // e.g. 神戸市中央区 -> 中央区, with "こうべし ちゅうおうく".
 if(!display.endsWith('区')||!full.endsWith(display))return null;
 const city=full.slice(0,full.length-display.length),p=raw.split(/\s+/);
 if(!city.endsWith('市')||p.length!==2)return null;
 const cityReading=kana(p[0]),wardReading=kana(p[1]);
 if(!validReading(cityReading)||!validReading(wardReading))return null;
 return {reading:cityReading+wardReading,parts:[{name:city,reading:cityReading},{name:display,reading:wardReading}],verifiedName:full};
}
function attach(regions,source){
 const items=source?.items||{},stats={total:regions.length,matched:0,missing:0,mismatched:0};
 const mapped=regions.map(region=>{
  const entry=items[region.code]||reorganizedWards[region.code],found=verify(region,entry);
  if(found){stats.matched++;return {...region,name:found.displayName||region.name,reading:found.reading,readingParts:found.parts};}
  if(entry)stats.mismatched++;else stats.missing++;
  return {...region,reading:'',readingParts:[]};
 });
 return {regions:mapped,stats};
}
global.KussoonV2ReadingBridge=Object.freeze({kana,verify,attach});
})(window);
