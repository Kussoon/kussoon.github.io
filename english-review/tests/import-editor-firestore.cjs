// Run against demo-review774 only; never uses a production project.
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.REVIEW_JSDOM||'jsdom');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require(process.env.REVIEW_RULES_TESTING||'@firebase/rules-unit-testing');
const sdk=require(process.env.REVIEW_FIRESTORE||'firebase/firestore');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),source=html.split('<script type="module">')[1].split('</script>')[0].replace(/^import .*$/mg,'');
const rules=process.env.REVIEW_FIRESTORE_RULES
 ? fs.readFileSync(process.env.REVIEW_FIRESTORE_RULES,'utf8')
 : fs.readFileSync(path.join(__dirname,'../FAMILY_ACCESS_SETUP.md'),'utf8').split('```javascript')[1].split('```')[0].trim();
(async()=>{const env=await initializeTestEnvironment({projectId:'demo-review774',firestore:{host:'127.0.0.1',port:8087,rules}});await env.clearFirestore();
await env.withSecurityRulesDisabled(async c=>{await sdk.setDoc(sdk.doc(c.firestore(),'access','synthetic'),{enabled:true})});
const db=env.authenticatedContext('synthetic').firestore(),other=env.authenticatedContext('unapproved').firestore(),anon=env.unauthenticatedContext().firestore();
await assertFails(sdk.setDoc(sdk.doc(other,'users/unapproved/expressions/own'),{q:'x'}));
await env.withSecurityRulesDisabled(c=>sdk.setDoc(sdk.doc(c.firestore(),'access/disabled'),{enabled:false}));
const disabled=env.authenticatedContext('disabled').firestore();
await assertFails(sdk.getDoc(sdk.doc(disabled,'users/disabled/review/import-counter-en')));
for(const client of [other,anon]){await assertFails(sdk.getDoc(sdk.doc(client,'users/synthetic/review/import-counter-en')));await assertFails(sdk.setDoc(sdk.doc(client,'users/synthetic/expressions/forbidden'),{q:'x'}));}
await assertFails(sdk.setDoc(sdk.doc(db,'access/synthetic'),{enabled:true}));await assertFails(sdk.setDoc(sdk.doc(db,'users/other/review/import-counter-en'),{initialNumber:1}));await assertSucceeds(sdk.setDoc(sdk.doc(db,'users/synthetic/review/import-counter-en'),{initialNumber:0,sortOrder:0}));console.log('PASS Rules: unapproved/anonymous/other UID rejected; approved owner counter allowed; access edits rejected');
const windows=[];function make(clientDb=db){const w=new JSDOM(html.replace(/<script type="module">[\s\S]*?<\/script>/,''),{url:'https://test.invalid',runScripts:'outside-only'}).window;windows.push(w);Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto});Object.assign(w,sdk,{TextEncoder,initializeApp:()=>({}),getAuth:()=>({}),getFirestore:()=>clientDb,GoogleAuthProvider:class{},onAuthStateChanged:()=>{},signInWithPopup:()=>{},signOut:()=>{},confirm:()=>true,alert:()=>{}});w.runTransaction=(db,callback)=>sdk.runTransaction(db,tx=>callback({get:r=>tx.get(r),set:(r,d,o)=>o?tx.set(r,Object.assign({},d),Object.assign({},o)):tx.set(r,Object.assign({},d))}));w.eval(source+`;approvedUid='synthetic';authGeneration=1;loadBank=async()=>{};refresh=()=>{};resumeQuiz=async()=>{};globalThis.test={busy:()=>draftBusy,count:()=>draftRows.length};`);return w;}
const paste=(w,rows)=>{w.document.getElementById('importText').value=rows;w.document.getElementById('previewImport').click()},click=w=>w.document.getElementById('importButton').click();async function wait(w){for(let i=0;i<12000&&w.test.busy();i++)await new Promise(r=>setTimeout(r,5));assert.equal(w.test.busy(),false);}
const w=make();paste(w,Array.from({length:125},(_,i)=>`日${i}\tSDK ${i}`).join('\n'));click(w);await wait(w);let docs=await sdk.getDocs(sdk.collection(db,'users/synthetic/expressions'));assert.equal(docs.size,125,w.document.getElementById("importStatus").textContent);console.log('PASS real SDK 125-row registration');
const protectedDoc=docs.docs[0],protectedId=protectedDoc.id;
const reviewedAt=sdk.Timestamp.fromMillis(1700000000000);
await sdk.updateDoc(protectedDoc.ref,{
 correctCount:3,wrongCount:1,lastCorrect:true,lastCorrectAt:reviewedAt,lastReviewedAt:reviewedAt
});
const protectedData=(await sdk.getDoc(protectedDoc.ref)).data();
await sdk.setDoc(sdk.doc(db,'users/synthetic/sessions/keep'),{answers:[{id:protectedId,correct:true}],score:1});
const a=make(env.authenticatedContext("synthetic").firestore()),b=make(env.authenticatedContext("synthetic").firestore());let warnings=0;a.confirm=b.confirm=m=>{if(m.includes('別の端末等')){warnings++;return false;}return true};paste(a,'競合\tConcurrent real SDK');paste(b,'競合\tConcurrent real SDK');click(a);click(b);await Promise.all([wait(a),wait(b)]);docs=await sdk.getDocs(sdk.collection(db,'users/synthetic/expressions'));assert.equal(docs.size,126);assert.equal(warnings,0);assert.equal(new Set(docs.docs.map(d=>d.data().initialNumber)).size,126);console.log('PASS real SDK simultaneous registration: skip duplicate without extra prompt and unique numbering');
const r=make();let lost=true;const realTransaction=r.runTransaction;r.runTransaction=async(...args)=>{const result=await realTransaction(...args);if(lost){lost=false;throw Error('lost commit acknowledgement')}return result;};paste(r,'断線\tSDK lost acknowledgement');r.document.getElementById('duplicatePolicy').value='keep';click(r);await wait(r);assert.equal(r.test.count(),1);click(r);await wait(r);docs=await sdk.getDocs(sdk.collection(db,'users/synthetic/expressions'));assert.equal(docs.size,127);console.log('PASS real SDK persisted commit + lost response + retry produces one expression');
const offline=make();paste(offline,'切断\tOffline registration');await sdk.disableNetwork(db);click(offline);await wait(offline);assert.equal(offline.test.count(),1);await sdk.enableNetwork(db);click(offline);await wait(offline);docs=await sdk.getDocs(sdk.collection(db,'users/synthetic/expressions'));assert.equal(docs.size,128);assert.deepEqual((await sdk.getDoc(sdk.doc(db,'users/synthetic/expressions/'+protectedId))).data(),protectedData);assert.equal((await sdk.getDoc(sdk.doc(db,'users/synthetic/sessions/keep'))).data().score,1);console.log('PASS SDK offline/reconnect retry; existing expression ID/number/content and session protected');
const expressions=sdk.collection(db,'users/synthetic/expressions');
const bulk=make();
const duplicates=Array.from({length:125},(_,i)=>`日${i}\tSDK ${i}`).join('\n');
let confirmations=0;
bulk.confirm=()=>{confirmations++;return true;};
paste(bulk,duplicates);
click(bulk);
await wait(bulk);
assert.equal((await sdk.getDocs(expressions)).size,128);
assert.equal(confirmations,1);
paste(bulk,duplicates);
bulk.document.getElementById('duplicatePolicy').value='keep';
click(bulk);
await wait(bulk);
assert.equal((await sdk.getDocs(expressions)).size,253);
assert.equal(confirmations,2);
console.log('PASS 125 existing pairs: skip or keep all with exactly one confirmation each');

paste(a,'同時A\tDistinct A');
paste(b,'同時B\tDistinct B');
click(a);
click(b);
await Promise.all([wait(a),wait(b)]);
const simultaneous=await sdk.getDocs(expressions);
assert.equal(simultaneous.size,255);
for(const field of ['initialNumber','sortOrder']){
 const numbers=simultaneous.docs.map(d=>d.data()[field]).sort((x,y)=>x-y);
 assert.deepEqual(numbers,Array.from({length:255},(_,i)=>i+1));
}
console.log('PASS independent clients get consecutive unique numbers and display orders');

async function registerPair(q,answer){
 paste(w,q+'\t'+answer);
 click(w);
 await wait(w);
 const status=w.document.getElementById('importStatus').textContent;
 assert.match(status,/^1件登録、0件重複/,status);
 const matches=(await sdk.getDocs(expressions)).docs.filter(d=>d.data().q===q&&d.data().answer===answer);
 assert.equal(matches.length,1);
 return matches[0].ref;
}
const editedRef=await registerPair('編集の確認','Before editing');
await sdk.updateDoc(editedRef,{answer:'After editing'});
const readded=await registerPair('編集の確認','Before editing');
assert.notEqual(readded.id,editedRef.id);
assert.equal((await sdk.getDoc(editedRef)).data().answer,'After editing');
await sdk.deleteDoc(readded);
await registerPair('編集の確認','Before editing');
const legacyHash=require('node:crypto').createHash('sha256').update('旧形式|original').digest('hex');
const legacyRef=sdk.doc(expressions,'en-'+legacyHash);
const legacy={q:'旧形式',answer:'Already edited',initialNumber:542,sortOrder:542,correctCount:9};
await sdk.setDoc(legacyRef,legacy);
const newRef=await registerPair('旧形式','Original');
assert.deepEqual((await sdk.getDoc(legacyRef)).data(),legacy);
assert.equal((await sdk.getDoc(newRef)).data().initialNumber,543);
assert.deepEqual((await sdk.getDoc(sdk.doc(expressions,protectedId))).data(),protectedData);
console.log('PASS edited and deleted expressions, including legacy IDs, do not cause stale duplicate matches');
w.document.querySelector('.lang[data-lang=fr]').click();
paste(w,'旧形式\tOriginal');
click(w);
await wait(w);
const french=(await sdk.getDocs(expressions)).docs.filter(d=>d.data().language==='fr');
assert.equal(french.length,1);
assert.equal(french[0].data().initialNumber,1);
assert.equal(french[0].data().answer,'Original');
assert.deepEqual((await sdk.getDoc(sdk.doc(db,'users/synthetic/sessions/keep'))).data(),{
 answers:[{id:protectedId,correct:true}],score:1
});
console.log('PASS French duplicate detection and numbering are independent; original session is intact');
for(const w of windows)w.close();await env.cleanup();})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),100)});
