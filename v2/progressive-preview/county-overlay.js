/* Isolated progressive preview: verified county/town parent rows from historical N03.
 * Preserve source index and only overlay exact code+name matched data.
 */
(function(global){'use strict';
function apply(index, overlay){
 if(index?.year!==2026||index?.count!==1905||!Array.isArray(index.entries))throw Error('Unexpected label index');
 if(overlay?.matched!==922||!overlay.entries||Object.keys(overlay.entries).length!==922)throw Error('County overlay incomplete');
 const seen=new Set();
 for(const entry of index.entries){
  const item=overlay.entries[entry.code];
  if(!item)continue;
  if(item.name!==entry.name||!item.county?.endsWith('郡')||!/[町村]$/.test(entry.name)||!/^[ぁ-ゖー]+$/.test(item.countyReading))throw Error('County identity mismatch '+entry.code);
  if(seen.has(entry.code))throw Error('Duplicate county '+entry.code);
  seen.add(entry.code);
  entry.county=item.county;
  entry.major=item.county;
  entry.fullName=item.county+entry.name;
  if(entry.reading&&entry.parts?.length){
   const child=entry.parts[entry.parts.length-1];
   if(child.name!==entry.name||!child.reading)throw Error('Child reading mismatch '+entry.code);
   entry.parts=[{name:item.county,reading:item.countyReading},child];
   entry.reading=item.countyReading+child.reading;
  }
 }
 if(seen.size!==922)throw Error('County coverage mismatch '+seen.size);
 return index;
}
global.KussoonV2CountyOverlay=Object.freeze({apply});
})(window);
