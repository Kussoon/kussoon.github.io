export function validateMigration(data){
 if(data?.format!=="kussoon-language-review-cloudflare-migration-v1")throw Error("専用の完全バックアップが必要です");
 const groups=["expressions","sessions","chunks","review"];
 const result={};
 for(const group of groups){
 if(!Array.isArray(data[group]))throw Error(group+" missing");
 const seen=new Set();
 result[group]=data[group].map(row=>{
 if(!row||typeof row.id!=="string"||!row.id||row.id.length>512||seen.has(row.id)||!row.data||typeof row.data!=="object"||Array.isArray(row.data))throw Error(group+" invalid or duplicate ID");
 seen.add(row.id);
 if(group==="expressions"&&(!["en","fr"].includes(row.data.language??"en")||typeof row.data.q!=="string"||!row.data.q.trim()||typeof row.data.answer!=="string"||!row.data.answer.trim()))throw Error("invalid expression "+row.id);
 return {id:row.id,data:row.data};
 });
 }
 const chunkIds=new Set(result.chunks.map(x=>x.id));
 for(const row of result.sessions){const s=row.data;if(s.chunked&&(!Number.isInteger(s.total)||s.total<0))throw Error("invalid session "+row.id);}
 return {groups:result,counts:Object.fromEntries(groups.map(g=>[g,result[g].length])),chunkIds:chunkIds.size};
}
