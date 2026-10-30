/* Nationwide V2 administrative readings, independent of map geometry.
 * Reading source: code4fukui/localgovjp (CC0); county readings separate.
 * Strictly match the official 5-digit municipality code AND expected name.
 */
(function(global){
 'use strict';
 const kana=s=>String(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96))
   .replace(/[\s　]/g,'');
 function attach(models,source,countySource){
  const items=source?.items||{},counties=countySource?.readings||{};
  return models.map(model=>{
   const entry=items[model.code];
   if(!entry)throw Error('読み仮名未収録：'+model.code+' '+model.name);
   const full=(model.major?.endsWith('市')?model.major:'')+model.name;
   if(entry.name!==full)throw Error('自治体名と読みデータが一致しません：'+model.code+' '+full+'≠'+entry.name);
   let parts;
   if(model.major?.endsWith('市')){
    const p=entry.reading.trim().split(/\s+/);
    if(p.length!==2)throw Error('市と区の読みが分離されていません：'+entry.name);
    parts=[{name:model.major,reading:kana(p[0])},{name:model.name,reading:kana(p[1])}];
   }else if(model.county){
    const countykana=counties[model.county];
    if(!countykana)throw Error('郡名の読みが未収録：'+model.county);
    parts=[{name:model.county,reading:kana(countykana)},{name:model.name,reading:kana(entry.reading)}];
   }else{
    parts=[{name:model.name,reading:kana(entry.reading)}];
   }
   if(parts.some(p=>!p.reading||!/^[ぁ-ゖー]+$/.test(p.reading)))
    throw Error('読み仮名に不正文字：'+model.name);
   return {...model,readingParts:parts,reading:parts.map(p=>p.reading).join('')};
  });
 }
 global.KussoonNationalReadings={attach,kana};
})(window);
