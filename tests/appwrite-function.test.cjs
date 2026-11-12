const {test} = require('node:test');
const assert = require('node:assert/strict');
const handlerModule = import('../appwrite/functions/kitchen-sync/main.js');
function tablesFixture() {
 const rows = new Map(), transactions = new Map();let counter=0;
 return {rows,
  async createTransaction(){const id=String(++counter);transactions.set(id,{snapshot:structuredClone(rows),writes:new Map()});return {$id:id};},
  async getRow({rowId,transactionId}){const row=(transactions.get(transactionId)?.writes.get(rowId)) || (transactions.get(transactionId)?.snapshot || rows).get(rowId);if(!row)throw Object.assign(new Error('Missing'),{code:404});return structuredClone(row);},
  async createRow({rowId,data,transactionId}){const row={...data,$id:rowId,$updatedAt:new Date().toISOString()};transactions.get(transactionId).writes.set(rowId,row);return row;},
  async updateRow(args){return this.createRow(args);},
  async listRows({queries}){const owner=JSON.parse(queries[0]).values[0];return {rows:[...rows.values()].filter(r=>r.owner===owner)};},
  async updateTransaction({transactionId,commit}){const tx=transactions.get(transactionId);if(commit){for(const [id]of tx.writes){if(JSON.stringify(rows.get(id))!==JSON.stringify(tx.snapshot.get(id)))throw Object.assign(new Error('Conflict'),{code:409});}for(const[id,row]of tx.writes)rows.set(id,row);}transactions.delete(transactionId);return {};}
 };
}
test('Appwrite function enforces verified identity, owner isolation and private photo references',async()=>{
 const {createHandler}=await handlerModule,tables=tablesFixture();let user={$id:'alice',emailVerification:true};
 const handle=createHandler({tables,authenticate:async()=>user});
 const call=body=>handle({req:{bodyJson:body},res:{json:(body,code=200)=>({body,code})},error:()=>{}});
 const entry={kind:'entry',id:'pasta',data:{notes:'Private'},expected_version:0,deleted:false};
 assert.equal((await call({action:'save',changes:[entry],owner:'bob'})).code,200);
 assert.equal([...tables.rows.values()][0].owner,'alice');
 user={$id:'bob',emailVerification:true};assert.equal((await call({action:'list'})).body.data.length,0);
 const badPhoto={...entry,data:{photo:'alice/secret.jpg'}};assert.equal((await call({action:'save',changes:[badPhoto]})).code,400);
 user={$id:'unverified',emailVerification:false};assert.equal((await call({action:'list'})).code,403);
 user=null;assert.equal((await call({action:'list'})).code,401);
});
test('Appwrite function preserves atomic writes, stale-version rejection and import tombstones',async()=>{
 const {createHandler}=await handlerModule,tables=tablesFixture();const handle=createHandler({tables,authenticate:async()=>({$id:'alice',emailVerification:true})});
 const call=body=>handle({req:{bodyJson:body},res:{json:(body,code=200)=>({body,code})},error:()=>{}});
 const entry=(id,version,deleted=false)=>({kind:'entry',id,data:{notes:'A memory'},expected_version:version,deleted});
 await call({action:'save',changes:[entry('pasta',0)]});
 const failed=await call({action:'save',changes:[entry('new',0),entry('pasta',0)]});assert.equal(failed.code,409);assert.equal(tables.rows.size,1);
 assert.equal((await call({action:'save',changes:[entry('pasta',1,true)]})).code,200);
 const records=[{kind:'entry',id:'pasta',data:{notes:'Old data'}},{kind:'recipe',id:'soup',data:{title:'Soup'}}];
 await call({action:'import',records});await call({action:'import',records});assert.equal(tables.rows.size,2);
 assert.equal([...tables.rows.values()].find(r=>r.record_id==='pasta').deleted,true);
 assert.equal((await call({action:'save',changes:[entry('pasta',1)]})).code,409);
});
