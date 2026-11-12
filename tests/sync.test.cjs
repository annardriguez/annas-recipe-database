const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('kitchen-data.js','utf8');
function fixture({initialUser=null,remote=new Map(),local={}}={}) {
  const events = new EventTarget(), storage = new Map(Object.entries(local));
  let sessionUser=initialUser, callback, fail=false;
  const copy=x=>structuredClone(x);
  const photos = new Map();
  const client = {
    storage:{from:()=>({async upload(path,file){photos.set(path,file);return {};},async createSignedUrl(path){return {data:{signedUrl:`https://example.supabase.co/private/${path}?token=test`}};}})},
    auth:{onAuthStateChange(fn){callback=fn;},async getSession(){return {data:{session:sessionUser?{user:sessionUser}:null}};},async signOut(){sessionUser=null;callback('SIGNED_OUT',null);return {};}},
    from(){let owner;return {select(){return this;},eq(_key,id){owner=id;return this;},order(){return this;},async range(from,to){if(fail)return{error:{message:'Network unavailable'}};return {data:[...remote.values()].filter(r=>r.user_id===owner).sort((a,b)=>`${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`)).slice(from,to+1).map(copy)};}};},
    async rpc(name,args){
      if(fail)return {error:{message:'Network unavailable'}};
      if(name==='import_kitchen_guest') {for(const r of args.records){const key=`${sessionUser.id}:${r.kind}:${r.id}`;if(!remote.has(key))remote.set(key,{...copy(r),user_id:sessionUser.id,version:1,deleted:false});}return {};}
      const next=new Map(remote),data=[];
      for(const change of args.changes){const key=`${sessionUser.id}:${change.kind}:${change.id}`,old=next.get(key);if((old?.version||0)!==change.expected_version)return {error:{message:'This item changed on another device.'}};const row={...copy(change),user_id:sessionUser.id,version:(old?.version||0)+1};next.set(key,row);data.push(row);}
      remote.clear();for(const [k,v]of next)remote.set(k,v);return {data};
    }
  };
  const context={window:{ANNA_APPWRITE_CONFIG:{projectId:'test'},AnnaBackend:{createClient:()=>client},dispatchEvent:e=>events.dispatchEvent(e),addEventListener:(...args)=>events.addEventListener(...args)},document:{visibilityState:'visible',addEventListener(){}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)},CustomEvent:class extends Event{},Event,structuredClone,crypto:globalThis.crypto,setTimeout,setInterval(){},fetch,AbortSignal};
  vm.runInNewContext(source,context);
  return {K:context.window.AnnaKitchen,storage,remote,async settle(){await new Promise(resolve=>setTimeout(resolve,25));},async login(user){sessionUser=user;callback('SIGNED_IN',{user});await this.settle();},offline(value){fail=value;},async recover(){callback('PASSWORD_RECOVERY',{user:sessionUser});await this.settle();}};
}
test('guest legacy data survives import, import is explicit and idempotent; logout reveals only guest data', async()=>{
 const f=fixture({local:{annaRecipeFavourites:JSON.stringify(['guest-pasta']),annaCustomRecipes:JSON.stringify([{id:'custom-soup',title:'Soup'}])}});
 await f.settle();assert.equal(f.K.list('favourite')[0].id,'guest-pasta');
 await f.login({id:'alice'});
 assert.equal(f.K.list('favourite').length,0);assert.equal(f.remote.size,0);assert.equal(f.K.hasImport(),true);
 await f.K.importGuest();assert.equal(f.remote.size,2);assert.equal(f.K.hasImport(),false);
 await f.K.remove('favourite','guest-pasta');await f.K.importGuest();assert.equal(f.K.list('favourite').length,0);
 await f.K.set('entry','private',{notes:'For Alice only'});
 assert.equal(f.storage.has('annaKitchenGuest'),false);
 assert.equal(f.storage.get('annaRecipeFavourites'),'["guest-pasta"]');
 await f.K.signOut();assert.equal(f.K.list('entry').length,0);assert.equal(f.K.list('favourite')[0].id,'guest-pasta');
 await f.login({id:'bob'});assert.equal(f.K.list('entry').length,0);assert.equal(f.K.list('recipe').length,0);
});
test('two sessions share item changes, reject stale editor versions and propagate deletes',async()=>{
 const remote=new Map(),a=fixture({initialUser:{id:'alice'},remote}),b=fixture({initialUser:{id:'alice'},remote});await Promise.all([a.settle(),b.settle()]);
 await a.K.set('recipe','original',{title:'Pasta'});await a.K.set('entry','original',{notes:'First cook'});
 await b.K.refresh();assert.equal(b.K.get('entry','original').notes,'First cook');
 const editorVersion=b.K.version('entry','original');await a.K.set('entry','original',{notes:'Fresh herbs'});
 await assert.rejects(b.K.set('entry','original',{notes:'Stale'},editorVersion),error=>/changed on another device/.test(error.message));
 assert.equal(b.K.get('entry','original').notes,'Fresh herbs');
 await b.K.set('meal','2026-11-12|Dinner',{recipe_id:'original'});await a.K.refresh();assert.equal(a.K.list('meal').length,1);
 await a.K.remove('entry','original');await b.K.refresh();assert.equal(b.K.get('entry','original'),undefined);
});
test('failed saves never report success or replace confirmed data; retry works',async()=>{
 const f=fixture({initialUser:{id:'alice'}});await f.settle();await f.K.set('entry','dinner',{notes:'Confirmed'});
 f.offline(true);await assert.rejects(f.K.set('entry','dinner',{notes:'Draft'}),error=>/Network unavailable/.test(error.message));
 assert.equal(f.K.get('entry','dinner').notes,'Confirmed');assert.match(f.K.status,/Not saved/);
 f.offline(false);await f.K.set('entry','dinner',{notes:'Retry saved'});assert.equal(f.K.get('entry','dinner').notes,'Retry saved');
});
test('all rows load beyond Supabase default page size',async()=>{
 const remote=new Map();for(let i=0;i<1100;i++)remote.set(`alice:entry:${i}`,{user_id:'alice',kind:'entry',id:String(i),data:{notes:'Memory'},version:1,deleted:false});
 const f=fixture({initialUser:{id:'alice'},remote});await f.settle();assert.equal(f.K.list('entry').length,1100);
});
test('corrupt legacy JSON does not break the guest kitchen',async()=>{
 const f=fixture({local:{annaRecipeFavourites:'{broken',annaCustomRecipes:'{}',annaKitchenGuest:'null'}});await f.settle();assert.equal(f.K.ready,true);assert.equal(f.K.list('recipe').length,0);
});

test('photo uploads require an account, enforce file limits and use owner paths',async()=>{
 const f=fixture();await f.settle();
 await assert.rejects(f.K.upload({type:'image/jpeg',size:500}),/Sign in/);
 await f.login({id:'alice'});
 await assert.rejects(f.K.upload({type:'image/svg+xml',size:500}),/Choose a JPG/);
 await assert.rejects(f.K.upload({type:'image/jpeg',size:9*1024*1024}),/smaller than 8 MB/);
 const path=await f.K.upload({type:'image/jpeg',size:500});assert.match(path,/^alice\/.+\.jpg$/);
 assert.match(await f.K.photoUrl(path),/private\/alice\//);
 assert.equal(await f.K.photoUrl('bob/private.jpg'),'');
 await f.K.signOut();assert.equal(await f.K.photoUrl(path),'');
});

test('password recovery survives an auth event before account UI loads',async()=>{
 const f=fixture({initialUser:{id:'alice'}});await f.settle();await f.recover();
 assert.equal(f.K.passwordRecovery,true);f.K.finishRecovery();assert.equal(f.K.passwordRecovery,false);
 await f.recover();await f.K.signOut();assert.equal(f.K.passwordRecovery,false);
});
