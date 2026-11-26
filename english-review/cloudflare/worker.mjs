import {createRemoteJWKSet,jwtVerify} from "jose";
const keys=new Map();
export async function authorize(request,env,verify=jwtVerify){
 const issuer=env.TEAM_DOMAIN,audience=env.POLICY_AUD;
 if(!issuer||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!audience||!env.ALLOWED_EMAILS)return null;
 const token=request.headers.get("Cf-Access-Jwt-Assertion");
 if(!token)return null;
 try{
 if(!keys.has(issuer))keys.set(issuer,createRemoteJWKSet(new URL(issuer+"/cdn-cgi/access/certs")));
 const {payload}=await verify(token,keys.get(issuer),{issuer,audience,algorithms:["RS256"],requiredClaims:["exp","sub","email"]});
 const email=typeof payload.email==="string"?payload.email.trim().toLowerCase():"";
 const allowed=env.ALLOWED_EMAILS.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!email||!allowed.includes(email)||typeof payload.sub!=="string"||!payload.sub)return null;
 return {id:payload.sub,email};
 }catch{return null;}
}
async function syncApi(request,env,user){
 const url=new URL(request.url),db=env.DB;
 if(!db)return {status:503,body:{error:"database_unconfigured"}};
 if(request.method==="GET"&&url.pathname==="/api/changes"){
 const raw=url.searchParams.get("after")??"0";
 if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))return {status:400,body:{error:"invalid_cursor"}};
 const after=Number(raw);
 const result=await db.prepare("SELECT seq,entity,entity_id,operation,payload FROM changes WHERE account_id=? AND seq>? ORDER BY seq LIMIT 101").bind(user.id,after).all();
 const rows=result.results.slice(0,100);
 return {status:200,body:{changes:rows.map(r=>({...r,payload:r.payload===null?null:JSON.parse(r.payload)})),cursor:rows.at(-1)?.seq??after,more:result.results.length>100}};
 }
 if(request.method==="POST"&&url.pathname==="/api/events"){
 if(request.headers.get("Origin")!==url.origin||!request.headers.get("Content-Type")?.startsWith("application/json"))return {status:403,body:{error:"origin"}};
 const reader=request.body?.getReader();if(!reader)return {status:400,body:{error:"body"}};
 const decoder=new TextDecoder();let size=0,raw="";
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return {status:413,body:{error:"too_large"}};}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
 let data;try{data=JSON.parse(raw);}catch{return {status:400,body:{error:"invalid_json"}};}
 const events=data?.events,validId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
 if(!Array.isArray(events)||events.length<1||events.length>50||events.some(e=>!e||!validId(e.eventId)||!validId(e.expressionId)||!validId(e.sessionId)||!["correct","wrong","excluded","skipped"].includes(e.rating)||typeof e.reviewedAt!=="string"||!Number.isFinite(Date.parse(e.reviewedAt))))return {status:400,body:{error:"invalid_events"}};
 if(new Set(events.map(e=>e.eventId)).size!==events.length)return {status:400,body:{error:"duplicate_batch_ids"}};
 const statements=[db.prepare("INSERT INTO accounts(id) VALUES(?) ON CONFLICT(id) DO NOTHING").bind(user.id)];
 for(const e of events)statements.push(db.prepare("INSERT INTO review_events(account_id,event_id,expression_id,rating,reviewed_at,session_id) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,event_id) DO NOTHING").bind(user.id,e.eventId,e.expressionId,e.rating,new Date(e.reviewedAt).toISOString(),e.sessionId));
 try{await db.batch(statements);}catch{return {status:409,body:{error:"batch_rejected"}};}
 return {status:200,body:{acknowledged:events.map(e=>e.eventId)}};
 }
 return {status:404,body:{error:"not_found"}};
}

export default {async fetch(request,env){
 const user=await authorize(request,env);
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"};
 if(!user)return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers});
 if(request.method==="GET"&&new URL(request.url).pathname==="/api/me")return new Response(JSON.stringify({id:user.id,email:user.email}),{headers});
 try{const result=await syncApi(request,env,user);return new Response(JSON.stringify(result.body),{status:result.status,headers});}catch{return new Response(JSON.stringify({error:"sync_failed"}),{status:503,headers});}
}};
