// Import batches using transactional guards. No existing data is overwritten.
export async function importBatch(db,account,body){
 const {archiveId,index,rows,digest}=body??{};
 const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
 if(!hex(archiveId)||!hex(digest)||!Number.isSafeInteger(index)||index<0||!Array.isArray(rows)||!rows.length||rows.length>25)throw Error("invalid batch");
 const raw=JSON.stringify(rows),bytes=new TextEncoder().encode(raw);
 if(bytes.length>1050000)throw Error("batch too large");
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");
 if(actual!==digest)throw Error("digest mismatch");
 for(const r of rows){if(!r||!["expressions","sessions","chunks","review"].includes(r.group)||typeof r.id!=="string"||!r.id||r.id.length>512||!r.data||typeof r.data!=="object"||Array.isArray(r.data))throw Error("invalid row");if(r.group==="expressions"&&(!["en","fr"].includes(r.data.language??"en")||typeof r.data.q!=="string"||!r.data.q.trim()||typeof r.data.answer!=="string"||!r.data.answer.trim()))throw Error("invalid expression");}
 const existing=await db.prepare("SELECT s.archive_id,s.completed,r.digest FROM migration_state s LEFT JOIN migration_receipts r ON r.account_id=s.account_id AND r.batch_no=? WHERE s.account_id=?").bind(index,account).first();
 if(existing?.archive_id===archiveId&&existing.digest===digest)return {acknowledged:index};
 const stmts=[db.prepare("INSERT INTO accounts(id) VALUES(?) ON CONFLICT DO NOTHING").bind(account),db.prepare("INSERT INTO migration_state(account_id,archive_id) SELECT ?,? WHERE ?=0 AND NOT EXISTS(SELECT 1 FROM expressions WHERE account_id=?) AND NOT EXISTS(SELECT 1 FROM legacy_documents WHERE account_id=?) ON CONFLICT DO NOTHING").bind(account,archiveId,index,account,account)];
 // NOT NULL guard aborts the entire D1 batch on stale sequence, wrong archive or completed import.
 stmts.push(db.prepare("INSERT INTO migration_receipts(account_id,batch_no,digest) VALUES(?,?,CASE WHEN EXISTS(SELECT 1 FROM migration_state WHERE account_id=? AND archive_id=? AND next_batch=? AND completed=0) THEN ? ELSE NULL END)").bind(account,index,account,archiveId,index,digest));
 for(const r of rows){const payload=JSON.stringify(r.data);stmts.push(r.group==="expressions"?db.prepare("INSERT INTO expressions(account_id,id,language,payload) VALUES(?,?,?,?)").bind(account,r.id,r.data.language??"en",payload):db.prepare("INSERT INTO legacy_documents(account_id,collection_name,document_id,payload) VALUES(?,?,?,?)").bind(account,r.group,r.id,payload));}
 stmts.push(db.prepare("UPDATE migration_state SET next_batch=next_batch+1 WHERE account_id=?").bind(account));
 await db.batch(stmts);return {acknowledged:index};
}
