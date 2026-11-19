/* Shared/public recipes are separate snapshots; personal records stay owner-only. */
(() => {
  const K=window.AnnaKitchen;if(!K?.openRecipe)return;
  const h=K.html,sourceKeys=['title','description','ingredients','steps','category','tags','equipment','time','prepTime','cookTime','servings','calories','protein','carbs','fat','fiber','sourceUrl','sourceAuthor','sourceName'];
  let community=[],communityOffset=0,communityMore=true,communityBusy=false,bookId=null,bookOffset=0,bookMore=false,bookBusy=false,bookLoadedVersion=null,activeOwner=K.user?.id;
  const inviteLinks=new Map();
  const name=()=>K.get('profile','me')?.display_name||K.user?.user_metadata?.display_name||'';
  const book=()=>K.get('shared_book_view',bookId);
  const toast=message=>K.notify(message);
  const dialog=document.createElement('dialog');dialog.id='sharing-dialog';dialog.setAttribute('aria-labelledby','sharing-title');document.body.append(dialog);
  function show(content){dialog.innerHTML=`<button type="button" class="dialog-close" aria-label="Close sharing">×</button><div class="journal-editor">${content}</div>`;dialog.querySelector('.dialog-close').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();document.body.classList.add('dialog-open');}
  const title=(eyebrow,heading)=>`<p class="eyebrow">${eyebrow}</p><h2 id="sharing-title">${heading}</h2>`;
  function busyForm(form,action){form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]'),message=form.querySelector('[role=status]');button.disabled=true;try{await action(new FormData(form));}catch(error){message.textContent=K.errorMessage(error);}finally{button.disabled=false;}});}
  function requireAccount(){if(!K.user?.emailVerified){window.AnnaAccount?.open();throw new Error('Sign in with a verified email to share recipes.');}if(K.offline||!navigator.onLine)throw new Error('Reconnect to share or publish recipes.');}
  function models(){
    for(let i=recipes.length-1;i>=0;i--)if(recipes[i].isShared||recipes[i].isCommunity)recipes.splice(i,1);
    recipes.push(...community.map(r=>({...r,isCommunity:true,isCustom:false,note:r.sourceUrl?`Original source: ${r.sourceUrl}`:'',photo:null})));
    for(const row of K.list('shared_recipe_view')){const item=row.data;recipes.push({...item.recipe,id:item.id,isShared:true,isCustom:false,sharedBookId:item.bookId,contributorName:item.contributor_name,contributorId:item.contributor_id,photo:null,note:item.recipe.sourceUrl?`Original source: ${item.recipe.sourceUrl}`:''});}
  }
  K.copyId=recipe=>'custom-copy-'+recipe.id;
  K.saveCopy=async(recipe,{favourite=false}={})=>{
    const id=K.copyId(recipe),existing=K.get('recipe',id),changes=[];
    if(!existing){const data={};for(const key of sourceKeys)data[key]=structuredClone(recipe[key]??(key==='tags'||key==='equipment'?[]:null));Object.assign(data,{id,image:recipe.image||'',photo:null,sourceSnapshotId:recipe.id,note:`Saved from ${recipe.isCommunity?'Community':'a shared cookbook'}${recipe.publisherName||recipe.contributorName?' · '+(recipe.publisherName||recipe.contributorName):''}.`});changes.push({kind:'recipe',id,data:window.AnnaCustomRecipes.normalize(data),deleted:false});changes.push({kind:'entry',id,data:{...K.get('entry',id),source_snapshot_id:recipe.id},deleted:false});}
    if(favourite&&!K.get('favourite',id))changes.push({kind:'favourite',id,data:{},deleted:false});
    if(changes.length)await K.batch(changes);return recipes.find(r=>r.id===id)||K.get('recipe',id);
  };
  K.prepareSnapshot=async(recipe,{includePhoto=false}={})=>{
    const owner=K.user?.id,result={};for(const key of sourceKeys)if(recipe[key]!==undefined)result[key]=structuredClone(recipe[key]);result.image='';
    if(!includePhoto)return result;
    if(recipe.image&&/^assets\/[a-z0-9-]+\.jpg$/.test(recipe.image)&&!recipe.photo){result.image=recipe.image;return result;}
    const url=recipe.photo?await K.photoUrl(recipe.photo):recipe.image;
    if(!url)throw new Error('That photo is unavailable. Uncheck Include photo or try again online.');
    const image=new Image();image.crossOrigin='anonymous';image.src=url;await image.decode();
    const canvas=document.createElement('canvas');let size=Math.min(1000,Math.max(image.naturalWidth,image.naturalHeight)),encoded='';
    for(let attempt=0;attempt<7;attempt++){
      const scale=Math.min(1,size/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);encoded=canvas.toDataURL('image/jpeg',.72);if(encoded.length<=125000)break;size*=.72;
    }
    if(encoded.length>125000)throw new Error('Choose a smaller photo or share without the photo.');
    if(owner!==K.user?.id)throw new Error('Your account changed. Reopen this recipe.');result.image=encoded;return result;
  };
  async function loadCommunity(reset=false){
    if(communityBusy||!K.client?.publicRecipes||!navigator.onLine)return;
    communityBusy=true;if(reset){communityOffset=0;communityStatus('Loading community recipes…');}
    try{const {data,error}=await K.client.publicRecipes(communityOffset);if(error)throw error;if(reset)community=[];for(const r of data.recipes){const i=community.findIndex(old=>old.id===r.id);if(i<0)community.push(r);else community[i]=r;}communityOffset+=6;communityMore=data.hasMore;models();window.dispatchEvent(new Event('kitchen:community'));communityStatus('');}
    catch{communityStatus('Community recipes could not load. Your own recipes are still available.');}
    finally{communityBusy=false;const button=document.querySelector('#community-more');if(button){button.hidden=!communityMore;button.disabled=false;}}
  }
  function communityStatus(message){const status=document.querySelector('#community-status');if(status)status.textContent=message;}
  K.openCommunity=async id=>{try{const {data,error}=await K.client.publicRecipe(id);if(error)throw error;K.openRecipe({...data,note:data.sourceUrl?`Original source: ${data.sourceUrl}`:'',photo:null},{publicVerified:id});}catch{toast('This recipe is no longer public, or the connection is unavailable.');void loadCommunity(true);}};
  K.openShared=async recipe=>{if(K.offline){K.openRecipe(recipe,{sharedVerified:recipe.id});return;}try{const item=await K.social({op:'shared-item',bookId:recipe.sharedBookId,itemId:recipe.id});K.openRecipe({...item.recipe,id:item.id,isShared:true,isCustom:false,sharedBookId:item.bookId,contributorId:item.contributor_id,contributorName:item.contributor_name,sharedEntry:item,photo:null},{sharedVerified:item.id});}catch(error){toast(K.errorMessage(error));void K.refresh().catch(()=>{});}};
  K.openSharedEditor=recipe=>{const row=K.get('shared_recipe_view',recipe.id)||recipe.sharedEntry;if(!row||row.contributor_id!==K.user?.id){toast('Save a private copy to make your own changes.');return;}K.openEditor({...row.recipe,id:row.id,isShared:true,isCustom:false},{sharedEntry:row});};
  function createBook(){
    try{requireAccount();}catch(error){toast(error.message);return;}
    show(title('A PLACE AT THE TABLE','A shared cookbook.')+`<form class="journal-form" id="create-book-form"><label>Cookbook name<input name="name" maxlength="80" required placeholder="Our family cookbook"></label><label>Your name in this cookbook<input name="displayName" maxlength="60" required value="${h(name())}" placeholder="Anna"></label><p class="form-hint">Only invited members can see it. Everyone uses their own account.</p><p role="status"></p><button class="primary-button" type="submit">Create shared cookbook ↗</button></form>`);
    busyForm(dialog.querySelector('form'),async values=>{const result=await K.social({op:'create-book',name:values.get('name'),displayName:values.get('displayName')});dialog.close();await openBook(result.id);});
  }
  function renderHome(){
    for(const mount of document.querySelectorAll('[data-shared-cookbooks]')){
      const books=K.list('shared_book_view'),invites=K.list('invite_view'),published=K.list('publication_ref').filter(r=>!r.data.unpublished);
      mount.innerHTML=`<div class="shared-heading"><div><p class="eyebrow">GOOD THINGS, SHARED</p><h2>Shared cookbooks.</h2></div><button class="planner-tool-button" data-new-book>Create shared cookbook ↗</button></div>${!K.user?'<p>Sign in to cook together from separate accounts.</p>':!K.ready?'<p>Your cookbooks are loading…</p>':''}${invites.map(({data})=>`<article class="profile-paper invitation-card"><h3 translate="no">${h(data.name)}</h3><p>${h(data.from)} invited you to this cookbook.</p><div class="account-actions"><button class="primary-button" data-accept="${h(data.id)}">Accept invitation</button><button class="clear-button" data-decline="${h(data.id)}">Decline</button></div></article>`).join('')}<div class="shared-book-grid">${books.map(({data})=>`<button class="collection-tile shared-book-tile" data-open-book="${h(data.id)}"><span>▤ <small>${data.role==='owner'?'Your cookbook':'Shared with you'} · ${data.members.length} member${data.members.length===1?'':'s'}</small></span><strong translate="no">${h(data.name)}</strong><span>Open cookbook ↗</span></button>`).join('')}</div>${K.user&&K.ready&&!books.length?'<p class="form-hint">Create one for family recipes, then invite your mum by email or link. Nothing is shared automatically.</p>':''}${published.length?`<section class="published-manage"><h3>Published in All recipes</h3>${published.map(({data:ref})=>`<div class="shared-member"><span>${h(ref.title||'Published recipe')}</span><div class="account-actions"><button class="clear-button" data-open-public="${h(ref.publicationId)}">Open public recipe</button><button class="clear-button" data-manage-unpublish="${h(ref.id)}">Unpublish</button></div></div>`).join('')}</section>`:''}`;
      mount.querySelector('[data-new-book]').onclick=createBook;
      mount.querySelectorAll('[data-open-public]').forEach(b=>b.onclick=()=>K.openCommunity(b.dataset.openPublic));
      mount.querySelectorAll('[data-manage-unpublish]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this public recipe from All recipes? Existing personal copies are kept.'))return;const ref=K.get('publication_ref',b.dataset.manageUnpublish);try{await K.social({op:'unpublish',sourceId:ref.id,expectedVersion:ref.version});toast('Removed from All recipes.');await loadCommunity(true);}catch(error){toast(K.errorMessage(error));}});
      mount.querySelectorAll('[data-open-book]').forEach(b=>b.onclick=()=>openBook(b.dataset.openBook));
      mount.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>acceptInvite(b.dataset.accept));
      mount.querySelectorAll('[data-decline]').forEach(b=>b.onclick=async()=>{try{await K.social({op:'decline',bookId:b.dataset.decline});}catch(error){toast(K.errorMessage(error));}});
    }
  }
  function acceptInvite(id){show(title('YOU’RE INVITED','Join the cookbook.')+`<form class="journal-form"><label>Your name in this cookbook<input name="displayName" required maxlength="60" value="${h(name())}"></label><p class="form-hint">Members can add recipes. Your personal kitchen stays private.</p><p role="status"></p><button class="primary-button" type="submit">Accept and join ↗</button></form>`);busyForm(dialog.querySelector('form'),async values=>{await K.social({op:'accept',bookId:id,displayName:values.get('displayName')});dialog.close();await openBook(id);});}
  async function fetchBook(reset=true){if(bookBusy||!bookId||K.offline)return;bookBusy=true;const id=bookId,version=book()?.version;if(reset)bookOffset=0;try{const result=await K.loadBook(id,bookOffset);if(bookId!==id)return;bookOffset+=8;bookMore=result.hasMore;bookLoadedVersion=version;renderBook();}catch(error){toast(K.errorMessage(error));}finally{bookBusy=false;}}
  async function openBook(id){bookId=id;bookLoadedVersion=null;renderBook(true);await fetchBook(true);}
  function renderBook(open=false){
    if(!bookId||(!dialog.open&&!open))return;const data=book();if(!data){if(dialog.dataset.mode==='book')dialog.close();bookId=null;return;}
    const items=K.list('shared_recipe_view').filter(r=>r.data.bookId===bookId);
    dialog.dataset.mode='book';
    show(title('A COOKBOOK TOGETHER',`<span translate="no">${h(data.name)}</span>`)+`<p class="form-hint">${data.members.length} members · ${K.offline?'Downloaded copy · reconnect to check for changes':'Shared only with invited members'}</p><div class="account-actions"><button class="planner-tool-button" data-add-shared>Add a recipe ↗</button><button class="clear-button" data-refresh-book>Refresh cookbook</button>${data.role==='owner'?'<button class="planner-tool-button" data-invite-link>Invite with a link ↗</button>':''}${data.role!=='owner'?'<button class="clear-button" data-leave>Leave cookbook</button>':''}</div><section class="shared-recipe-list">${items.map(({data:item})=>{const recipe=recipes.find(r=>r.id===item.id);return `<article class="memory-card"><button class="memory-art" data-open-shared="${h(item.id)}" aria-label="Open ${h(item.recipe.title)}">${recipe?K.art(recipe):''}</button><div class="memory-copy"><p class="eyebrow">Added by ${h(item.contributor_name)}</p><h3 translate="no">${h(item.recipe.title)}</h3><div class="account-actions"><button class="clear-button" data-open-shared="${h(item.id)}">Open recipe ↗</button>${item.contributor_id===K.user?.id?`<button class="clear-button" data-edit-shared="${h(item.id)}">Edit my contribution</button>`:''}${item.contributor_id===K.user?.id||data.role==='owner'?`<button class="clear-button" data-remove-shared="${h(item.id)}">Remove from cookbook</button>`:''}</div></div></article>`;}).join('')||'<p class="form-hint">Your first family favourite is waiting. Add a saved recipe or import a link.</p>'}</section>${bookMore?'<button class="planner-tool-button" data-more-book>Load more recipes</button>':''}<details class="book-members"><summary>Members & invitations</summary>${data.members.map(member=>`<div class="shared-member"><span>${h(member.name)} · ${member.role}</span>${data.role==='owner'&&member.id!==K.user?.id?`<button class="clear-button" data-remove-member="${h(member.id)}">Remove member</button>`:''}</div>`).join('')}${data.role==='owner'?`<form class="journal-form" id="invite-member-form"><label>Invite by account email<input name="email" type="email" required maxlength="254" placeholder="Your mum’s account email"></label><p class="form-hint">They’ll find the invitation in My cookbook when signed in with this verified email. This does not send an email.</p><p role="status"></p><button class="primary-button" type="submit">Invite to cookbook</button></form>${data.pending.map(invite=>`<div class="shared-member"><span>${h(invite.email)} · pending</span><button class="clear-button" data-revoke-email="${h(invite.email)}">Cancel invitation</button></div>`).join('')}<form class="journal-form" id="rename-book-form"><label>Cookbook name<input name="name" required maxlength="80" value="${h(data.name)}"></label><p role="status"></p><button class="planner-tool-button" type="submit">Rename cookbook</button></form>`:''}</details>`);
    dialog.querySelector('[data-add-shared]').onclick=()=>chooseRecipe(data.id);
    dialog.querySelector('[data-refresh-book]').onclick=()=>fetchBook(true);
    dialog.querySelector('[data-invite-link]')?.addEventListener('click',()=>inviteLink(data.id));
    dialog.querySelector('[data-more-book]')?.addEventListener('click',()=>fetchBook(false));
    dialog.querySelectorAll('[data-open-shared]').forEach(b=>b.onclick=()=>{const recipe=recipes.find(r=>r.id===b.dataset.openShared);if(recipe)K.openRecipe(recipe);});
    dialog.querySelectorAll('[data-edit-shared]').forEach(b=>b.onclick=()=>{const recipe=recipes.find(r=>r.id===b.dataset.editShared);if(recipe)K.openSharedEditor(recipe);});
    dialog.querySelectorAll('[data-remove-shared]').forEach(b=>b.onclick=async()=>{const item=K.get('shared_recipe_view',b.dataset.removeShared);if(!confirm('Remove this shared copy? Personal copies are kept.'))return;try{await K.social({op:'remove-shared',bookId:data.id,itemId:item.id,sourceId:item.source_id,expectedVersion:item.version});await fetchBook(true);}catch(error){toast(K.errorMessage(error));}});
    dialog.querySelector('[data-leave]')?.addEventListener('click',async()=>{if(!confirm('Leave this cookbook? Recipes you already contributed stay with the cookbook.'))return;try{await K.social({op:'leave',bookId:data.id});dialog.close();bookId=null;}catch(error){toast(K.errorMessage(error));}});
    for(const [selector,op,key]of [['data-remove-member','remove-member','memberId'],['data-revoke-email','revoke-invite','email']])dialog.querySelectorAll('['+selector+']').forEach(b=>b.onclick=async()=>{try{await K.social({op,bookId:data.id,[key]:b.getAttribute(selector)});renderBook();}catch(error){toast(K.errorMessage(error));}});
    const inviteForm=dialog.querySelector('#invite-member-form');if(inviteForm)busyForm(inviteForm,async values=>{await K.social({op:'invite',bookId:data.id,email:values.get('email')});toast('Invitation ready. They can accept it in My cookbook.');renderBook();});
    const renameForm=dialog.querySelector('#rename-book-form');if(renameForm)busyForm(renameForm,async values=>{await K.social({op:'rename-book',bookId:data.id,name:values.get('name'),expectedVersion:data.version});renderBook();});
  }
  function inviteLink(id){
    const data=K.get('shared_book_view',id);if(!data||data.role!=='owner')return;
    const current=inviteLinks.get(id),active=Date.parse(data.inviteLinkExpiresAt)>Date.now();
    dialog.dataset.mode='link';
    show(title('PULL UP A CHAIR','Invite with a link.')+`<p translate="no">${h(data.name)}</p><p class="form-hint">Anyone you send this link to can join with their own verified account. It expires after 7 days. Disabling it stops new joins; existing members stay.</p>${current&&active?`<label class="journal-form">Cookbook invite link<input aria-label="Cookbook invite link" data-invite-url readonly value="${h(current)}"></label><button class="primary-button" data-copy-invite>Copy invite link ↗</button>`:''}<form class="journal-form"><p role="status">${active?'An invite link is active. Creating another replaces the previous link.':'Create a link to send to your mum.'}</p><div class="account-actions"><button class="planner-tool-button" type="submit">${active?'Create a new invite link':'Create invite link'}</button>${active?'<button class="clear-button" type="button" data-disable-link>Disable invite link</button>':''}<button class="clear-button" type="button" data-back-book>Back to cookbook</button></div></form>`);
    busyForm(dialog.querySelector('form'),async()=>{requireAccount();const result=await K.social({op:'create-link',bookId:id});const url=new URL('cookbook.html',location.href);if(window.AnnaI18n?.language==='es')url.searchParams.set('lang','es');url.hash='join='+result.token;inviteLinks.set(id,url.href);inviteLink(id);});
    dialog.querySelector('[data-copy-invite]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(current);toast('Invite link copied. Send it to your mum.');}catch{dialog.querySelector('[data-invite-url]').select();toast('Select and copy the invite link above.');}});
    dialog.querySelector('[data-disable-link]')?.addEventListener('click',async()=>{try{requireAccount();await K.social({op:'revoke-link',bookId:id});inviteLinks.delete(id);inviteLink(id);toast('Invite link disabled.');}catch(error){dialog.querySelector('[role=status]').textContent=K.errorMessage(error);}});
    dialog.querySelector('[data-back-book]').onclick=()=>openBook(id);
  }
  // Keep an invitation through the account/verification journey in this tab only.
  let joinToken='',joinBusy=false,joinIdentity=null,joinDismissed=false;
  try{const fragment=new URLSearchParams(location.hash.slice(1));joinToken=fragment.get('join')||sessionStorage.getItem('anna-pending-cookbook-join')||'';if(joinToken)sessionStorage.setItem('anna-pending-cookbook-join',joinToken);}catch{}
  function clearJoin(){joinDismissed=true;joinToken='';try{sessionStorage.removeItem('anna-pending-cookbook-join');}catch{}if(location.hash.startsWith('#join='))history.replaceState(null,'',location.pathname+location.search);}
  async function openJoin(){
    if(!joinToken||joinDismissed||joinBusy||!K.ready)return;
    const identity=K.user?.id+':'+K.user?.emailVerified+':'+K.offline;
    if(identity===joinIdentity)return;joinIdentity=identity;joinBusy=true;const token=joinToken,viewer=K.user?.id;
    dialog.dataset.mode='join';
    const shell=content=>show(title('YOU’RE INVITED','Join shared cookbook?')+content);
    try{
      if(!K.user?.emailVerified){
        shell(`<p>Join your family’s cookbook to see and add recipes together. Your personal kitchen stays private.</p><p class="form-hint">${K.user?'Verify your email before joining.':'Sign in or create your own account to continue.'}</p><div class="account-actions"><button class="primary-button" data-join-login>${K.user?'Verify email / continue':'Log in / create account'}</button><button class="clear-button" data-join-cancel>Not now</button></div>`);
        dialog.querySelector('[data-join-login]').onclick=()=>window.AnnaAccount?.open();
      }else if(K.offline||!navigator.onLine){
        shell('<p>Reconnect to check this invitation and join the cookbook.</p><button class="clear-button" data-join-retry>Try again</button><button class="clear-button" data-join-cancel>Not now</button>');
        dialog.querySelector('[data-join-retry]').onclick=()=>{joinIdentity=null;void openJoin();};
      }else{
        document.querySelector('#account-dialog')?.close();
        shell('<p role="status">Checking your invitation…</p>');
        const data=await K.social({op:'link-preview',token});
        if(joinDismissed||token!==joinToken||viewer!==K.user?.id)return;
        shell(`<h3 translate="no">${h(data.name)}</h3><p>${h(data.from)} is inviting you to cook together.</p>${data.alreadyMember?'<p>You already belong to this cookbook.</p><button class="primary-button" data-open-joined>Open cookbook ↗</button>':`<form class="journal-form"><label>Your name in this cookbook<input name="displayName" required maxlength="60" value="${h(name())}" placeholder="Your name"></label><p class="form-hint">Members can see and add shared recipes. Your personal notes and other recipes stay private.</p><p role="status"></p><button class="primary-button" type="submit">Join shared cookbook ↗</button></form>`}<button class="clear-button" data-join-cancel>Not now</button>`);
        if(data.alreadyMember)dialog.querySelector('[data-open-joined]').onclick=async()=>{clearJoin();dialog.close();await openBook(data.id);};
        else busyForm(dialog.querySelector('form'),async values=>{const result=await K.social({op:'join-link',token:joinToken,displayName:values.get('displayName'),confirmed:true});clearJoin();document.querySelector('#account-dialog')?.close();dialog.close();await openBook(result.id);toast('You joined the shared cookbook.');});
      }
    }catch(error){if(joinDismissed||token!==joinToken||viewer!==K.user?.id)return;shell(`<p role="status">${h(K.errorMessage(error))}</p><button class="clear-button" data-join-retry>Try again</button><button class="clear-button" data-join-cancel>Close</button>`);dialog.querySelector('[data-join-retry]').onclick=()=>{joinIdentity=null;void openJoin();};}
    finally{joinBusy=false;if(viewer!==K.user?.id){joinIdentity=null;void openJoin();}dialog.querySelector('[data-join-cancel]')?.addEventListener('click',()=>{clearJoin();dialog.close();});}
  }
  window.addEventListener('online',()=>{joinIdentity=null;void openJoin();});
  window.addEventListener('hashchange',()=>{const token=new URLSearchParams(location.hash.slice(1)).get('join');if(!token)return;joinToken=token;joinDismissed=false;joinIdentity=null;try{sessionStorage.setItem('anna-pending-cookbook-join',token);}catch{}void openJoin();});
  dialog.addEventListener('cancel',()=>{if(dialog.dataset.mode==='join')clearJoin();});
  dialog.addEventListener('click',event=>{if(event.target.closest('.dialog-close')&&dialog.dataset.mode==='join')clearJoin();});
  function chooseRecipe(targetBook){
    show(title('ADD SOMETHING GOOD','Choose a recipe.')+`<p>Share a recipe from your kitchen, or import a website link first.</p><div class="account-actions"><button class="planner-tool-button" data-import-shared>Import a link ↗</button><button class="planner-tool-button" data-new-shared>Write a recipe</button></div><div class="shared-choose-list">${recipes.filter(r=>!r.isShared&&!r.isCommunity).map(r=>`<button class="planner-tool-button" translate="no" data-choose-shared="${h(r.id)}">${h(r.title)}</button>`).join('')}</div>`);dialog.dataset.mode='choose';
    dialog.querySelectorAll('[data-choose-shared]').forEach(b=>b.onclick=()=>K.openSharing(recipes.find(r=>r.id===b.dataset.chooseShared),targetBook));
    dialog.querySelector('[data-import-shared]').onclick=()=>{dialog.close();K.openImport({sharedBookId:targetBook});};
    dialog.querySelector('[data-new-shared]').onclick=()=>{dialog.close();K.openEditor(null,{shareBookId:targetBook});};
  }
  K.openSharing=(recipe,targetBook='')=>{
    try{requireAccount();}catch(error){toast(error.message);return;}
    if(recipe.isCommunity||recipe.isShared){toast('Save a private copy before publishing your own version.');return;}
    const sourceId=recipe.id,owner=K.user.id,ref=K.get('publication_ref',sourceId),published=ref&&!ref.unpublished;
    show(title('CHOOSE WHO GETS A TASTE','Share this recipe.')+`<form class="journal-form" id="share-recipe-form"><div class="sharing-preview"><h3 ${recipe.isCustom?'translate="no"':''}>${h(recipe.title)}</h3><p ${recipe.isCustom?'translate="no"':''}>${h(recipe.description||'')}</p><p class="form-hint">${recipe.ingredients.length} ingredients · ${recipe.steps.length} method steps${recipe.sourceAuthor?' · Original author: '+h(recipe.sourceAuthor):''}</p><details><summary>Review the recipe being shared</summary><ul>${recipe.ingredients.map(v=>`<li ${recipe.isCustom?'translate="no"':''}>${h(v)}</li>`).join('')}</ul><ol>${recipe.steps.map(v=>`<li ${recipe.isCustom?'translate="no"':''}>${h(v)}</li>`).join('')}</ol></details><p class="form-hint">Only this recipe and its source credit are copied. Your diary notes, ratings, cooking history and account email stay private.</p></div><label>Where to share<select name="target" required><option value="">Choose a cookbook or All recipes</option>${K.list('shared_book_view').map(({data})=>`<option value="${h(data.id)}" ${targetBook===data.id?'selected':''}>${h(data.name)} · invited members</option>`).join('')}<option value="public">Public · All recipes</option></select></label><label class="check-label"><input name="includePhoto" type="checkbox">Include the recipe photo</label><div data-public-options hidden><label>Public display name<input name="displayName" maxlength="60" value="${h(name())}" placeholder="Your name, not your email"></label><p class="form-hint">Anyone can see this recipe in All recipes → Community, and save a separate copy. You can remove the public version later.</p><label class="check-label"><input name="permission" type="checkbox">I have permission to publish this recipe and any included photo, with the original source credited.</label></div><p role="status" id="share-status"></p><div class="account-actions"><button type="submit" class="primary-button">Choose where to share</button>${published?'<button type="button" class="clear-button" data-unpublish>Remove from All recipes</button>':''}<button type="button" class="text-button" data-new-shared-book>Create a shared cookbook</button></div></form>`);dialog.dataset.mode='share';
    const form=dialog.querySelector('form'),target=form.elements.target,submit=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');let revision=null,check=0;
    async function updateTarget(){const generation=++check;revision=null;const pub=target.value==='public';form.querySelector('[data-public-options]').hidden=!pub;form.elements.permission.required=pub;form.elements.displayName.required=pub;status.textContent='';submit.textContent=pub?(published?'Update in All recipes ↗':'Publish in All recipes ↗'):'Share with cookbook ↗';submit.disabled=!target.value;
      if(!pub&&target.value){submit.disabled=true;try{const info=await K.social({op:'share-state',bookId:target.value,sourceId});if(generation!==check)return;revision=info.version;status.textContent=info.exists?'You have already shared this recipe. Saving will update your shared copy.':'';}catch(error){if(generation===check)status.textContent=K.errorMessage(error);return;}finally{if(generation===check)submit.disabled=revision===null;}}
    }
    target.onchange=updateTarget;void updateTarget();
    busyForm(form,async values=>{
      if(K.user?.id!==owner)throw new Error('Your account changed. Reopen this recipe.');const destination=values.get('target');if(!destination)throw new Error('Choose where to share.');
      const snapshot=await K.prepareSnapshot(recipe,{includePhoto:values.get('includePhoto')==='on'});
      if(destination==='public')await K.social({op:'publish',sourceId,recipe:snapshot,displayName:values.get('displayName'),permissionConfirmed:values.get('permission')==='on',expectedVersion:ref?.version||0});
      else {if(revision===null)throw new Error('Wait for the cookbook to finish loading.');await K.social({op:'share',bookId:destination,sourceId,recipe:snapshot,expectedVersion:revision});}
      dialog.close();toast(destination==='public'?'Published in All recipes → Community.':'A copy is saved in the shared cookbook.');if(destination==='public')await loadCommunity(true);else await openBook(destination);
    });
    form.querySelector('[data-new-shared-book]').onclick=createBook;
    form.querySelector('[data-unpublish]')?.addEventListener('click',async()=>{if(!confirm('Remove the public version from All recipes? Personal copies already saved by others are kept.'))return;try{await K.social({op:'unpublish',sourceId,expectedVersion:ref.version});dialog.close();toast('Removed from All recipes. Your private recipe is kept.');await loadCommunity(true);}catch(error){status.textContent=K.errorMessage(error);}});
  };
  // Cookbook/profile roots are re-rendered by their existing controller.
  function onChange(){
    models();renderHome();
    if(K.user?.id!==activeOwner){activeOwner=K.user?.id;inviteLinks.clear();dialog.close();bookId=null;}
    const allowed=new Set(K.list('shared_book_view').map(r=>r.id));
    for(const el of document.querySelectorAll('dialog[data-shared-book-id]'))if(el.dataset.sharedBookId&&!allowed.has(el.dataset.sharedBookId)){el.close();el.querySelector('form')?.reset();}
    if(bookId&&dialog.open&&dialog.dataset.mode==='book'){
      if(!book()){dialog.close();bookId=null;}
      else if(!bookBusy){if(!K.offline&&bookLoadedVersion!==book().version)void fetchBook(true);else renderBook();}
    }
    void openJoin();
  }
  window.addEventListener('kitchen:change',onChange);
  window.addEventListener('kitchen:cookbook-render',renderHome);
  dialog.addEventListener('close',()=>{if(!dialog.open&&dialog.dataset.mode==='book')bookId=null;});
  onChange();
  if(location.pathname.endsWith('index.html')||location.pathname.endsWith('/') ){
    const isLibrary=new URLSearchParams(location.search).get('view')==='recipes';
    if(isLibrary){const panel=document.createElement('div');panel.className='community-controls';panel.innerHTML=`<label>Recipe library<select id="recipe-origin" aria-label="Recipe library"><option value="all">All recipes</option><option value="anna">Anna’s recipes</option><option value="community">Community</option><option value="mine">My recipes</option></select></label><p class="form-hint" id="community-status" role="status"></p><button type="button" class="clear-button" id="community-more">Load more community recipes</button>`;document.querySelector('.control-panel')?.prepend(panel);panel.querySelector('select').onchange=()=>window.dispatchEvent(new Event('kitchen:community'));panel.querySelector('button').onclick=()=>loadCommunity(false);void loadCommunity(true);setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void loadCommunity(true);},60000);}
    if(location.hash.startsWith('#recipe=community-')){let opened=false;const check=()=>{if(!opened&&K.ready){opened=true;void K.openCommunity(decodeURIComponent(location.hash.slice(8)));}};window.addEventListener('kitchen:change',check);check();}
  }
  const sharedParams=new URLSearchParams(location.search);
  if(sharedParams.has('sharedBook')){
    let opening=false,opened=false;
    const openLinkedBook=async()=>{
      if(opening||opened||!K.ready||!K.user)return;
      const id=sharedParams.get('sharedBook');if(!K.get('shared_book_view',id)){toast('This cookbook is available only to invited members.');return;}
      opening=true;
      try{await openBook(id);const itemId=sharedParams.get('sharedRecipe');if(itemId){let item=K.get('shared_recipe_view',itemId);if(!item&&!K.offline)item=await K.social({op:'shared-item',bookId:id,itemId});if(item)K.openRecipe({...item.recipe,id:item.id,isShared:true,sharedBookId:id,contributorId:item.contributor_id,contributorName:item.contributor_name,sharedEntry:item},{sharedVerified:item.id});}opened=true;}catch(error){toast(K.errorMessage(error));}finally{opening=false;}
    };
    window.addEventListener('kitchen:change',openLinkedBook);void openLinkedBook();
  }
  K.communityRefresh=()=>loadCommunity(true);
})();
