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
export default {async fetch(request,env){
 const user=await authorize(request,env);
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"};
 if(!user)return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers});
 if(request.method==="GET"&&new URL(request.url).pathname==="/api/me")return new Response(JSON.stringify({id:user.id,email:user.email}),{headers});
 return new Response(JSON.stringify({error:"not_found"}),{status:404,headers});
}};
