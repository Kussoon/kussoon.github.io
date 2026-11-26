// Generate a private import plan; no network or database mutation here.
import {validateMigration} from "./migration.mjs";
export async function buildImportPlan(archive){
 const validated=validateMigration(archive);
 const rows=Object.entries(validated.groups).flatMap(([group,items])=>items.map(row=>({group,...row})));
 const batches=[];let batch=[],bytes=0;
 for(const row of rows){
 const n=new TextEncoder().encode(JSON.stringify(row)).length;
 if(n>1000000)throw Error("Document exceeds migration size limit: "+row.id);
 if(batch.length>=25||bytes+n>1000000){batches.push(batch);batch=[];bytes=0;}
 batch.push(row);bytes+=n;
 }
 if(batch.length)batches.push(batch);
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,"0")).join("");
 return {archiveId:await hash(archive),counts:validated.counts,batches:await Promise.all(batches.map(async(rows,index)=>({index,rows,digest:await hash(rows)})))};
}
