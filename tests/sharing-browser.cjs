// Two real browser accounts + anonymous browsing against the actual server handler.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./helpers/social-fixture.cjs');
const root=path.resolve(__dirname,'..'),users={alice:{$id:'alice',email:'alice@example.test',name:'Anna',emailVerification:true},mum:{$id:'mum',email:'mum@example.test',name:'Mamá',emailVerification:true}};
const online={alice:true,mum:true,guest:true};let tables,handler,browser;
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost'),parts=url.pathname.split('/').filter(Boolean),who=parts[0]==='mock'?parts[1]:parts[0];
  if(online[who]===false){req.socket.destroy();return;}
  if(parts[0]==='mock'){
   if(url.pathname.endsWith('/account')){json(res,users[who]||{message:'No session',code:401},users[who]?200:401);return;}
   if(url.pathname.endsWith('/executions')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(JSON.parse(Buffer.concat(chunks).toString()).body);const result=await handler({req:{bodyJson:body,caller:users[who]},res:{json:(data,code=200)=>({data,code})},error:console.error});json(res,{status:'completed',responseStatusCode:result.code,responseBody:JSON.stringify(result.data)});return;}
   if(url.pathname.includes('/tablesdb/')){
    let visible=[...tables.rows.values()].filter(r=>!r.deleted&&r.$permissions.includes('read("any")'));
    if(!url.pathname.endsWith('/rows')){const row=visible.find(r=>r.$id===parts.at(-1));json(res,row||{message:'Not public',code:403},row?200:403);return;}
    let offset=0,limit=25;for(const raw of url.searchParams.getAll('queries[]')){const q=JSON.parse(raw);if(q.method==='limit')limit=q.values[0];if(q.method==='offset')offset=q.values[0];if(q.method==='orderDesc')visible.sort((a,b)=>b.$updatedAt.localeCompare(a.$updatedAt));}json(res,{rows:visible.slice(offset,offset+limit),total:visible.length});return;
   }
   if(url.pathname.endsWith('/view')){res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(fs.readFileSync(path.join(root,'assets/tomato-orzo.jpg')));return;}
   if(url.pathname.includes('/files/')){json(res,{mimeType:'image/jpeg'});return;}
   throw new Error('Unexpected mock API '+req.method+' '+url.pathname);
  }
  const name=parts.slice(1).join('/')||'index.html',file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(name==='appwrite-config.js'?fs.readFileSync(file,'utf8').replace('https://fra.cloud.appwrite.io/v1',`http://${req.headers.host}/mock/${who}/v1`):fs.readFileSync(file));
 }catch(error){console.error(error);json(res,{message:error.message},500);}
});
(async()=>{
 const {createHandler}=await import('../appwrite/functions/kitchen-sync/main.js');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 for(const [engineName,engine]of [['chromium',chromium],['webkit',webkit]]){
  tables=fixture();handler=createHandler({tables,authenticate:async req=>req.caller});for(const who of Object.keys(online))online[who]=true;
  browser=await engine.launch();const contexts={},pages={},errors=[];
  for(const who of ['alice','mum','guest']){contexts[who]=await browser.newContext({viewport:{width:390,height:844}});pages[who]=await contexts[who].newPage();pages[who].on('pageerror',error=>errors.push(who+': '+error.message));}
  const a=pages.alice,m=pages.mum,g=pages.guest,base=who=>origin+'/'+who+'/';
  const ready=p=>p.waitForFunction(()=>AnnaKitchen.ready);
  await Promise.all([a.goto(base('alice')+'cookbook.html'),m.goto(base('mum')+'cookbook.html')]);await Promise.all([ready(a),ready(m)]);
  // Owner creates a cookbook; the invitation appears only in the matching email account.
  await a.getByRole('button',{name:'Create shared cookbook ↗',exact:true}).click();
  await a.locator('#create-book-form [name=name]').fill('Our family cookbook');await a.locator('#create-book-form [name=displayName]').fill('Anna');await a.locator('#create-book-form [type=submit]').click();
  await a.getByRole('heading',{name:'Our family cookbook',exact:true}).waitFor();
  const bookId=await a.evaluate(()=>AnnaKitchen.list('shared_book_view')[0].id);
  await a.getByText('Members & invitations',{exact:true}).click();await a.locator('#invite-member-form [name=email]').fill('mum@example.test');await a.locator('#invite-member-form [type=submit]').click();
  await a.waitForFunction(()=>AnnaKitchen.list('shared_book_view')[0].data.pending.length===1);
  await m.evaluate(()=>AnnaKitchen.refresh());await m.getByRole('button',{name:'Accept invitation',exact:true}).click();await m.locator('#sharing-dialog [name=displayName]').fill('Mamá');await m.getByRole('button',{name:'Accept and join ↗'}).click();await m.getByRole('heading',{name:'Our family cookbook',exact:true}).waitFor();
  await m.locator('#sharing-dialog .dialog-close').click();await a.locator('#sharing-dialog .dialog-close').click();
  // An account recipe contains private journal text and an owner-only photo.
  await a.evaluate(async()=>{const data={id:'private-pasta',title:'Shared lemon pasta',description:'A family favourite.',ingredients:['200 g pasta','1 tbsp oil'],steps:['Boil pasta.','Add oil.'],time:20,servings:2,category:'main',tags:[],equipment:[],photo:'alice/private-dish.jpg',sourceUrl:'https://recipes.example/pasta',sourceAuthor:'Original author'};await AnnaKitchen.batch([{kind:'recipe',id:data.id,data,deleted:false},{kind:'entry',id:data.id,data:{notes:'SECRET DIARY NEVER SHARE',rating:5},deleted:false}]);});
  await a.getByRole('button',{name:'Share / publish ↗',exact:true}).click();
  const share=a.locator('#share-recipe-form');await share.locator('[name=target]').selectOption(bookId);await share.locator('[name=includePhoto]').check();await share.getByRole('button',{name:'Share with cookbook ↗'}).click();
  await a.getByRole('heading',{name:'Our family cookbook',exact:true}).waitFor();await a.locator('#sharing-dialog').getByRole('heading',{name:'Shared lemon pasta',exact:true}).waitFor();
  await m.evaluate(()=>AnnaKitchen.refresh());await m.locator('[data-open-book]').click();await m.locator('#sharing-dialog').getByRole('heading',{name:'Shared lemon pasta',exact:true}).waitFor();
  assert.equal(await m.locator('[data-edit-shared]').count(),0);await m.locator('[data-open-shared]').last().click();await m.locator('#recipe-dialog').waitFor({state:'visible'});assert.ok(!(await m.locator('#recipe-dialog').innerText()).includes('SECRET DIARY'));
  // Personal editing forks the snapshot, including its image, without touching the shared recipe.
  await m.getByRole('button',{name:'Make a private edit',exact:true}).click();await m.locator('#custom-recipe-form [name=title]').fill('Mum’s personal pasta');await m.locator('#custom-recipe-form [type=submit]').click();await m.locator('#custom-recipe-dialog').waitFor({state:'hidden'});
  assert.equal(await m.evaluate(()=>AnnaKitchen.list('recipe')[0].data.title),'Mum’s personal pasta');assert.match(await m.evaluate(()=>AnnaKitchen.list('recipe')[0].data.image),/^data:image\/jpeg/);
  assert.equal(JSON.parse([...tables.rows.values()].find(r=>r.kind==='shared_recipe'&&!r.deleted).payload).recipe.title,'Shared lemon pasta');
  // Member-only recipe links open the cookbook and its recipe from a fresh document.
  const sharedId=await m.evaluate(()=>AnnaKitchen.list('shared_recipe_view')[0].id);
  await m.goto(base('mum')+'cookbook.html?sharedBook='+bookId+'&sharedRecipe='+sharedId);await m.locator('#recipe-dialog').waitFor({state:'visible'});await m.locator('#dialog-close').click();
  // The contributor updates the shared copy; the private original and Mum's fork stay unchanged.
  await a.locator('[data-edit-shared]').click();await a.locator('#custom-recipe-form [name=title]').fill('Shared lemon pasta, updated');await a.locator('#custom-recipe-form [type=submit]').click();await a.locator('#custom-recipe-dialog').waitFor({state:'hidden'});
  assert.equal(await a.evaluate(()=>AnnaKitchen.get('recipe','private-pasta').title),'Shared lemon pasta');
  await m.evaluate(()=>AnnaKitchen.refresh());await m.getByRole('heading',{name:'Shared lemon pasta, updated',exact:true}).waitFor();
  assert.equal(await m.evaluate(()=>AnnaKitchen.list('recipe')[0].data.title),'Mum’s personal pasta');
  // Publish is an explicit reviewed action. Only its allowlisted snapshot is publicly readable.
  await a.locator('#sharing-dialog .dialog-close').click();await a.getByRole('button',{name:'Share / publish ↗',exact:true}).click();await share.locator('[name=target]').selectOption('public');await share.locator('[name=includePhoto]').check();
  assert.equal([...tables.rows.values()].filter(r=>r.kind==='publication').length,0);
  await share.getByRole('button',{name:'Publish in All recipes ↗'}).click();assert.equal([...tables.rows.values()].filter(r=>r.kind==='publication').length,0);
  await share.locator('[name=permission]').check();await share.getByRole('button',{name:'Publish in All recipes ↗'}).click();await a.locator('#sharing-dialog').waitFor({state:'hidden'});
  const published=[...tables.rows.values()].find(r=>r.kind==='publication'),publicRecipe=JSON.parse(published.payload);assert.equal(publicRecipe.sourceAuthor,'Original author');assert.ok(!published.payload.includes('SECRET DIARY'));assert.ok(!published.payload.includes('private-dish'));assert.deepEqual(published.$permissions,['read("any")']);
  await g.goto(base('guest')+'index.html?view=recipes');await ready(g);await g.locator('#recipe-origin').selectOption('community');await g.getByRole('article',{name:'View Shared lemon pasta',exact:true}).waitFor();
  await g.getByRole('article',{name:'View Shared lemon pasta',exact:true}).click();await g.locator('#recipe-dialog').getByRole('heading',{name:'Shared lemon pasta',exact:true}).waitFor();assert.match(await g.locator('#recipe-dialog').innerText(),/Shared by Anna/);assert.equal(await g.getByRole('link',{name:'View original recipe ↗'}).getAttribute('href'),'https://recipes.example/pasta');
  await g.getByRole('button',{name:'Save a private copy',exact:true}).click();await g.waitForFunction(()=>AnnaKitchen.list('recipe').length===1);const guestCopy=await g.evaluate(()=>AnnaKitchen.list('recipe')[0].data);assert.equal(guestCopy.sourceSnapshotId,publicRecipe.id);assert.equal(guestCopy.isCommunity,undefined);
  // Personal notes and planning use the saved copy, never the public source record.
  await g.locator('.recipe-tabs [data-tab=method]').click();await g.locator('#personal-note').fill('A guest-only kitchen note.');await g.locator('#save-note').click();await g.waitForFunction(()=>AnnaKitchen.list('entry').some(r=>r.data.notes==='A guest-only kitchen note.'));assert.ok(![...tables.rows.values()].find(r=>r.kind==='publication').payload.includes('guest-only'));
  await g.locator('#plan-recipe').click();await g.waitForURL(/planner.html\?add=custom-copy-/);await ready(g);assert.ok(await g.locator('.meal-choice').first().isEnabled());
  await g.goto(base('guest')+'index.html?view=recipes');await ready(g);await g.locator('#recipe-origin').selectOption('community');await g.getByRole('article',{name:'View Shared lemon pasta',exact:true}).waitFor();
  // Unpublishing removes public discovery/read access, while previously saved personal copies remain.
  await a.evaluate(()=>AnnaCustomRecipes.remove('private-pasta'));await a.locator('[data-manage-unpublish]').waitFor();a.once('dialog',d=>d.accept());await a.locator('[data-manage-unpublish]').click();await a.waitForFunction(()=>AnnaKitchen.list('publication_ref')[0].data.unpublished);
  await g.evaluate(()=>AnnaKitchen.communityRefresh());assert.equal(await g.getByRole('article',{name:'View Shared lemon pasta',exact:true}).count(),0);assert.equal(await g.evaluate(()=>AnnaKitchen.list('recipe').length),1);
  assert.deepEqual([...tables.rows.values()].find(r=>r.kind==='publication').$permissions,[]);
  // Revocation prunes a former member's downloaded shared data after reconnection, not their own forks.
  await m.waitForFunction(()=>AnnaKitchen.status.includes('available offline'));online.mum=false;if(engineName==='chromium')await contexts.mum.setOffline(true);await m.close();const cold=await contexts.mum.newPage();await cold.goto(base('mum')+'cookbook.html');await cold.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);await cold.locator('[data-open-book]').click();await cold.getByRole('heading',{name:'Shared lemon pasta, updated',exact:true}).waitFor();
  await a.locator('[data-open-book]').click();await a.getByText('Members & invitations',{exact:true}).click();await a.locator('[data-remove-member="mum"]').click();await a.waitForFunction(()=>AnnaKitchen.list('shared_book_view')[0].data.members.length===1);
  online.mum=true;if(engineName==='chromium')await contexts.mum.setOffline(false);await cold.evaluate(()=>AnnaKitchen.refresh());await cold.waitForFunction(()=>AnnaKitchen.status.includes('available offline'));assert.equal(await cold.locator('[data-open-book]').count(),0);assert.equal(await cold.evaluate(()=>AnnaKitchen.list('shared_recipe_view').length),0);assert.equal(await cold.evaluate(()=>AnnaKitchen.list('recipe')[0].data.title),'Mum’s personal pasta');
  await a.locator('#sharing-dialog .dialog-close').click();await a.screenshot({path:`tests/sharing-${engineName}-phone.png`,fullPage:true});assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  for(const context of Object.values(contexts))await context.close();await browser.close();browser=null;console.log(`${engineName}: separate accounts, invitation acceptance, shared photos, contribution editing, personal forks, public discovery, source credit, unpublishing, offline shared reading and revocation passed`);
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
