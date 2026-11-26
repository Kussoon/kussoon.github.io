export async function openLocal(account){
 if(typeof account!=="string"||!account)throw Error("account required");
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open("kussoon-cloudflare-review:"+account,1);r.onupgradeneeded=()=>{for(const name of ["expressions","events","outbox","meta"])r.result.createObjectStore(name);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 function transaction(names,mode,fn){return new Promise((resolve,reject)=>{const tx=db.transaction(names,mode);let result;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error("transaction aborted"));tx.onerror=()=>reject(tx.error);try{result=fn(tx);}catch(e){tx.abort();reject(e);}});}
 function read(name,key){return new Promise((resolve,reject)=>{const tx=db.transaction(name),r=key===undefined?tx.objectStore(name).getAll():tx.objectStore(name).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 return {
 close:()=>db.close(),
 expressions:()=>read("expressions"),
 events:()=>read("events"),
 pending:()=>read("outbox"),
 cursor:async()=>await read("meta","cursor")??0,
 async grade(expressionId,rating,sessionId){
 if(!["correct","wrong","excluded","skipped"].includes(rating))throw Error("invalid rating");
 const event={eventId:crypto.randomUUID(),expressionId,rating,sessionId,reviewedAt:new Date().toISOString()};
 await transaction(["events","outbox"],"readwrite",tx=>{tx.objectStore("events").add(event,event.eventId);tx.objectStore("outbox").add(event,event.eventId);});
 return event;
 },
 async acknowledge(ids){await transaction(["outbox"],"readwrite",tx=>{for(const id of ids)tx.objectStore("outbox").delete(id);});},
 async applyPage(after,page){
 if(!Number.isSafeInteger(page.cursor)||page.cursor<after||!Array.isArray(page.changes))throw Error("invalid page");
 let last=after;for(const c of page.changes){if(!Number.isSafeInteger(c.seq)||c.seq<=last||!["expression","event"].includes(c.entity)||!["upsert","delete"].includes(c.operation)||typeof c.entity_id!=="string"||(c.operation==="upsert"&&(!c.payload||typeof c.payload!=="object")))throw Error("invalid change");last=c.seq;}if(last!==page.cursor)throw Error("cursor mismatch");
 await transaction(["expressions","events","meta"],"readwrite",tx=>{const meta=tx.objectStore("meta"),r=meta.get("cursor");r.onsuccess=()=>{if((r.result??0)!==after){tx.abort();return;}for(const c of page.changes){const store=tx.objectStore(c.entity==="expression"?"expressions":"events");if(c.operation==="delete")store.delete(c.entity_id);else store.put({...c.payload,[c.entity==="expression"?"id":"eventId"]:c.entity_id},c.entity_id);}meta.put(page.cursor,"cursor");};});
 }
 };
}
export function createSync(local,account,fetcher=fetch){
 let running=null;
 async function request(path,options){const r=await fetcher(path,{...options,credentials:"same-origin",cache:"no-store",redirect:"error"});if(!r.ok)throw Error("sync HTTP "+r.status);return r.json();}
 async function run(){
 const me=await request("/api/me");if(me.id!==account)throw Error("account changed");
 for(let i=0;i<20;i++){const pending=(await local.pending()).slice(0,50);if(!pending.length)break;const response=await request("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({events:pending})});const expected=new Set(pending.map(e=>e.eventId));if(!Array.isArray(response.acknowledged)||response.acknowledged.length!==expected.size||new Set(response.acknowledged).size!==expected.size||response.acknowledged.some(id=>!expected.has(id)))throw Error("invalid acknowledgement");await local.acknowledge(response.acknowledged);}
 for(let i=0;i<100;i++){const after=await local.cursor(),page=await request("/api/changes?after="+after);await local.applyPage(after,page);if(!page.more)break;if(page.cursor<=after)throw Error("cursor stalled");}
 return {pending:(await local.pending()).length};
 }
 return ()=>{if(!running)running=run().finally(()=>{running=null;});return running;};
}
