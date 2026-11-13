/* Opt-in real-backend test. Credentials live outside the repo. Every created record is test-prefixed. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {Client,Account,Functions,Storage}=require('node-appwrite');
const {InputFile}=require('node-appwrite/file');
const {randomUUID}=require('node:crypto');
const ENDPOINT='https://fra.cloud.appwrite.io/v1', PROJECT='6af647a70013af378363';
async function run(){
 const credentialsPath=process.env.ANNA_APPWRITE_TEST_CREDENTIALS;if(!credentialsPath)throw Error('Set ANNA_APPWRITE_TEST_CREDENTIALS to an owner-readable test credentials file.');
 const credentials=JSON.parse(fs.readFileSync(credentialsPath,'utf8'));
 const suppliedCookies=[...(credentials.cookies || [])];
 const checks=[],runId=`test-${randomUUID()}`,client=()=>new Client().setEndpoint(ENDPOINT).setProject(PROJECT);
 async function login(){
  if(suppliedCookies.length)return client().setCookie(suppliedCookies.shift());
  const response=await fetch(`${ENDPOINT}/account/sessions/email`,{method:'POST',headers:{'X-Appwrite-Project':PROJECT,'Content-Type':'application/json',Origin:'http://127.0.0.1:4173'},body:JSON.stringify({email:credentials.email,password:credentials.password})});
  if(!response.ok)throw Error(`Login failed (${response.status})`);
  const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
  assert.ok(cookie);return client().setCookie(cookie);
 }
 const a=await login(),b=await login();
 assert.equal((await new Account(a).get()).emailVerification,true);
 checks.push('Verified email account authenticated in two independent sessions');
 const invoke=async(c,body)=>{
  const execution=await new Functions(c).createExecution({functionId:'kitchen-sync',body:JSON.stringify(body),async:false});
  let payload;try{payload=JSON.parse(execution.responseBody);}catch{throw Error(`Function failed (${execution.responseStatusCode}, ${execution.status})`);}
  if(payload.error)throw Object.assign(Error(payload.error.message),{code:payload.error.code});return payload.data;
 };
 const list=c=>invoke(c,{action:'list',limit:500});
 const user=await new Account(a).get();
 const fileId=randomUUID(),path=`${user.$id}/${fileId}.png`;
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4ZkAAAAASUVORK5CYII=','base64');
 const {Permission,Role}=require('node-appwrite');
 await new Storage(a).createFile({bucketId:'kitchen-photos',fileId,file:InputFile.fromBuffer(bytes,'sync-test.png'),permissions:[Permission.read(Role.user(user.$id)),Permission.delete(Role.user(user.$id))]});
 const record=(kind,id,data)=>({kind,id,data,expected_version:0,deleted:false});
 const changes=[
  record('recipe',runId,{id:runId,title:'Cross-device sync test (safe to delete)',isCustom:true,emoji:'🍲',description:'Temporary automated test recipe.',category:'main',time:10,tags:['custom'],equipment:[],ingredients:['Test ingredient'],steps:['Testing only.']}),
  record('favourite',runId,{}),record('entry',runId,{notes:'Cooked on the first device',rating:5,status:'make again',substitutions:'Extra herbs',photo:path,collection_ids:[runId]}),
  record('history',runId,{recipe_id:runId,title:'Sync test',cooked_on:'2026-11-13',notes:'First cook',photo:path}),
  record('collection',runId,{name:'Temporary sync test'}),record('meal',runId,{recipe_id:runId}),record('grocery',runId,{text:'Sync test',checked:true,week:'2026-11-09'}),record('profile',runId,{display_name:'Test profile'})
 ];
 await invoke(a,{action:'save',changes});
 const received=await list(b);for(const change of changes){const row=received.find(r=>r.kind===change.kind&&r.id===runId);assert.ok(row);assert.deepEqual(row.data,change.data);assert.equal(row.user_id,user.$id);}
 checks.push('Original, bookmark, notes/rating/status, photo reference, history, collection, meal, grocery and profile available in second session');
 const downloaded=await new Storage(b).getFileDownload({bucketId:'kitchen-photos',fileId});assert.equal(Buffer.from(downloaded).equals(bytes),true);
 const anonymousPhoto=await fetch(`${ENDPOINT}/storage/buckets/kitchen-photos/files/${fileId}/view?project=${PROJECT}`);assert.ok([401,403,404].includes(anonymousPhoto.status));
 checks.push('Private photo available in second session and denied anonymously');
 const directRead=await fetch(`${ENDPOINT}/tablesdb/6af6480d001895013491/tables/records/rows`,{headers:{'X-Appwrite-Project':PROJECT,Cookie:b.config.cookie}});
 const readBody=await directRead.json();assert.ok(!directRead.ok||readBody.rows?.length===0);
 await assert.rejects(invoke(client(),{action:'list'}));
 checks.push('Direct table access and anonymous function execution denied');
 const changed={...changes[2],data:{...changes[2].data,notes:'Edited on the second device'},expected_version:1};await invoke(b,{action:'save',changes:[changed]});
 assert.equal((await list(a)).find(r=>r.kind==='entry'&&r.id===runId).data.notes,'Edited on the second device');
 await assert.rejects(invoke(a,{action:'save',changes:[{...changed,expected_version:1},record('recipe',runId+'-rollback',{title:'Must not exist'})]}),e=>e.code===409);
 assert.equal((await list(a)).some(r=>r.id===runId+'-rollback'),false);
 checks.push('Edits propagate; stale writes rejected; multi-item failure rolls back atomically');
 const concurrent=await Promise.allSettled([a,b].map(c=>invoke(c,{action:'save',changes:[{...changed,expected_version:2}]})));
 assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.filter(r=>r.status==='rejected'&&r.reason.code===409).length,1);
 checks.push('Concurrent edits produce exactly one winner and one conflict');
 await invoke(b,{action:'save',changes:[{...changes[1],expected_version:1,deleted:true}]});
 await invoke(a,{action:'import',records:[{kind:'favourite',id:runId,data:{}}]});assert.equal((await list(a)).find(r=>r.kind==='favourite'&&r.id===runId).deleted,true);
 checks.push('Deletion propagates and guest reimport cannot resurrect it');
 const current=(await list(b)).filter(r=>r.id===runId);
 await invoke(b,{action:'save',changes:current.map(r=>({kind:r.kind,id:r.id,data:{},deleted:true,expected_version:r.version}))});
 await new Storage(b).deleteFile({bucketId:'kitchen-photos',fileId});
 checks.push('Temporary recipe records and uploaded test image cleaned up');
 await new Account(a).deleteSession({sessionId:'current'});await assert.rejects(new Account(a).get());await assert.rejects(invoke(a,{action:'list'}));assert.equal((await new Account(b).get()).$id,user.$id);
 checks.push('Logout invalidates the first session; independent second session still works');
 await new Account(b).deleteSession({sessionId:'current'});
 const report={at:new Date().toISOString(),provider:'Appwrite',checks,scope:'Real API and Storage tests with two independent authenticated session cookies; not two physical devices or full browser journeys.'};
 fs.writeFileSync('/tmp/anna-kitchen-appwrite-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
run().catch(error=>{console.error(JSON.stringify({failed:error.message,code:error.code}));process.exit(1);});
