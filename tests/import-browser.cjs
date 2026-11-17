// Isolated real UI/SDK + service worker tests. Server records and files are disposable fixtures.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');let api,online=true,browser;
const server=http.createServer((req,res)=>{if(!online){req.socket.destroy();return;}if(req.url.startsWith('/mock/v1')){api(req,res).catch(error=>{console.error(error);res.writeHead(500).end();});return;}const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(name==='appwrite-config.js'?fs.readFileSync(file,'utf8').replace('https://fra.cloud.appwrite.io/v1',`http://${req.headers.host}/mock/v1`):fs.readFileSync(file));});
(async()=>{
 const {extractRecipe}=await import('../appwrite/functions/kitchen-sync/recipe-import.js');
 const markup=Buffer.from('<meta charset="utf-8"><script type="application/ld+json">'+JSON.stringify({'@type':'Recipe',name:'Mum’s lemon pasta',description:'A family favourite.',recipeIngredient:['200 g pasta','1 tbsp oil, plus extra'],recipeInstructions:[{text:'Boil pasta.'},{text:'Add oil and serve.'}],recipeYield:'2 servings',totalTime:'PT20M',author:{name:'Mum'}})+'</script>');
 const draft=extractRecipe(markup,'https://recipes.example/lemon-pasta');draft.image={type:'image/jpeg',base64:fs.readFileSync(path.join(root,'assets/tomato-orzo.jpg')).toString('base64')};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
 for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
  online=true;let records=[],saves=0,uploads=0,imports=0,rejectSave=false,failImport=false,delayImport=false,release;
  api=async(req,res)=>{
   let response;const url=new URL(req.url,base),chunks=[];for await(const chunk of req)chunks.push(chunk);
   if(url.pathname.endsWith('/account'))response={$id:'alice',email:'alice@example.test',name:'Anna',emailVerification:true};
   else if(url.pathname.endsWith('/executions')){
    const payload=JSON.parse(JSON.parse(Buffer.concat(chunks).toString()).body);
    if(payload.action==='list')response={responseStatusCode:200,responseBody:JSON.stringify({data:records})};
    else if(payload.action==='import-link'){imports++;if(delayImport)await new Promise(r=>release=r);response={responseStatusCode:failImport?400:200,responseBody:JSON.stringify(failImport?{error:{message:'No readable recipe was found.',code:400}}:{data:draft})};}
    else if(payload.action==='save'){
     saves++;let next=structuredClone(records),data=[],conflict=false;
     for(const change of payload.changes){const previous=next.find(r=>r.kind===change.kind&&r.id===change.id);if((previous?.version||0)!==change.expected_version){conflict=true;break;}const row={...change,version:change.expected_version+1};next=next.filter(r=>r.kind!==change.kind||r.id!==change.id);next.push(row);data.push(row);}
     if(rejectSave||conflict)response={responseStatusCode:409,responseBody:JSON.stringify({error:{message:'This item changed on another device. Review before saving.',code:409}})};
     else {records=next;response={responseStatusCode:200,responseBody:JSON.stringify({data})};}
    }else throw new Error('Unexpected action '+payload.action);
   }else if(url.pathname.endsWith('/files')&&req.method==='POST'){uploads++;response={$id:'fixture-photo',mimeType:'image/jpeg'};}
   else if(url.pathname.endsWith('/view')){res.setHeader('Content-Type','image/jpeg');res.end(fs.readFileSync(path.join(root,'assets/tomato-orzo.jpg')));return;}
   else if(url.pathname.includes('/files/'))response={mimeType:'image/jpeg'};
   else throw new Error('Unexpected endpoint '+url.pathname);
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(response));
  };
  browser=await engine.launch();const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'cookbook.html');await page.waitForFunction(()=>AnnaKitchen.ready&&AnnaOffline.shellReady);
  await page.getByRole('button',{name:'Import a link ↗',exact:true}).click();
  const importer=page.locator('#recipe-import-dialog'),form=page.locator('#custom-recipe-form');
  await importer.locator('[name=url]').fill('https://recipes.example/lemon-pasta');await importer.locator('[name=newFolder]').fill('Mum’s recipes');
  await importer.getByRole('button',{name:'Preview recipe ↗'}).click();await form.waitFor({state:'visible'});
  assert.equal(await form.locator('[name=title]').inputValue(),'Mum’s lemon pasta');assert.equal(await form.locator('[name=ingredients]').inputValue(),'200 g pasta\n1 tbsp oil, plus extra');
  assert.equal(records.length,0);assert.equal(uploads,0);assert.equal(saves,0);
  await form.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(records.length,0);
  // Failed extraction stays in the importer with no partial writes.
  failImport=true;await page.getByRole('button',{name:'Import a link ↗',exact:true}).click();await importer.locator('[name=url]').fill('https://recipes.example/not-a-recipe');await importer.getByRole('button',{name:'Preview recipe ↗'}).click();await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('No readable recipe'));assert.equal(saves,0);await importer.getByRole('button',{name:'Cancel',exact:true}).click();failImport=false;
  // Save failure preserves the review, and the folder/entry/recipe transaction stays atomic.
  await page.getByRole('button',{name:'Import a link ↗',exact:true}).click();await importer.locator('[name=url]').fill('https://recipes.example/lemon-pasta');await importer.locator('[name=newFolder]').fill('Mum’s recipes');await importer.getByRole('button',{name:'Preview recipe ↗'}).click();await form.waitFor({state:'visible'});
  rejectSave=true;await form.getByRole('button',{name:'Save recipe ↗',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#editor-status').textContent.startsWith('Not saved:'));assert.equal(records.length,0);assert.equal(await form.locator('[name=title]').inputValue(),'Mum’s lemon pasta');assert.equal(uploads,1);
  rejectSave=false;await form.getByRole('button',{name:'Save recipe ↗',exact:true}).click();await form.waitFor({state:'hidden'});
  assert.equal(uploads,1,'Retry reuses the private photo already uploaded');assert.equal(records.length,3);
  const recipe=records.find(r=>r.kind==='recipe'),folder=records.find(r=>r.kind==='collection'),entry=records.find(r=>r.kind==='entry');assert.equal(recipe.data.sourceAuthor,'Mum');assert.equal(recipe.data.sourceUrl,'https://recipes.example/lemon-pasta');assert.match(recipe.data.photo,/^alice\//);assert.equal(recipe.data.image,'');assert.deepEqual(entry.data.collection_ids,[folder.id]);
  await page.getByRole('button',{name:/▤ Mum’s recipes/}).click();assert.equal(await page.locator('.memory-card').count(),1);
  // Duplicate import offers the existing editor rather than creating another recipe.
  const before=imports;await page.getByRole('button',{name:'Import a link ↗',exact:true}).click();await importer.locator('[name=url]').fill('https://recipes.example/lemon-pasta?utm_source=fixture');await importer.getByRole('button',{name:'Preview recipe ↗'}).click();await importer.getByRole('button',{name:'Open saved recipe ↗'}).waitFor();assert.equal(imports,before);await importer.getByRole('button',{name:'Open saved recipe ↗'}).click();await form.waitFor({state:'visible'});
  // Moving between folders preserves the imported source and diary metadata.
  await form.locator('[name=folderIds]').uncheck();await form.locator('[name=newFolder]').fill('Weeknight dinners');await form.getByRole('button',{name:'Save recipe ↗'}).click();await form.waitFor({state:'hidden'});
  assert.equal(records.filter(r=>r.kind==='recipe').length,1);assert.equal(records.find(r=>r.kind==='recipe').data.sourceAuthor,'Mum');
  await page.getByRole('button',{name:/▤ Weeknight dinners/}).click();assert.equal(await page.locator('.memory-card').count(),1);
  // Rename/remove folders keep the recipe. Source attribution is clickable in recipe view.
  page.on('dialog',d=>d.type()==='prompt'?d.accept('Everyday favourites'):d.accept());await page.getByRole('button',{name:'Manage folders',exact:true}).click();await page.locator('[data-rename-collection]').last().click();await page.waitForFunction(()=>AnnaKitchen.list('collection').some(r=>r.data.name==='Everyday favourites'));await page.locator('#journal-dialog').waitFor({state:'hidden'});await page.getByRole('button',{name:'Manage folders',exact:true}).click();await page.locator('[data-delete-collection]').first().click();await page.locator('#journal-dialog').waitFor({state:'hidden'});assert.equal(records.find(r=>r.kind==='recipe').data.sourceAuthor,'Mum');
  await page.goto(base+'index.html#recipe='+recipe.id);await page.locator('#recipe-dialog').waitFor({state:'visible'});assert.equal(await page.getByRole('link',{name:'View original recipe ↗'}).getAttribute('href'),'https://recipes.example/lemon-pasta');
  await page.goto(base+'cookbook.html');await page.waitForFunction(()=>AnnaKitchen.status.includes('available offline'));await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.screenshot({path:`tests/import-folders-${name}-mobile.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Cold reopen checks imported recipe, folder membership, source and downloaded photo.
  online=false;if(name==='chromium')await context.setOffline(true);await page.close();const cold=await context.newPage();await cold.goto(base+'cookbook.html');await cold.waitForFunction(()=>AnnaKitchen.ready&&AnnaKitchen.offline);await cold.getByRole('button',{name:/▤ Everyday favourites/}).click();assert.equal(await cold.locator('.memory-card').count(),1);await cold.waitForFunction(()=>document.querySelector('.memory-art img').naturalWidth>0);
  assert.deepEqual(errors,[]);await context.close();await browser.close();browser=null;console.log(`${name}: link preview/cancel/failure, atomic save/retry, private photo, duplicates, folders, attribution, phone layout and offline cold reopen passed`);
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
