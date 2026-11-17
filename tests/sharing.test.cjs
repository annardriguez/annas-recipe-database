const {test}=require('node:test'),assert=require('node:assert/strict');const {fixture}=require('./helpers/social-fixture.cjs');
const mod=import('../appwrite/functions/kitchen-sync/main.js');
const alice={$id:'alice',email:'alice@example.test',name:'Anna',emailVerification:true},mum={$id:'mum',email:'mum@example.test',name:'Mamá',emailVerification:true},eve={$id:'eve',email:'eve@example.test',name:'Eve',emailVerification:true};
const recipe={title:'Family soup',description:'A warm bowl',ingredients:['2 carrots'],steps:['Simmer.'],time:20,servings:2,category:'main',tags:[],equipment:[],sourceUrl:'https://recipes.example/soup',sourceAuthor:'Original author',note:'PRIVATE DIARY',photo:'alice/private-photo.jpg',user_id:'alice',rating:5,history:['PRIVATE HISTORY']};
async function setup(){const tables=fixture(),{createHandler}=await mod;const call=async(user,body)=>{const result=await createHandler({tables,authenticate:async()=>user})({req:{bodyJson:body},res:{json:(data,code=200)=>({data,code})},error:()=>{}});return result;};const ok=async(user,op,data={})=>{const r=await call(user,{action:'social',op,...data});assert.equal(r.code,200,JSON.stringify(r.data));return r.data.data;};return{tables,call,ok};}
test('verified email invitations, memberships, isolation, owner controls and revocation',async()=>{
 const {call,ok}=await setup();const {id}=await ok(alice,'create-book',{name:'Our family',displayName:'Anna'});
 await ok(alice,'invite',{bookId:id,email:'MUM@example.test'});
 assert.equal((await ok(mum,'state')).invitations.length,1);assert.equal((await ok(eve,'state')).invitations.length,0);
 assert.equal((await call(eve,{action:'social',op:'accept',bookId:id,displayName:'Eve'})).code,404);
 assert.equal((await call({...mum,emailVerification:false},{action:'social',op:'accept',bookId:id,displayName:'Mum'})).code,403);
 await ok(mum,'accept',{bookId:id,displayName:'Mamá'});assert.equal((await ok(mum,'state')).books[0].name,'Our family');
 assert.equal((await call(mum,{action:'social',op:'invite',bookId:id,email:eve.email})).code,403);
 assert.equal((await call(mum,{action:'social',op:'remove-member',bookId:id,memberId:'alice'})).code,403);
 await ok(alice,'remove-member',{bookId:id,memberId:'mum'});assert.equal((await ok(mum,'state')).books.length,0);
 assert.equal((await call(mum,{action:'social',op:'book',bookId:id})).code,403);
 assert.equal((await call(mum,{action:'social',op:'share',bookId:id,sourceId:'soup',recipe,expectedVersion:0})).code,403);
 await ok(alice,'invite',{bookId:id,email:mum.email});await ok(alice,'revoke-invite',{bookId:id,email:mum.email});assert.equal((await ok(mum,'state')).invitations.length,0);
 assert.equal((await call(mum,{action:'social',op:'accept',bookId:id,displayName:'Mum'})).code,404);
});
test('shared snapshots omit private fields; only the contributor edits; stale writes and tampered IDs fail',async()=>{
 const {tables,call,ok}=await setup();const {id}=await ok(alice,'create-book',{name:'Together',displayName:'Anna'});await ok(alice,'invite',{bookId:id,email:mum.email});await ok(mum,'accept',{bookId:id,displayName:'Mum'});
 const shared=await ok(alice,'share',{bookId:id,sourceId:'original',recipe,expectedVersion:0});let item=(await ok(mum,'book',{bookId:id})).items[0];assert.equal(item.recipe.sourceAuthor,'Original author');for(const key of ['note','photo','rating','history','user_id'])assert.equal(item.recipe[key],undefined,key);
 assert.equal((await call(mum,{action:'social',op:'share',bookId:id,itemId:shared.id,sourceId:'original',recipe,expectedVersion:1})).code,403);
 await ok(alice,'share',{bookId:id,itemId:shared.id,sourceId:'original',recipe:{...recipe,title:'Updated'},expectedVersion:1});
 assert.equal((await call(alice,{action:'social',op:'share',bookId:id,itemId:shared.id,sourceId:'original',recipe,expectedVersion:1})).code,409);
 await ok(alice,'remove-shared',{bookId:id,itemId:shared.id,sourceId:'original',expectedVersion:2});
 assert.equal((await call(mum,{action:'social',op:'share',bookId:id,itemId:shared.id,sourceId:'original',recipe,expectedVersion:3})).code,403);
 assert.equal((await call(mum,{action:'social',op:'share',bookId:id,itemId:'made-up',sourceId:'mine',recipe,expectedVersion:0})).code,403);
 assert.equal((await ok(alice,'book',{bookId:id})).items.length,0);
 assert.ok([...tables.rows.values()].every(row=>row.$permissions.length===0));
});
test('publication is explicit, anonymous read-only, source credited, versioned and reversible without exposing private records',async()=>{
 const {tables,call,ok}=await setup();assert.equal((await call(alice,{action:'social',op:'publish',sourceId:'private-id',recipe,displayName:'Anna',expectedVersion:0})).code,400);
 const published=await ok(alice,'publish',{sourceId:'private-id',recipe,displayName:'Anna',permissionConfirmed:true,expectedVersion:0});
 const publicRow=[...tables.rows.values()].find(row=>row.kind==='publication');assert.deepEqual(publicRow.$permissions,['read("any")']);const snapshot=JSON.parse(publicRow.payload);assert.equal(snapshot.sourceAuthor,'Original author');assert.equal(snapshot.publisherName,'Anna');assert.ok(!JSON.stringify(snapshot).includes('PRIVATE'));assert.equal(snapshot.photo,undefined);assert.equal(publicRow.owner.length,36);assert.ok(publicRow.owner.startsWith('!'));assert.ok(!publicRow.record_id.includes('private-id'));
 assert.equal((await ok(mum,'state')).publications.length,0);
 assert.equal((await call(mum,{action:'social',op:'unpublish',sourceId:'private-id',expectedVersion:1})).code,409);
 await ok(alice,'unpublish',{sourceId:'private-id',expectedVersion:1});const removed=[...tables.rows.values()].find(row=>row.kind==='publication');assert.equal(removed.deleted,true);assert.deepEqual(removed.$permissions,[]);
 const again=await ok(alice,'publish',{sourceId:'private-id',recipe,displayName:'Anna',permissionConfirmed:true,expectedVersion:2});assert.equal(again.publicationId,published.publicationId);
 assert.equal((await call(alice,{action:'save',changes:[{kind:'publication',id:'forged',data:{},deleted:false,expected_version:0}]})).code,400);
 assert.equal((await call(null,{action:'social',op:'publish'})).code,401);
});
test('private photo URLs and oversized images cannot become shared/public snapshots',async()=>{
 const {recipeSnapshot}=await import('../appwrite/functions/kitchen-sync/social.js');
 for(const image of ['alice/private.jpg','https://private.example/secret?token=x','data:image/svg+xml;base64,PHN2Zz4='])assert.throws(()=>recipeSnapshot({...recipe,image}),/photo|JPEG/);
 assert.throws(()=>recipeSnapshot({...recipe,image:'data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(100*1024)]).toString('base64')}),/smaller JPEG/);
 assert.equal(recipeSnapshot({...recipe,image:'data:image/jpeg;base64,/9j/AA=='}).image,'data:image/jpeg;base64,/9j/AA==');
});
test('concurrent removal rolls back a contribution rather than allowing a removed member to write',async()=>{
 const {tables,call,ok}=await setup();const {id}=await ok(alice,'create-book',{name:'Family',displayName:'Anna'});await ok(alice,'invite',{bookId:id,email:mum.email});await ok(mum,'accept',{bookId:id,displayName:'Mum'});
 tables.beforeCommit=async()=>{tables.beforeCommit=null;await ok(alice,'remove-member',{bookId:id,memberId:'mum'});};
 const result=await call(mum,{action:'social',op:'share',bookId:id,sourceId:'race',recipe,expectedVersion:0});assert.equal(result.code,409);assert.equal((await ok(alice,'book',{bookId:id})).items.length,0);
});

test('valid account IDs matching system words cannot read reserved private records',async()=>{
 const {call,ok}=await setup();await ok(alice,'create-book',{name:'Private family name',displayName:'Anna'});
 for(const id of ['books','public']){const user={$id:id,email:id+'@example.test',name:'Tester',emailVerification:true};const r=await call(user,{action:'list'});assert.equal(r.code,200);assert.equal(r.data.data.length,0);}
});
