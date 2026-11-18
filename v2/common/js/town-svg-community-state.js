/* TOWNMAP-SSOT-001 R-TOWN-00/06/12/21/24/33/34/35.
 * Nationwide region navigation/state transition. Labels, geometry, quizzes,
 * and source-specific fit calculations stay owned by their existing modules.
 * This helper preserves the accepted operation order and DOM text contracts.
 */
(function(root){
 'use strict';
 function transition({stopQuiz,stopBlink,render,updateUI,fit}){
  for(const fn of [stopQuiz,stopBlink,render,updateUI,fit])
   if(typeof fn!=='function')throw new TypeError('地域選択の状態遷移処理が不足しています');
  stopQuiz(false);
  stopBlink();
  render();
  updateUI();
  fit();
 }
 function sync({selectedRegion='',regionLabel,cityLabel,wholeCityCount,activeTownCount,
                toggle,count,reset,buttons}){
  if(typeof selectedRegion!=='string'||typeof regionLabel!=='function'
    ||typeof cityLabel!=='string'||!cityLabel
    ||!Number.isSafeInteger(wholeCityCount)||wholeCityCount<1
    ||!Number.isSafeInteger(activeTownCount)||activeTownCount<0
    ||!toggle||!count||!reset||!buttons||typeof buttons[Symbol.iterator]!=='function')
   throw new TypeError('地域選択UIの入力が不正です');
  const active=Boolean(selectedRegion);
  const title=active?regionLabel(selectedRegion):cityLabel;
  if(typeof title!=='string'||!title.trim())throw new Error('地域名がありません');
  reset.textContent=active?'区域\n全体':'市の\n全体';
  toggle.textContent=(active?title:cityLabel+'全域（'+wholeCityCount+'町名）')+' ▾';
  count.textContent=active?title+'：'+activeTownCount+'町名':'市全域：'+activeTownCount+'町名';
  for(const button of buttons){
   const current=button.dataset.community===selectedRegion;
   button.classList.toggle('active',current);
   button.setAttribute('aria-pressed',String(current));
  }
 }
 const api=Object.freeze({transition,sync});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgCommunityState=api;
})(typeof globalThis!=='undefined'?globalThis:this);
