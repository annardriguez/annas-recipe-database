const {test}=require('node:test');const assert=require('node:assert/strict');
const modulePromise=import('../appwrite/functions/kitchen-sync/recipe-import.js');
const fetchPromise=import('../appwrite/functions/kitchen-sync/safe-fetch.js');
const page=object=>Buffer.from(`<html><head><meta property="og:site_name" content="Family table"><script type="application/ld+json">${JSON.stringify(object).replace(/</g,'\\u003c')}</script></head></html>`);
const recipe={'@type':'Recipe',name:'Mum’s <em>lemon</em> pasta',description:'Dinner &amp; love',recipeIngredient:['200 g pasta','1 tbsp oil, plus extra'],recipeInstructions:[{'@type':'HowToSection',name:'Pasta',itemListElement:[{'@type':'HowToStep',text:'Boil the pasta.'},{'@type':'HowToStep',text:'<p>Add oil.</p><script>bad()</script>'}]}],recipeYield:'4 servings',totalTime:'PT25M',prepTime:'PT5M',cookTime:'PT20M',author:{'@type':'Person',name:'Mum'},image:{url:'/photo.jpg'},nutrition:{calories:'300 calories'}};
test('extracts JSON-LD graph, sections, entities and source without executing HTML or inventing nutrition',async()=>{
 const {extractRecipe}=await modulePromise;const result=extractRecipe(page({'@graph':[{'@type':'Article'},recipe]}),'https://recipes.example/lemon');
 assert.equal(result.recipe.title,'Mum’s lemon pasta');assert.equal(result.recipe.description,'Dinner & love');assert.deepEqual(result.recipe.steps,['Boil the pasta.','Add oil.']);assert.equal(result.recipe.servings,4);assert.equal(result.recipe.time,25);assert.equal(result.recipe.sourceAuthor,'Mum');assert.equal(result.recipe.sourceUrl,'https://recipes.example/lemon');assert.equal(result.imageUrl,'https://recipes.example/photo.jpg');assert.equal(result.recipe.calories,undefined);assert.match(result.warnings.join(' '),/Nutrition was left blank/);
});
test('missing fields and ambiguous yields are explicit; malformed/no-recipe pages do not invent a method',async()=>{
 const {extractRecipe}=await modulePromise;const result=extractRecipe(page({...recipe,recipeInstructions:undefined,recipeYield:'24 cookies',totalTime:undefined}),'https://recipes.example/lemon');
 assert.deepEqual(result.recipe.steps,[]);assert.equal(result.recipe.time,null);assert.equal(result.recipe.servings,null);assert.match(result.warnings.join(' '),/24 cookies/);assert.match(result.warnings.join(' '),/method was missing/);
 assert.throws(()=>extractRecipe(Buffer.from('<script type="application/ld+json">{broken</script><p>A blog</p>'),'https://recipes.example/'),/No readable recipe/);
 const micro=extractRecipe(Buffer.from('<article itemscope itemtype="https://schema.org/Recipe"><h1 itemprop="name">Soup</h1><p itemprop="recipeIngredient">2 carrots</p><p itemprop="recipeInstructions">Simmer.</p><meta itemprop="totalTime" content="PT30M"></article>'),'https://recipes.example/soup');assert.equal(micro.recipe.title,'Soup');assert.deepEqual(micro.recipe.ingredients,['2 carrots']);assert.equal(micro.recipe.time,30);
});
test('SSRF guard rejects loopback, private, metadata, mapped IPv6, unusual ports and credentials',async()=>{
 const {websiteURL,publicAddress,safeFetch}=await fetchPromise;
 for(const value of ['127.0.0.1','0.0.0.0','10.2.3.4','169.254.169.254','172.16.0.1','192.168.1.1','100.100.100.200','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1'])assert.equal(publicAddress(value),false,value);
 for(const value of ['http://127.1/','http://2130706433/','https://192.168.1.1/','http://[::1]/','file:///etc/passwd','https://user:secret@example.com/','https://example.com:444/','http://localhost/','http://foo.local/'])assert.throws(()=>websiteURL(value),undefined,value);
 await assert.rejects(safeFetch('https://recipes.example/',{resolve:async()=>[{address:'169.254.169.254',family:4}],transport(){throw new Error('Must not connect');}}),/public recipe website/);
 await assert.rejects(safeFetch('https://recipes.example/',{resolve:async()=>[{address:'8.8.8.8',family:4},{address:'::1',family:6}],transport(){throw new Error('Must not connect');}}),/public recipe website/);
});
test('validated DNS is pinned; redirects are revalidated and decompressed responses are bounded',async()=>{
 const {safeFetch}=await fetchPromise,{PassThrough}=require('node:stream'),{EventEmitter}=require('node:events'),zlib=require('node:zlib');
 const fake=(headers,body,status=200,onOptions=()=>{})=>(_url,options,callback)=>{onOptions(options);const request=new EventEmitter();request.end=()=>{const res=new PassThrough();res.statusCode=status;res.headers=headers;callback(res);res.end(body);};return request;};
 const resolve=async()=>[{address:'8.8.8.8',family:4}];let pinned;
 const ok=await safeFetch('https://recipes.example/',{resolve,transport:fake({'content-type':'text/html'},Buffer.from('<p>Recipe</p>'),200,options=>options.lookup('recipes.example',{},(_,address)=>pinned=address))});assert.equal(pinned,'8.8.8.8');assert.equal(ok.bytes.toString(),'<p>Recipe</p>');
 await assert.rejects(safeFetch('https://recipes.example/',{resolve,transport:fake({location:'http://127.0.0.1/private'},Buffer.alloc(0),302)}),/public recipe website/);
 await assert.rejects(safeFetch('https://recipes.example/',{resolve,limit:30,transport:fake({'content-type':'text/html','content-encoding':'gzip'},zlib.gzipSync('x'.repeat(1000)))}),/too large/);
});
test('photo download is optional, bounded, validated and returned without saving records',async()=>{
 const {importRecipe}=await modulePromise;let calls=0;
 const result=await importRecipe('https://recipes.example/lemon',{fetchPage:async(url,options)=>{calls++;if(calls===1)return {bytes:page(recipe),url,type:'text/html'};assert.equal(options.limit,512*1024);return {bytes:Buffer.from([255,216,255,0]),url,type:'image/jpeg'};}});
 assert.equal(calls,2);assert.equal(result.image.type,'image/jpeg');assert.equal(result.image.base64,'/9j/AA==');assert.equal(result.imageUrl,undefined);
 let count=0;const missing=await importRecipe('https://recipes.example/lemon',{fetchPage:async(url)=>{if(!count++)return{bytes:page(recipe),url};throw new Error('Photo unavailable');}});assert.equal(missing.image,undefined);assert.match(missing.warnings.join(' '),/photo could not be downloaded/);
});
test('link importing requires a verified caller and does not open a database transaction',async()=>{
 const {createHandler}=await import('../appwrite/functions/kitchen-sync/main.js');let user=null,calls=0;
 const handler=createHandler({authenticate:async()=>user,tables:{createTransaction(){throw new Error('No writes during preview');}},importLink:async url=>{calls++;return{recipe:{title:'Preview',sourceUrl:url}};}});
 const call=()=>handler({req:{bodyJson:{action:'import-link',url:'https://recipes.example/'}},res:{json:(data,code=200)=>({data,code})},error:()=>{}});
 assert.equal((await call()).code,401);user={$id:'mum',emailVerification:false};assert.equal((await call()).code,403);assert.equal(calls,0);user.emailVerification=true;assert.equal((await call()).code,200);assert.equal(calls,1);
});
