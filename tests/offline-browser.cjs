// Real service worker, IndexedDB, Appwrite SDK and isolated mock accounts. No production writes.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),prefix='/annas-recipe-database/';
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
let activeApi,transportOnline=true;
const server=http.createServer((req,res)=>{if(!transportOnline){req.socket.destroy();return;}if(req.url.startsWith('/mock/v1')){activeApi(req,res).catch(error=>{console.error(error);res.writeHead(500).end();});return;}let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!name.startsWith(prefix)){res.writeHead(404).end();return;}name=name.slice(prefix.length)||'index.html';const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(name==='appwrite-config.js'?fs.readFileSync(file,'utf8').replace('https://fra.cloud.appwrite.io/v1',`http://${req.headers.host}/mock/v1`):fs.readFileSync(file));});
const user=id=>({$id:id,email:id+'@example.test',name:id,emailVerification:true});
const row=(kind,id,data,version=1)=>({kind,id,data,version,deleted:false});
const photo='alice/dish.png';
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}${prefix}`;
 for(const [name,engine]of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.ANNA_TEST_ENGINE||process.env.ANNA_TEST_ENGINE===name)){
  browser=await engine.launch();const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
  transportOnline=true;
  let online=true,identity=user('alice'),writes=0;
  let records=[row('recipe','custom-offline',{id:'custom-offline',title:'Alice’s offline soup',time:20,servings:2,ingredients:['2 carrots','1 litre water'],steps:['Simmer carrots.','Serve warm.'],photo}),row('entry','custom-offline',{notes:'A private kitchen memory.',photo}),row('favourite','custom-offline',{}),row('history','memory',{recipe_id:'custom-offline',notes:'A cold November evening',photo})];
  async function connection(value){
   online=value;transportOnline=value;
   // Playwright's WebKit offline switch rejects new-page navigations before the SW.
   // Disconnect the HTTP transport in WebKit; Chromium also disables its network stack.
   if(name==='chromium')await ctx.setOffline(!value);
  }
  activeApi=async(req,res)=>{
   if(!online){req.socket.destroy();return;}
   const url=new URL(req.url,base);let value;
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks).toString();
   if(url.pathname.endsWith('/account')&&req.method==='GET')value=identity;
   else if(url.pathname.includes('/account/sessions/')&&req.method==='DELETE'){identity=null;value={};}
   else if(url.pathname.endsWith('/account/sessions/email')){identity=user('bob');value={$id:'bob-session'};}
   else if(url.pathname.endsWith('/executions')){
    const body=JSON.parse(JSON.parse(raw).body);
    if(body.action==='list')value={responseStatusCode:200,responseBody:JSON.stringify({data:records})};
    else {writes++;const data=body.changes.map(c=>({...c,version:c.expected_version+1}));for(const r of data){records=records.filter(old=>old.kind!==r.kind||old.id!==r.id);records.push(r);}value={responseStatusCode:200,responseBody:JSON.stringify({data})};}
   }else if(url.pathname.endsWith('/view')){res.setHeader('Content-Type','image/jpeg');res.end(fs.readFileSync(path.join(root,'assets/tomato-orzo.jpg')));return;}
   else if(url.pathname.includes('/files/'))value={mimeType:'image/jpeg'};
   else throw new Error('Unexpected Appwrite request: '+req.method+' '+url.pathname);
   res.writeHead(value?200:401,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value||{message:'No session',code:401}));
  };
  if(process.env.ANNA_OFFLINE_DEBUG==='1')await ctx.addInitScript(()=>window.addEventListener('kitchen:change',()=>console.log('K-state',JSON.stringify({user:window.AnnaKitchen?.user,status:window.AnnaKitchen?.status}))));
  let page=await ctx.newPage();if(process.env.ANNA_OFFLINE_DEBUG==='1')page.on('console',m=>console.log('Browser',m.text()));if(process.env.ANNA_OFFLINE_DEBUG==='1')page.on('response',r=>{if(r.status()>=400)console.log('Response error',r.status(),r.url());});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(online)console.error('Online request failed:',r.url(),r.failure());});
  await page.goto(base+'cookbook.html');
  if(process.env.ANNA_OFFLINE_DEBUG==='1')console.log('Session debug',await page.evaluate(async()=>({session:await AnnaKitchen.client.auth.getSession(),status:AnnaKitchen.status,storage:{...localStorage}})));
  await page.waitForFunction(()=>AnnaKitchen.status.includes('available offline')).catch(async e=>{console.error(await page.evaluate(async()=>({status:AnnaKitchen.status,user:AnnaKitchen.user,cache:await AnnaOffline.restore(),storage:{...localStorage},shell:AnnaOffline.shellReady,sw:(await navigator.serviceWorker.getRegistration())?.active?.state})));throw e;});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  assert.equal(await page.locator('.memory-card h3').innerText(),'Alice’s offline soup');
  assert.ok(await page.evaluate(()=>AnnaKitchen.photoUrl('alice/dish.png')));
  const cached=await page.evaluate(async()=>{const result=[];for(const name of await caches.keys())for(const req of await(await caches.open(name)).keys())result.push(req.url);return result;});
  assert.ok(cached.length>40);assert.ok(cached.every(url=>url.startsWith(base)&&!url.includes('secret=')&&!url.includes('appwrite.io')));
  // A completely new document, not an already loaded screen, must work offline.
  await connection(false);await page.close();page=await ctx.newPage();
  await page.goto(base+'cookbook.html');await page.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);
  assert.equal(await page.locator('.memory-card h3').innerText(),'Alice’s offline soup');
  assert.equal(await page.locator('.memory-card .memory-copy>p:not(.eyebrow)').innerText(),'A private kitchen memory.');
  await page.locator('.memory-card img[data-photo]').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('.memory-card img[data-photo]').naturalWidth>0);
  assert.match(await page.evaluate(()=>AnnaKitchen.set('entry','custom-offline',{notes:'Must not save'}).then(()=>'',e=>e.message)),/Go online/);assert.equal(writes,0);
  await page.goto(base+'index.html#recipe=custom-offline');await page.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);
  await page.locator('#recipe-dialog').waitFor({state:'visible'});assert.match(await page.locator('#recipe-dialog').innerText(),/Alice’s offline soup/);
  assert.match(await page.locator('#recipe-dialog').innerText(),/2 carrots/);
  await page.goto(base+'planner.html');await page.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);
  await page.goto(base+'cookbook.html?tab=history');await page.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);
  assert.match(await page.locator('.history-list').innerText(),/A cold November evening/);
  // Reauthentication on reconnect imports server edits and tombstones, never the offline draft.
  records=records.filter(r=>r.kind!=='history').map(r=>r.kind==='entry'?row('entry',r.id,{notes:'Edited on another device.'},2):r.kind==='recipe'?row('recipe',r.id,{...r.data,photo:null},2):r);
  await connection(true);await page.evaluate(()=>AnnaKitchen.refresh());
  await page.waitForFunction(()=>!AnnaKitchen.offline&&AnnaKitchen.status.includes('available offline'));
  assert.equal(await page.evaluate(()=>AnnaKitchen.get('entry','custom-offline').notes),'Edited on another device.');assert.equal(await page.evaluate(()=>AnnaKitchen.list('history').length),0);
  assert.equal(await page.evaluate(()=>AnnaOffline.photo('alice','alice/dish.png')),'');
  // Offline logout erases private snapshots and blocks silent cookie login.
  await connection(false);
  const other=await ctx.newPage();await other.goto(base+'cookbook.html');await other.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.user?.id==='alice');
  await page.evaluate(()=>AnnaKitchen.signOut());
  await other.waitForFunction(()=>AnnaKitchen.ready&&!AnnaKitchen.user);assert.equal(await other.evaluate(()=>AnnaKitchen.list('recipe').length),0);await other.close();
  assert.equal(await page.evaluate(async()=>new Promise((resolve,reject)=>{const open=indexedDB.open('anna-kitchen-offline:'+new URL('./',location.href).pathname);open.onsuccess=()=>{const tx=open.result.transaction(['state','photos']);let count=0;for(const name of ['state','photos']){const request=tx.objectStore(name).count();request.onsuccess=()=>{count+=request.result;};}tx.oncomplete=()=>{open.result.close();resolve(count);};};open.onerror=()=>reject(open.error);})),0);
  await page.reload();await page.waitForFunction(()=>AnnaKitchen.ready);assert.equal(await page.evaluate(()=>AnnaKitchen.user),null);
  assert.equal(await page.evaluate(()=>AnnaKitchen.list('recipe').length),0);
  assert.equal(await page.evaluate(()=>AnnaOffline.restore()),null);
  await connection(true);await page.evaluate(()=>AnnaKitchen.refresh());assert.equal(await page.evaluate(()=>AnnaKitchen.user),null);
  // A different explicit login replaces the account download.
  records=[row('entry','tomato-orzo',{notes:'Bob only.'})];
  const signin=await page.evaluate(()=>AnnaKitchen.client.auth.signInWithPassword({email:'bob@example.test',password:'mock-only'}));assert.equal(signin.error,null);
  await page.waitForFunction(()=>AnnaKitchen.user?.id==='bob'&&AnnaKitchen.status.includes('available offline'));
  await connection(false);await page.reload();await page.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);
  assert.equal(await page.evaluate(()=>AnnaKitchen.user.id),'bob');assert.equal(await page.evaluate(()=>AnnaKitchen.get('entry','tomato-orzo').notes),'Bob only.');assert.equal(await page.evaluate(()=>AnnaKitchen.get('recipe','custom-offline')),undefined);assert.equal(await page.evaluate(()=>AnnaKitchen.photoUrl('alice/dish.png')),'');
  // A full device must not turn a confirmed cloud save into a failed save.
  await connection(true);await page.evaluate(()=>AnnaKitchen.refresh());
  await page.waitForFunction(()=>!AnnaKitchen.offline&&AnnaKitchen.status.includes('available offline'));
  await page.evaluate(()=>{window.originalDownload=AnnaOffline.save;AnnaOffline.save=async()=>{throw new DOMException('Device full','QuotaExceededError');};});
  await page.evaluate(()=>AnnaKitchen.set('entry','quota-check',{notes:'Confirmed cloud save despite full device.'}));
  await page.waitForFunction(()=>AnnaKitchen.status.includes('offline download incomplete'));
  assert.equal(await page.evaluate(()=>AnnaKitchen.get('entry','quota-check').notes),'Confirmed cloud save despite full device.');assert.equal(writes,1);
  await page.evaluate(()=>{AnnaOffline.save=window.originalDownload;return AnnaKitchen.refresh();});
  await page.waitForFunction(()=>AnnaKitchen.status.includes('available offline'));
  // An expired session online invalidates the download instead of restoring it.
  identity=null;await page.evaluate(()=>AnnaKitchen.refresh());await page.waitForFunction(()=>AnnaKitchen.ready&&!AnnaKitchen.user);
  assert.equal(await page.evaluate(()=>AnnaOffline.restore()),null);
  // Existing guest recipes also survive an offline cold launch without an account snapshot.
  await page.evaluate(()=>AnnaKitchen.set('recipe','guest-offline',{id:'guest-offline',title:'Guest offline soup',ingredients:['A carrot'],steps:['Simmer.']}));
  await connection(false);await page.reload();await page.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);
  assert.equal(await page.evaluate(()=>AnnaKitchen.get('recipe','guest-offline').title),'Guest offline soup');assert.equal(await page.evaluate(()=>AnnaKitchen.user),null);
  // Shell/font/image requests are all local; no private response is put in CacheStorage.
  assert.deepEqual(errors,[]);
  await ctx.close();await browser.close();browser=null;
  console.log(`${name}: cold offline launch, private photo, recipe method, history, planner, blocked edits, reconnect, logout and account isolation passed`);
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
