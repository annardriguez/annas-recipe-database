/* Link imports are previews. Only the existing editor's explicit Save writes records. */
(() => {
  const K=window.AnnaKitchen;
  if(!K?.openEditor)return;
  const dialog=document.createElement('dialog');dialog.id='recipe-import-dialog';dialog.setAttribute('aria-labelledby','import-title');
  dialog.innerHTML=`<button class="dialog-close" type="button" aria-label="Close recipe importer">×</button><form class="account-panel" id="recipe-import-form"><p class="eyebrow">A FIND WORTH KEEPING</p><h2 id="import-title">Bring a recipe home.</h2><p>Paste a recipe website link. Review the ingredients and method before saving it to your kitchen.</p><label>Recipe website link<input name="url" type="url" required maxlength="2048" placeholder="https://…" autocomplete="off"></label><label>Folder<select name="folder"><option value="">Choose after importing</option></select></label><label>Or start a new folder<input name="newFolder" maxlength="80" placeholder="Mum’s recipes, family favourites…"></label><p class="form-hint">Works with recipe websites that publish readable recipe details. Video and social-media links may need the creator’s recipe website.</p><p id="import-status" class="form-hint" role="status"></p><div class="account-actions"><button type="submit" class="primary-button">Preview recipe ↗</button><button type="button" class="text-button" data-cancel>Cancel</button></div></form>`;
  document.body.append(dialog);
  const form=dialog.querySelector('form'),status=dialog.querySelector('#import-status'),submit=form.querySelector('[type=submit]');
  let attempt=0,owner;
  function cancel(){attempt++;submit.disabled=false;dialog.close();}
  dialog.querySelector('.dialog-close').onclick=cancel;dialog.querySelector('[data-cancel]').onclick=cancel;
  dialog.addEventListener('click',event=>{if(event.target===dialog)cancel();});
  dialog.addEventListener('cancel',()=>{attempt++;submit.disabled=false;});
  function openImport(){
    form.reset();form.querySelector('[data-existing]')?.remove();status.textContent='';submit.disabled=false;attempt++;owner=K.user?.id;
    form.elements.folder.innerHTML='<option value="">Choose after importing</option>'+K.list('collection').map(c=>`<option value="${K.html(c.id)}">${K.html(c.data.name)}</option>`).join('');
    if(!K.user){status.textContent='Sign in to import website links. You can still add your own recipes manually.';submit.disabled=true;}
    else if(!K.user.emailVerified){status.textContent='Verify your email in My profile before importing website links.';submit.disabled=true;}
    else if(K.offline || !navigator.onLine){status.textContent='Reconnect to import a website. Your downloaded recipes are still available.';submit.disabled=true;}
    dialog.showModal();document.body.classList.add('dialog-open');
  }
  form.onsubmit=async event=>{
    event.preventDefault();if(!K.ready||!K.user?.emailVerified||K.offline||!navigator.onLine){status.textContent='Sign in, finish syncing and connect to the internet before importing.';return;}
    const url=form.elements.url.value.trim();let parsed;
    try{parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error();}catch{status.textContent='Paste a complete public recipe website link.';return;}
    // Ignore tracking parameters when detecting an already imported recipe.
    function identity(value){try{const u=new URL(value);u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key))u.searchParams.delete(key);return u.href.replace(/\/$/,'');}catch{return '';}}
    const duplicate=K.list('recipe').find(r=>identity(r.data.sourceUrl)&&identity(r.data.sourceUrl)===identity(url));
    if(duplicate){status.textContent='This recipe is already in your kitchen. Open it to edit or organise it.';let button=form.querySelector('[data-existing]');if(!button){button=document.createElement('button');button.type='button';button.className='text-button';button.dataset.existing='';status.after(button);}button.textContent='Open saved recipe ↗';button.onclick=()=>{cancel();K.openEditor(recipes.find(r=>r.id===duplicate.id));};return;}
    form.querySelector('[data-existing]')?.remove();
    const generation=++attempt,account=K.user.id;submit.disabled=true;status.textContent='Reading the recipe…';
    const folderId=form.elements.folder.value,newFolder=form.elements.newFolder.value.trim();
    try{
      const {data,error}=await K.client.importRecipe(url);if(error)throw error;
      if(generation!==attempt||!dialog.open||K.user?.id!==account)return;
      const recipe={...data.recipe};let photo=null;
      if(data.image){const bytes=Uint8Array.from(atob(data.image.base64),c=>c.charCodeAt(0));photo=new File([bytes],'imported-recipe.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[data.image.type]||'jpg'),{type:data.image.type});recipe.image=`data:${data.image.type};base64,${data.image.base64}`;recipe.imageCaption=recipe.sourceAuthor?`Recipe photo · ${recipe.sourceAuthor}`:'Photo from the original recipe';}
      dialog.close();K.openEditor(recipe,{imported:true,photo,folderId,newFolder});
      const editor=document.querySelector('#custom-recipe-dialog');
      editor.querySelector('#editor-status').textContent=['Review the imported recipe before saving. Nothing has been saved yet.',...(data.warnings||[])].join(' ');
    }catch(error){if(generation===attempt&&dialog.open)status.textContent=K.errorMessage(error);}
    finally{if(generation===attempt)submit.disabled=false;}
  };
  window.addEventListener('kitchen:change',()=>{if(owner!==K.user?.id){owner=K.user?.id;cancel();}});
  K.openImport=openImport;
})();
