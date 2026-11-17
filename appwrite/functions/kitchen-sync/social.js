// Reserved records never pass through the generic private save API.
import {createHash,randomUUID} from 'node:crypto';
import {Query,Permission,Role} from 'node-appwrite';
const bad=(message,code=400)=>Object.assign(new Error(message),{safe:true,code});
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,36);
const ownerKey=namespace=>'!'+hash(namespace).slice(0,35);
const address=(owner,kind,id)=>hash(JSON.stringify([owner,kind,id]));
const emailKey=email=>'invite:'+createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0,56);
const clean=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max):'';
const label=value=>{const name=clean(value,60);if(!name||name.includes('@'))throw bad('Choose a display name rather than an email address.');return name;};
const email=value=>{const result=clean(value,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))throw bad('Enter a complete email address.');return result;};
const conflict='This item changed on another device. Refresh and try again.';
export function recipeSnapshot(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw bad('Choose a recipe to share.');
  const strings=(value,count,size)=>Array.isArray(value)?value.slice(0,count).map(v=>clean(v,size)).filter(Boolean):[];
  const recipe={title:clean(input.title,180),description:clean(input.description,2000),ingredients:strings(input.ingredients,200,1000),steps:strings(input.steps,150,3000),tags:strings(input.tags,20,40).filter(t=>t!=='custom'),equipment:strings(input.equipment,20,60),category:['main','breakfast','lunch','snack','sweet','side'].includes(input.category)?input.category:'main'};
  if(!recipe.title||!recipe.ingredients.length||!recipe.steps.length)throw bad('Add a title, ingredients and a method before sharing.');
  for(const key of ['time','prepTime','cookTime','servings','calories','protein','carbs','fat','fiber']){const n=input[key];recipe[key]=typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=(key==='servings'?48:10080)?n:null;}
  if(recipe.servings===0)recipe.servings=null;
  for(const key of ['sourceAuthor','sourceName'])recipe[key]=clean(input[key],300);
  recipe.sourceUrl='';
  if(input.sourceUrl){let url;try{url=new URL(input.sourceUrl);}catch{throw bad('Check the original recipe link.');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.href.length>2048)throw bad('Check the original recipe link.');recipe.sourceUrl=url.href;}
  recipe.image='';
  if(input.image){
    if(typeof input.image!=='string')throw bad('Choose a supported recipe photo.');
    if(/^assets\/[a-z0-9-]+\.jpg$/.test(input.image))recipe.image=input.image;
    else if(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(input.image)){
      const bytes=Buffer.from(input.image.split(',')[1],'base64');if(bytes.length>96*1024||bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw bad('Use a smaller JPEG photo for sharing.');recipe.image=input.image;
    }else throw bad('Share a separate JPEG copy, not a private photo address.');
  }
  // Never include journal notes, ratings, history, private file IDs, or account IDs.
  if(Buffer.byteLength(JSON.stringify(recipe))>240*1024)throw bad('This recipe is too long to share. Shorten its text or photo.');
  return recipe;
}
export async function socialOperation({tables,base,user,body}) {
  const uid=user.$id;let tx;
  const context=()=>({...base,...(tx?{transactionId:tx.$id}:{})});
  async function get(owner,kind,id){owner=ownerKey(owner);try{const row=await tables.getRow({...context(),rowId:address(owner,kind,id)});return {...row,data:JSON.parse(row.payload)};}catch(error){if(error.code===404)return null;throw error;}}
  async function put(owner,kind,id,data,{deleted=false,permissions=[],expected}={}){
    const old=await get(owner,kind,id);owner=ownerKey(owner);if(expected!==undefined&&(old?.version||0)!==expected)throw bad(conflict,409);
    const record={owner,kind,record_id:id,payload:JSON.stringify(data),version:(old?.version||0)+1,deleted};
    const args={...context(),rowId:address(owner,kind,id),data:record,permissions};
    const row=old?await tables.updateRow(args):await tables.createRow(args);return {...row,data};
  }
  async function list(owner){owner=ownerKey(owner);const result=[];for(let offset=0;offset<1000;offset+=100){const page=await tables.listRows({...context(),queries:[Query.equal('owner',owner),Query.orderAsc('$id'),Query.limit(100),Query.offset(offset)],total:false});result.push(...page.rows.filter(r=>!r.deleted).map(r=>({...r,data:JSON.parse(r.payload)})));if(page.rows.length<100)break;}return result;}
  async function member(bookId){const book=await get('system:books','shared_book',bookId),membership=await get('book-members:'+bookId,'book_member',uid);if(!book||book.deleted||!membership||membership.deleted)throw bad('You no longer have access to this cookbook.',403);return {book,membership,owner:book.data.owner_id===uid};}
  async function touch(book){await put('system:books','shared_book',book.record_id,book.data,{expected:book.version});}
  const op=body.op;
  if(op==='state'){
    const books=[],invitations=[];
    for(const index of await list('user-books:'+uid)){
      try {const {book,membership,owner}=await member(index.record_id),members=await list('book-members:'+book.record_id);
        books.push({id:book.record_id,version:book.version,...book.data,role:owner?'owner':'member',members:members.map(m=>({id:m.record_id,name:m.data.name,role:m.data.role})),pending:owner?(await list('book-invites:'+book.record_id)).map(i=>({email:i.data.email,id:i.record_id})):[]});

      }catch(error){if(error.code!==403)throw error;}
    }
    if(user.email)for(const invite of await list(emailKey(user.email))){const book=await get('system:books','shared_book',invite.record_id);if(book&&!book.deleted)invitations.push({id:book.record_id,name:book.data.name,from:invite.data.inviter_name});}
    const publications=(await list('publisher:'+uid)).map(row=>({id:row.record_id,version:row.version,...row.data}));
    return {books,invitations,publications};
  }
  if(op==='book'||op==='share-state'||op==='shared-item'){
    const id=clean(body.bookId,80);await member(id);
    if(op==='shared-item'){const row=await get('book-items:'+id,'shared_recipe',clean(body.itemId,80));if(!row||row.deleted)throw bad('This shared recipe has been removed.',404);return {id:row.record_id,version:row.version,...row.data,bookId:id};}
    if(op==='share-state'){const sourceId=clean(body.sourceId,240),itemId='shared-'+hash(JSON.stringify([id,uid,sourceId]));const previous=await get('book-items:'+id,'shared_recipe',itemId);return {id:itemId,version:previous?.version||0,exists:Boolean(previous&&!previous.deleted)};}
    const offset=Number(body.offset||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1000)throw bad('Invalid cookbook page.');
    const page=await tables.listRows({...context(),queries:[Query.equal('owner',ownerKey('book-items:'+id)),Query.orderAsc('$id'),Query.limit(8),Query.offset(offset)],total:false});
    return {items:page.rows.filter(row=>!row.deleted).map(row=>({id:row.record_id,version:row.version,...JSON.parse(row.payload),bookId:id})),hasMore:page.rows.length===8};
  }
  const valid=['create-book','rename-book','invite','revoke-invite','accept','decline','remove-member','leave','share','remove-shared','publish','unpublish'];
  if(!valid.includes(op))throw bad('Unknown sharing operation.');
  tx=await tables.createTransaction({ttl:60});
  try {
    let result={};
    if(op==='create-book'){
      const name=clean(body.name,80);if(!name)throw bad('Give your shared cookbook a name.');
      if((await list('user-books:'+uid)).length>=30)throw bad('You can join up to 30 shared cookbooks.');
      const id=randomUUID(),display=label(body.displayName||user.name);
      await put('system:books','shared_book',id,{name,owner_id:uid,owner_name:display});
      await put('book-members:'+id,'book_member',uid,{name:display,role:'owner'});
      await put('user-books:'+uid,'book_access',id,{});result={id};
    }else if(op==='publish'||op==='unpublish'){
      const sourceId=clean(body.sourceId,240);if(!sourceId)throw bad('Choose a saved recipe.');
      const ref=await get('publisher:'+uid,'published_ref',sourceId);
      if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<0||(ref?.version||0)!==body.expectedVersion)throw bad(conflict,409);
      const publicationId='community-'+hash(JSON.stringify([uid,sourceId]));
      if(op==='publish'){
        if(body.permissionConfirmed!==true)throw bad('Confirm you have permission to publish this recipe and its photo.');
        const snapshot=recipeSnapshot(body.recipe),publisherName=label(body.displayName),publishedAt=new Date().toISOString();
        await put('system:public','publication',publicationId,{...snapshot,id:publicationId,publisherName,publishedAt,isCommunity:true,isCustom:false},{permissions:[Permission.read(Role.any())]});
        const updated=await put('publisher:'+uid,'published_ref',sourceId,{publicationId,publishedAt,publisherName,title:snapshot.title});result={publicationId,version:updated.version};
      }else{
        if(!ref||ref.deleted)throw bad('This recipe is not published.');
        await put('system:public','publication',publicationId,{}, {deleted:true,permissions:[]});
        // Keep the private reference/version so publication drafts can be republished safely.
        await put('publisher:'+uid,'published_ref',sourceId,{...ref.data,unpublished:true});result={publicationId};
      }
    }else if(op==='accept'||op==='decline'){
      const id=clean(body.bookId,80),key=emailKey(user.email||''),invite=await get(key,'book_invite',id),book=await get('system:books','shared_book',id);
      if(!invite||invite.deleted||!book||book.deleted)throw bad('This invitation is no longer available.',404);
      if(op==='accept'){
        if((await list('book-members:'+id)).length>=25)throw bad('This cookbook already has 25 members.');
        if((await list('user-books:'+uid)).length>=30)throw bad('You can join up to 30 shared cookbooks.');
        await put('book-members:'+id,'book_member',uid,{name:label(body.displayName||user.name),role:book.data.owner_id===uid?'owner':'member'});
        await put('user-books:'+uid,'book_access',id,{});
      }
      await put(key,'book_invite',id,{}, {deleted:true});
      await put('book-invites:'+id,'invite_out',hash((user.email||'').trim().toLowerCase()),{}, {deleted:true});await touch(book);
    }else{
      const id=clean(body.bookId,80),access=await member(id),{book}=access;
      if(['rename-book','invite','revoke-invite','remove-member'].includes(op)&&!access.owner)throw bad('Only the cookbook owner can manage this.',403);
      if(op==='rename-book'){
        const name=clean(body.name,80);if(!name)throw bad('Give your cookbook a name.');
        if(body.expectedVersion!==book.version)throw bad(conflict,409);book.data.name=name;await touch(book);
      }else if(op==='invite'||op==='revoke-invite'){
        const recipient=email(body.email);if(recipient===(user.email||'').toLowerCase())throw bad('You already own this cookbook.');
        const key=emailKey(recipient),inviteId=hash(recipient);
        if(op==='invite'&&(await list('book-invites:'+id)).length>=25)throw bad('This cookbook has 25 pending invitations.');
        await put(key,'book_invite',id,{inviter_name:book.data.owner_name},{deleted:op==='revoke-invite'});
        await put('book-invites:'+id,'invite_out',inviteId,{email:recipient},{deleted:op==='revoke-invite'});await touch(book);
      }else if(op==='leave'||op==='remove-member'){
        const target=op==='leave'?uid:clean(body.memberId,80);if(target===book.data.owner_id)throw bad('The owner must stay in their cookbook.');
        const membership=await get('book-members:'+id,'book_member',target);if(!membership||membership.deleted)throw bad('That member has already left.');
        await put('book-members:'+id,'book_member',target,{}, {deleted:true});await put('user-books:'+target,'book_access',id,{}, {deleted:true});await touch(book);
      }else if(op==='share'||op==='remove-shared'){
        const sourceId=clean(body.sourceId,240);if(!sourceId)throw bad('Choose a recipe to share.');
        const itemId=body.itemId?clean(body.itemId,80):'shared-'+hash(JSON.stringify([id,uid,sourceId]));
        const previous=await get('book-items:'+id,'shared_recipe',itemId);
        if(previous&&previous.data.contributor_id!==uid && !(op==='remove-shared'&&access.owner))throw bad('Only the contributor can change this recipe.',403);
        if(op==='share' && ((!previous && itemId!=='shared-'+hash(JSON.stringify([id,uid,sourceId]))) || (previous&&previous.data.source_id!==sourceId)))throw bad('Choose your own recipe to update.',403);
        if(op==='remove-shared'&&(!previous||previous.deleted))throw bad('This recipe has already been removed.');
        if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<0||(previous?.version||0)!==body.expectedVersion)throw bad(conflict,409);
        if(op==='share'){
          if(!previous&&(await list('book-items:'+id)).length>=200)throw bad('A shared cookbook can hold up to 200 recipes.');
          await put('book-items:'+id,'shared_recipe',itemId,{recipe:recipeSnapshot(body.recipe),source_id:sourceId,contributor_id:uid,contributor_name:access.membership.data.name});
        }else await put('book-items:'+id,'shared_recipe',itemId,previous.data, {deleted:true});
        await touch(book);result={id:itemId};
      }
    }
    await tables.updateTransaction({transactionId:tx.$id,commit:true});tx=null;return result;
  }catch(error){if(tx)await tables.updateTransaction({transactionId:tx.$id,rollback:true}).catch(()=>{});throw error;}
}
