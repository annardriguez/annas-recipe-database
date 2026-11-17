const assert=require('node:assert/strict');
function fixture(){
 const rows=new Map(),transactions=new Map();let counter=0;
 const api={rows,beforeCommit:null,
  async createTransaction(){const id=String(++counter);transactions.set(id,{snapshot:structuredClone(rows),writes:new Map()});return {$id:id};},
  source(id){const tx=transactions.get(id);return tx?new Map([...tx.snapshot,...tx.writes]):rows;},
  async getRow({rowId,transactionId}){const row=api.source(transactionId).get(rowId);if(!row)throw Object.assign(new Error('Missing'),{code:404});return structuredClone(row);},
  async createRow({rowId,data,transactionId,permissions=[]}){const row={...structuredClone(data),$id:rowId,$updatedAt:new Date().toISOString(),$createdAt:rows.get(rowId)?.$createdAt||new Date().toISOString(),$permissions:permissions};const tx=transactions.get(transactionId);assert.ok(tx,'Writes must be transactional');tx.writes.set(rowId,row);return structuredClone(row);},
  async updateRow(args){return api.createRow(args);},
  async listRows({queries=[],transactionId}){let result=[...api.source(transactionId).values()],offset=0,limit=25;for(const raw of queries){const q=JSON.parse(raw);if(q.method==='equal')result=result.filter(row=>q.values.includes(row[q.attribute]));if(q.method==='limit')limit=q.values[0];if(q.method==='offset')offset=q.values[0];if(q.method==='orderAsc')result.sort((a,b)=>String(a[q.attribute]).localeCompare(String(b[q.attribute])));if(q.method==='orderDesc')result.sort((a,b)=>String(b[q.attribute]).localeCompare(String(a[q.attribute])));}return{rows:structuredClone(result.slice(offset,offset+limit)),total:result.length};},
  async updateTransaction({transactionId,commit}){const tx=transactions.get(transactionId);if(commit){if(api.beforeCommit)await api.beforeCommit();for(const[id]of tx.writes)if(JSON.stringify(rows.get(id))!==JSON.stringify(tx.snapshot.get(id)))throw Object.assign(new Error('Conflict'),{code:409});for(const[id,row]of tx.writes)rows.set(id,row);}transactions.delete(transactionId);return {};}
 };return api;
}
module.exports={fixture};
