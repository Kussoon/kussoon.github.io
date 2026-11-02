/* Validate verified V2 municipality office datasets before nationwide expansion. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../../data/offices');
const files=fs.readdirSync(root).filter(f=>/^\d{2}\.json$/.test(f)).sort();
assert(files.length>0,'No office files were found');
let regionCount=0,officeCount=0,verified=0;
const perPref=[];
for(const file of files){
 const data=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const pref=file.slice(0,2);
 assert.equal(data.prefecture,pref,file+' prefecture');
 assert.equal(data.schemaVersion,2,file+' schema');
 assert(data.regions&&data.offices,file+' collections');
 const ids=new Set();
 for(const [code,reg] of Object.entries(data.regions)){
  assert(/^\d{5}$/.test(code)&&code.startsWith(pref),code+' invalid region code');
  assert(reg.name&&Array.isArray(reg.officeIds)&&reg.officeIds.length,code+' missing name or officeIds');
  for(const id of reg.officeIds){
   assert(data.offices[id],code+' missing referenced office '+id);
   ids.add(id);
  }
  if(reg.parentCode){
   assert(data.regions[reg.parentCode],code+' parent missing');
   assert.equal(reg.kind,'ward',code+' parentCode on non-ward');
  }
  for(const key of ['official','wikipedia']){
   if(reg[key])assert(/^https:\/\/[^\s]+$/i.test(reg[key]),code+' invalid '+key);
  }
  regionCount++;
 }
 for(const [id,office] of Object.entries(data.offices)){
  assert(ids.has(id),id+' unreferenced office');
  assert(['verified','missing','pending'].includes(office.status),id+' unknown status');
  if(office.status==='verified'){
   assert(typeof office.name==='string'&&office.name.trim(),id+' missing name');
   assert(/^\d{3}-\d{4}$/.test(office.postalCode||''),id+' invalid postal code');
   assert(typeof office.address==='string'&&office.address.trim(),id+' missing address');
   verified++;
  }
  officeCount++;
 }
 perPref.push(pref+':'+Object.keys(data.regions).length);
}
console.log('PASS municipality office registry: '+files.length+' prefectures, '+regionCount+' regions, '+officeCount+' offices ('+verified+' verified)');
console.log(perPref.join(' '));
