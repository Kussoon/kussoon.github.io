(function(){
'use strict';
const frame=document.getElementById('mapPreview');
const current=document.getElementById('currentMode');
const trial=document.getElementById('trialMode');
const note=document.getElementById('modeNote');
const base='/maps/national-municipalities.html';
let mode='trial',loadId=0;
function setMode(value){
 mode=value;
 current.setAttribute('aria-pressed',String(value==='current'));
 trial.setAttribute('aria-pressed',String(value==='trial'));
 note.textContent=value==='trial'
  ?'試作表示では、タイトル左の点をつかんで上下移動できます。右の山形ボタンで本文を折り畳み、×で閉じます。折り畳み中に別の自治体を選ぶと、その情報を見られるよう展開します。'
  :'現行表示です。地図や選択状態は試作表示と共通です。試作表示に切り替えると、新しい操作部品が使えます。';
 const id=++loadId;
 frame.src=base+(value==='trial'?'?popupControlsTrial=1':'');
 frame.onload=()=>{if(id===loadId&&value==='trial')injectTrialScript();};
}
function injectTrialScript(){
 try{
  const doc=frame.contentDocument;
  if(!doc||doc.getElementById('popupControlsTrialScript'))return;
  const s=doc.createElement('script');
  s.id='popupControlsTrialScript';
  s.src='/v2/national/popup-controls.js?v=20261110-trial1';
  s.onload=()=>{frame.dataset.trialReady='true';};
  s.onerror=()=>{note.textContent='試作操作スクリプトを読み込めませんでした。ページを再読み込みしてください。';};
  doc.head.append(s);
 }catch(error){note.textContent='比較ページを初期化できませんでした。';}
}
async function waitFor(test,timeout=120000){
 const until=Date.now()+timeout;
 while(Date.now()<until){try{if(test())return;}catch{}await new Promise(r=>setTimeout(r,100));}
 throw Error('地図データの準備が終わりませんでした。');
}
async function selectCase(prefCode,regionCode){
 const win=frame.contentWindow,doc=frame.contentDocument;
 if(!win||!doc)throw Error('地図を読み込めませんでした。');
 const pref=doc.getElementById('pref'),region=doc.getElementById('region');
 pref.value=prefCode;pref.dispatchEvent(new win.Event('change',{bubbles:true}));
 await waitFor(()=>Array.from(region.options).some(o=>o.value===regionCode));
 region.value=regionCode;region.dispatchEvent(new win.Event('change',{bubbles:true}));
 await waitFor(()=>doc.querySelector('#map .chosen[data-code="'+regionCode+'"]')&&!doc.getElementById('officePopup').hidden);
}
current.addEventListener('click',()=>setMode('current'));
trial.addEventListener('click',()=>setMode('trial'));
document.querySelectorAll('[data-code]').forEach(button=>button.addEventListener('click',async()=>{
 button.disabled=true;
 try{await selectCase(button.dataset.pref,button.dataset.code);}
 catch(error){note.textContent=error.message;}
 finally{button.disabled=false;}
}));
setMode('trial');
window.KussoonPopupTrial={selectCase};
})();