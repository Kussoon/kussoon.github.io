(function(root){'use strict';
const SCHEMA='kussoon-pokefuta-visits',KEY='kussoon.pokefuta.visits.v1',MAX=10000;
function normalize(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/[\u3041-\u3096]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/[\s・／/ー\-]/g,'');}
function validate(value){if(!value||value.schema!==SCHEMA||value.version!==1||!Array.isArray(value.visited)||value.visited.length>MAX)throw Error('対応する訪問記録JSONではありません。');if(!value.visited.every(x=>typeof x==='string'&&/^PF-\d{4,8}$/.test(x)))throw Error('訪問IDの形式が正しくありません。');return [...new Set(value.visited)].sort();}
function pack(ids){return {schema:SCHEMA,version:1,visited:validate({schema:SCHEMA,version:1,visited:[...ids]})};}
function merge(oldIds,newIds,mode){if(!['merge','replace'].includes(mode))throw Error('取込方法が不正です。');return pack(mode==='replace'?newIds:[...oldIds,...newIds]).visited;}
function matches(d,q,pref,visit,visited){const terms=String(q||'').trim().split(/\s+/).filter(Boolean).map(normalize),text=normalize([d.pokemon,d.city,d.facility_name,d.exact_landmark,d.address,d.id].join(' '));return (!pref||d.prefecture===pref)&&terms.every(term=>text.includes(term))&&(visit==='all'||visited.has(d.id)===(visit==='visited'));}
function coords(d){if(['P3','P4'].includes(d.public_stage)&&Number.isFinite(d.lid_lat)&&Number.isFinite(d.lid_lon))return [d.lid_lat,d.lid_lon];if(d.public_stage!=='P0'&&Number.isFinite(d.facility_lat)&&Number.isFinite(d.facility_lon))return [d.facility_lat,d.facility_lon];return null;}
function route(d){const point=coords(d);const dest=['P3','P4'].includes(d.public_stage)&&point?point.join(','):d.prefecture+' '+d.city+' '+d.facility_name;return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest)+'&travelmode=walking';}
function hash(ids){return '#visits='+btoa(JSON.stringify(pack(ids))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromHash(h){if(!h.startsWith('#visits='))return null;if(h.length>250000)throw Error('共有URLが長すぎます。JSONファイルを使ってください。');let s=h.slice(8);if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('共有URLが正しくありません。');s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);return validate(JSON.parse(atob(s)));}
const api={SCHEMA,KEY,validate,pack,merge,matches,normalize,coords,route,hash,fromHash};root.PFCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
