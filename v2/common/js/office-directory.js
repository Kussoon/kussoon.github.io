/* Normalized office data and popup rendering; no map geometry or selection state. */
(function(root){
'use strict';
const safeUrl=value=>{
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch(_){return null;}
};
function resolve(directory,code){
 const region=directory?.regions?.[String(code)];
 if(!region)return {region:null,offices:[]};
 return {region,offices:region.officeIds.map(id=>({id,...directory.offices[id]}))};
}
function destination(office){
 return office?.status==='verified'&&office.address?
  'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(office.name+' '+office.address):null;
}
function render(document,container,result,label){
 container.replaceChildren();
 const element=(tag,className,text)=>{
  const node=document.createElement(tag);node.className=className;node.textContent=text;return node;
 };
 const action=(title,url,context)=>{
  const href=safeUrl(url),node=element(href?'a':'span','',title);
  if(href){node.href=href;node.target='_blank';node.rel='noopener noreferrer';}
  else node.setAttribute('aria-disabled','true');
  node.setAttribute('aria-label',context+'：'+title);return node;
 };
 const offices=result.offices.length?result.offices:[{name:'市役所・役場／区役所',status:'missing'}];
 for(const office of offices){
  const section=element('section','popup-facility','');
  section.append(element('h3','popup-office',office.name));
  section.append(element('p','popup-address',
   (office.postalCode?'〒'+office.postalCode+'\n':'郵便番号：未確認\n')+(office.address||'所在地：未確認')));
  const actions=element('div','popup-actions','');
  actions.append(action('庁舎案内',office.officialPage,office.name),action('ここへ行く',destination(office),office.name));
  section.append(actions);
  if(office.status!=='verified')section.append(element('p','popup-note','この施設の情報は確認待ちです。'));
  container.append(section);
 }
 const common=element('div','popup-actions','');
 common.append(action('公式サイト',result.region?.official,label),action('Wikipedia',result.region?.wikipedia,label));
 container.append(common);
}
const api={safeUrl,resolve,destination,render};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.KussoonOfficeDirectory=api;
})(typeof window==='object'?window:globalThis);
