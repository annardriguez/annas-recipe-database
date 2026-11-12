(() => {
  const K = window.AnnaKitchen;
  const root = document.querySelector('#personal-content');
  const dialog = document.querySelector('#journal-dialog');
  const editor = document.querySelector('#journal-content');
  const isProfile = location.pathname.endsWith('profile.html');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses = {'want to try':'Want to try','made it':'Made it','make again':'Make again'};
  let filter = 'all', collection = '', query = '', owner, openedQuery = false, toastTimer;
  function toast(message) {const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4500);}
  const date = value => value ? new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'}) : '';
  const today = () => {const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function recipeById(id) {return recipes.find(r => r.id === id);}
  function savedIds() {return [...new Set([...K.list('favourite').map(r => r.id),...K.list('entry').map(r => r.id)])];}
  function syncPanel() {
    return `<div class="kitchen-sync-bar"><span role="status">${escape(K.status)}</span><button class="clear-button" data-action="refresh">Retry / refresh</button>${K.user ? '<a href="profile.html">My profile ↗</a>' : '<button class="clear-button" data-action="login">Sign in to take it with you ↗</button>'}</div>
      ${K.hasImport() ? `<aside class="import-card"><div><strong>A little piece of your guest kitchen</strong><p>Import recipes, notes and plans from this browser. Existing account items take priority. Your local originals stay safe.</p></div><button class="primary-button" data-action="import">Import local collection</button></aside>` : ''}`;
  }
  function card(id) {
    const recipe = recipeById(id), entry = K.get('entry',id) || {};
    if (!recipe) return `<article class="memory-card"><div class="memory-copy"><h3>Recipe unavailable</h3><p>This saved recipe (${escape(id)}) is no longer in the library.</p><button class="clear-button" data-remove="${escape(id)}">Remove bookmark</button></div></article>`;
    const history = K.list('history').filter(r => r.data.recipe_id === id).sort((a,b) => (b.data.cooked_on || '').localeCompare(a.data.cooked_on || ''));
    const last = history[0]?.data.cooked_on;
    return `<article class="memory-card">
      <button class="memory-art" data-edit="${escape(id)}" aria-label="Open ${escape(recipe.title)}">${K.art(recipe)}${entry.photo ? `<img data-photo="${escape(entry.photo)}" alt="Your ${escape(recipe.title)}" hidden>` : ''}<span class="memory-stamp">${escape(entry.status || (recipe.isCustom ? 'from my kitchen' : 'want to try'))}</span></button>
      <div class="memory-copy"><p class="eyebrow">${recipe.isCustom ? 'An original creation' : 'A keeper from the library'} · ${escape(recipe.time)} min</p><h3><button data-edit="${escape(id)}">${escape(recipe.title)}</button></h3>
      <p>${escape(entry.notes || recipe.description)}</p>
      <div class="memory-meta"><span>${entry.rating ? '★'.repeat(Math.min(5, Math.max(0, Number(entry.rating)))) : 'Waiting for your first taste'}</span><span>${last ? `Last cooked ${date(last)}` : 'A new chapter'}</span></div>
      <button class="clear-button" data-edit="${escape(id)}">Open recipe & journal ↗</button></div></article>`;
  }
  function historyCards() {
    const history = K.list('history').sort((a,b) => (b.data.cooked_on || '').localeCompare(a.data.cooked_on || ''));
    return history.length ? `<div class="history-list">${history.map(({id,data}) => `<article class="history-card"><div class="history-date">${escape(date(data.cooked_on))}</div><div><h3>${escape(data.title || recipeById(data.recipe_id)?.title || 'A meal from your kitchen')}</h3><p>${escape(data.notes || 'A little memory, saved.')}</p><span>${data.rating ? '★'.repeat(Math.min(5,Math.max(0,Number(data.rating)))) : ''}</span><div class="account-actions"><button class="clear-button" data-history="${escape(id)}">Edit memory</button><button class="clear-button" data-delete-history="${escape(id)}">Delete memory</button></div></div>${data.photo ? `<img data-photo="${escape(data.photo)}" alt="Your cooked dish" hidden>` : ''}</article>`).join('')}</div>` : empty('The meals become the memories.', 'Record your first cook in a recipe’s journal.');
  }
  function empty(title,text) {return `<div class="journal-empty"><span>✳</span><h3>${title}</h3><p>${text}</p><a href="index.html?view=recipes">Find a recipe to keep ↗</a></div>`;}
  function render() {
    if (!root) return;
    const focusId = root.contains(document.activeElement) ? document.activeElement.id : null;
    const selection = focusId && document.activeElement.selectionStart;
    const changedOwner = owner !== K.user?.id;
    if (changedOwner) {dialog.close(); editor.replaceChildren(); owner = K.user?.id; filter = 'all'; collection = '';}
    const draftName = !changedOwner ? root.querySelector('[name="display_name"]')?.value : undefined;
    const profile = K.get('profile','me') || {};
    const name = profile.display_name || K.user?.user_metadata?.display_name || 'your kitchen';
    root.innerHTML = `<section class="journal-hero"><div><p class="eyebrow">${isProfile ? 'A place at the table' : 'Collected, cooked, loved'}</p><h1>${isProfile ? `Hello, <em>${escape(name)}.</em>` : 'My <em>cookbook.</em>'}</h1><p>${isProfile ? 'A few things about you, and all the good things you’ve been cooking.' : 'The recipes you return to. The little changes that make them yours. A kitchen full of memories.'}</p></div><div class="journal-mark" aria-hidden="true">${isProfile ? '♡' : '✳'}<small>${isProfile ? 'MAKE YOURSELF AT HOME' : 'A LITTLE TASTE OF YOU'}</small></div></section>${syncPanel()}`;
    if (!K.ready) {root.insertAdjacentHTML('beforeend', '<div class="journal-empty"><h2>Your kitchen is loading.</h2><p>If the connection failed, use Retry / refresh above.</p></div>'); bind(); return;}
    if (isProfile) {
      root.insertAdjacentHTML('beforeend', `<section class="profile-grid"><div class="profile-paper"><p class="eyebrow">Profile & settings</p><h2>Your corner of the kitchen</h2>${K.user ? `<p>${escape(K.user.email)}</p><form id="profile-form" class="journal-form"><label>Display name<input name="display_name" maxlength="80" required value="${escape(draftName ?? name)}" autocomplete="nickname"></label><button class="primary-button">Save profile</button></form><div class="account-actions"><button class="planner-tool-button" data-action="password">Send password reset email</button><button class="planner-tool-button" data-action="logout">Log out on this device</button></div>` : `<p>Sign in to give your recipes a home on every device.</p><button class="primary-button" data-action="login">Log in / create an account</button>`}</div><div class="profile-paper"><p class="eyebrow">A growing collection</p><h2>Made by you.</h2><div class="profile-stats"><a href="cookbook.html"><strong>${K.list('recipe').length}</strong>Original recipes</a><a href="cookbook.html"><strong>${savedIds().length}</strong>Saved recipes</a><a href="cookbook.html"><strong>${K.list('collection').length}</strong>Collections</a><a href="cookbook.html?tab=history"><strong>${K.list('history').length}</strong>Cooking memories</a></div></div></section><section class="journal-section"><p class="eyebrow">Kept close</p><h2>Saved recipes</h2>${savedIds().length ? `<div class="memory-grid">${savedIds().slice(0,3).map(card).join('')}</div><p><a href="cookbook.html">Open my whole cookbook ↗</a></p>` : empty('Your first keeper is waiting.', 'Save a recipe from the library to get started.')} </section><section class="journal-section"><p class="eyebrow">Your recipe shelves</p><h2>Cookbook collections</h2>${collectionManager()}</section><section class="journal-section"><p class="eyebrow">Around your table</p><h2>Cooking history</h2>${historyCards()}</section>`);
    } else {
      root.insertAdjacentHTML('beforeend', `<div class="journal-toolbar"><div class="journal-tabs" role="group" aria-label="Cookbook sections">${[['all','Saved recipes'],['originals','Original creations'],['history','Cooking history']].map(([id,label]) => `<button data-tab="${id}" aria-pressed="${filter === id}" class="${filter===id?'active':''}">${label}</button>`).join('')}</div><button class="primary-button" data-action="new">+ An original recipe</button></div><div class="shelf-toolbar"><label>Find a memory<input id="cookbook-search" type="search" placeholder="Recipe or personal note…" value="${escape(query)}"></label><label>Your collections<select id="collection-filter"><option value="">Every shelf</option>${K.list('collection').map(r => `<option value="${escape(r.id)}" ${r.id===collection?'selected':''}>${escape(r.data.name)}</option>`).join('')}</select></label><button class="clear-button" data-action="collections">Manage collections</button></div><section id="cookbook-results" aria-live="polite"></section>`);
      renderResults();
    }
    bind(); hydratePhotos();
    if (focusId && !changedOwner) {const input = document.getElementById(focusId); if (input) {input.focus(); if (typeof selection === 'number') input.setSelectionRange(selection,selection);}}
    if (!isProfile && !openedQuery && K.ready && new URLSearchParams(location.search).has('recipe')) {
      openedQuery = true; const recipe = recipeById(new URLSearchParams(location.search).get('recipe')); if (recipe) openEntry(recipe.id);
    }
  }
  function renderResults() {
    const results = document.querySelector('#cookbook-results'); if (!results) return;
    if (filter === 'history') {results.innerHTML = historyCards(); return;}
    let ids = filter === 'originals' ? K.list('recipe').map(r => r.id) : savedIds();
    ids = ids.filter(id => {
      const recipe = recipeById(id), entry = K.get('entry',id) || {};
      return (!collection || entry.collection_ids?.includes(collection)) && `${recipe?.title || ''} ${entry.notes || ''}`.toLowerCase().includes(query.toLowerCase());
    });
    results.innerHTML = ids.length ? `<div class="memory-grid">${ids.map(card).join('')}</div>` : empty(filter === 'originals' ? 'Something only you make.' : 'Good things belong here.', filter === 'originals' ? 'Add a family favourite, a happy accident, or a recipe of your own.' : 'Save a recipe from the library, or begin a collection of your own.');
  }
  function collectionManager() {
    return `<div class="collection-shelves">${K.list('collection').map(r => `<div class="collection-shelf"><span>▤</span><strong>${escape(r.data.name)}</strong><small>${K.list('entry').filter(e => e.data.collection_ids?.includes(r.id)).length} recipes</small><button class="clear-button" data-rename-collection="${escape(r.id)}">Rename</button><button class="clear-button" data-delete-collection="${escape(r.id)}">Delete</button></div>`).join('') || '<p>Your first shelf is waiting.</p>'}</div><form id="collection-form" class="grocery-form"><label class="visually-hidden" for="new-collection">Collection name</label><input id="new-collection" name="name" required maxlength="80" placeholder="Sunday suppers, little comforts…"><button class="primary-button">Add collection</button></form>`;
  }
  async function hydratePhotos(scope = root) {
    for (const img of scope.querySelectorAll('[data-photo]')) {
      const url = await K.photoUrl(img.dataset.photo);
      if (url && img.isConnected) {img.src = url; img.hidden = false;}
    }
  }
  function showEditor(html) {editor.innerHTML = html; if (!dialog.open) dialog.showModal(); hydratePhotos(editor);}
  function saveForm(form, fn) {
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button = form.querySelector('[type="submit"]') || form.querySelector('button'); button.disabled = true;
      const message = form.querySelector('[data-form-message]');
      try {await fn(new FormData(form)); dialog.close(); toast(K.user ? 'Saved to your kitchen.' : 'Saved on this device.');}
      catch(e) {if (message) message.textContent = K.errorMessage(e); else toast(K.errorMessage(e));}
      finally {button.disabled = false;}
    });
  }
  function openEntry(id) {
    const recipe = recipeById(id); if (!recipe) return;
    const entry = K.get('entry',id) || {}; let version = K.version('entry',id), photo = entry.photo;
    showEditor(`<div class="journal-editor"><p class="eyebrow">Your recipe, your way</p><h2 id="journal-title">${escape(recipe.title)}</h2><p>${escape(recipe.description)}</p><div class="journal-recipe"><div><h3>Ingredients</h3><ul>${recipe.ingredients.map(s => `<li>${escape(s)}</li>`).join('')}</ul></div><div><h3>Method</h3><ol>${recipe.steps.map(s => `<li>${escape(s)}</li>`).join('')}</ol></div></div><form class="journal-form" id="entry-form">
      <div class="form-pair"><label>On my list<select name="status">${Object.entries(statuses).map(([key,label])=>`<option ${entry.status===key?'selected':''}>${label.toLowerCase()}</option>`).join('')}</select></label><label>My rating<select name="rating"><option value="0">Not rated yet</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(entry.rating)===n?'selected':''}>${'★'.repeat(n)}</option>`).join('')}</select></label></div>
      <label>Kitchen notes<textarea name="notes" rows="3" maxlength="12000" placeholder="What made it special?">${escape(entry.notes || '')}</textarea></label><label>Modifications & substitutions<textarea name="substitutions" rows="2" maxlength="12000" placeholder="A little less chilli, oat milk instead…">${escape(entry.substitutions || '')}</textarea></label>
      <fieldset><legend>Keep it on a shelf</legend>${K.list('collection').map(c=>`<label class="check-label"><input type="checkbox" name="collections" value="${escape(c.id)}" ${entry.collection_ids?.includes(c.id)?'checked':''}>${escape(c.data.name)}</label>`).join('') || '<p>Create a collection from your cookbook page to organise this recipe.</p>'}</fieldset>
      ${photo ? `<img class="editor-photo" data-photo="${escape(photo)}" alt="Your cooked dish" hidden><label class="check-label"><input type="checkbox" name="remove_photo">Remove this photo</label>` : ''}
      <label>A photo from your kitchen<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" ${K.user?'':'disabled'}></label><small>${K.user?'JPG, PNG or WebP, up to 8 MB. Visible only to your account.':'Sign in to upload photos to your private kitchen.'}</small>
      <div class="memory-log"><label class="check-label"><input type="checkbox" name="log">I cooked this — add a memory</label><label>Cooked on<input type="date" name="cooked_on" value="${today()}" max="${today()}"></label><p>Each cook becomes its own memory, with today’s notes, photo and rating.</p></div>
      <p data-form-message role="alert"></p><button type="submit" class="primary-button">Save to my cookbook</button></form><div class="account-actions">${recipe.isCustom?`<button class="planner-tool-button" id="edit-original">Edit original recipe</button>`:''}<button class="clear-button" id="remove-entry">Remove from cookbook</button></div></div>`);
    saveForm(editor.querySelector('#entry-form'), async values => {
      const file = values.get('photo'); if (file?.size) photo = await K.upload(file);
      if (values.get('remove_photo') && !file?.size) photo = null;
      const data = {...entry,status:values.get('status'),rating:Number(values.get('rating')),notes:values.get('notes'),substitutions:values.get('substitutions'),collection_ids:values.getAll('collections'),photo:photo || null};
      const changes = [{kind:'entry',id,data,deleted:false}], versions = [version];
      if (values.get('log')) {
        if (!values.get('cooked_on')) throw new Error('Choose the date you cooked this recipe.');
        changes.push({kind:'history',id:crypto.randomUUID(),data:{...data,recipe_id:id,title:recipe.title,cooked_on:values.get('cooked_on')},deleted:false}); versions.push(0);
      }
      try {await K.batch(changes,versions);} catch(e) {
        // Keep the draft, but require reopening after a conflict so it is reviewed.
        if (e.message?.includes('changed on another device')) throw new Error('Another device changed this entry. Copy your draft, close this editor, and reopen it to review the latest version.');
        throw e;
      }
    });
    editor.querySelector('#edit-original')?.addEventListener('click', () => openOriginal(id));
    editor.querySelector('#remove-entry').onclick = () => removeEntry(id);
  }
  async function removeEntry(id) {
    if (!confirm('Remove this saved recipe and its personal notes? Cooking history will be kept.')) return;
    try {await K.batch(['entry','favourite'].map(kind => ({kind,id,data:{},deleted:true}))); dialog.close();}
    catch(e) {toast(K.errorMessage(e));}
  }
  function openOriginal(id) {
    const recipe = id ? recipeById(id) : {}, version = id ? K.version('recipe',id) : 0;
    const recipeId = id || `custom-${crypto.randomUUID()}`;
    showEditor(`<div class="journal-editor"><p class="eyebrow">From your own kitchen</p><h2 id="journal-title">${id?'A little refinement.':'An original creation.'}</h2><form id="original-form" class="journal-form"><label>Recipe title<input name="title" required maxlength="180" value="${escape(recipe?.title || '')}"></label><label>A few words about it<textarea name="description" maxlength="3000">${escape(recipe?.description || '')}</textarea></label><div class="form-pair"><label>Minutes<input name="time" type="number" min="1" max="10080" value="${recipe?.time || 20}" required></label><label>Category<select name="category">${['main','breakfast','lunch','side','snack','sweet'].map(c=>`<option ${recipe?.category===c?'selected':''}>${c}</option>`).join('')}</select></label></div><label>Ingredients — one per line<textarea name="ingredients" rows="5" required maxlength="30000">${escape(recipe?.ingredients?.join('\n') || '')}</textarea></label><label>Method — one step per line<textarea name="steps" rows="5" required maxlength="30000">${escape(recipe?.steps?.join('\n') || '')}</textarea></label><label>Tags, separated by commas<input name="tags" value="${escape(recipe?.tags?.join(', ') || '')}" maxlength="500"></label><p data-form-message role="alert"></p><button type="submit" class="primary-button">Save original recipe</button></form>${id?'<button class="clear-button" id="delete-original">Delete original recipe</button>':''}</div>`);
    saveForm(editor.querySelector('#original-form'), async values => {
      // Preserve existing metadata; commas in ingredients and methods are ordinary punctuation.
      const data = window.AnnaCustomRecipes.normalize({...recipe,...Object.fromEntries(values),id:recipeId,ingredients:values.get('ingredients').split('\n').filter(Boolean),steps:values.get('steps').split('\n').filter(Boolean)});
      await K.set('recipe',recipeId,data,version);
    });
    editor.querySelector('#delete-original')?.addEventListener('click', async () => {
      if (!confirm('Delete this original recipe, bookmark and personal notes? Cooking memories will be kept.')) return;
      try {await window.AnnaCustomRecipes.remove(id); dialog.close();} catch(e) {toast(K.errorMessage(e));}
    });
  }
  function editHistory(id) {
    const item = K.get('history',id), version = K.version('history',id); if (!item) return;
    showEditor(`<div class="journal-editor"><p class="eyebrow">A memory from your kitchen</p><h2 id="journal-title">${escape(item.title)}</h2><form id="history-form" class="journal-form"><label>Cooked on<input name="cooked_on" type="date" required value="${escape(item.cooked_on)}" max="${today()}"></label><label>Notes<textarea name="notes" rows="4" maxlength="12000">${escape(item.notes)}</textarea></label><label>Rating<select name="rating">${[0,1,2,3,4,5].map(n=>`<option value="${n}" ${n===Number(item.rating)?'selected':''}>${n?'★'.repeat(n):'Not rated'}</option>`).join('')}</select></label><label>Replace photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" ${K.user?'':'disabled'}></label><label class="check-label"><input type="checkbox" name="remove_photo">Remove photo</label><p data-form-message role="alert"></p><button type="submit" class="primary-button">Save memory</button></form></div>`);
    let photo = item.photo;
    saveForm(editor.querySelector('#history-form'), async values => {
      const file = values.get('photo'); if (file?.size) photo = await K.upload(file);
      if (values.get('remove_photo') && !file?.size) photo = null;
      await K.set('history',id,{...item,cooked_on:values.get('cooked_on'),notes:values.get('notes'),rating:Number(values.get('rating')),photo},version);
    });
  }
  function bind() {
    root.querySelectorAll('[data-action]').forEach(button => button.onclick = async () => {
      const action = button.dataset.action;
      try {
        if (action === 'login') window.AnnaAccount.open();
        if (action === 'refresh') await K.refresh();
        if (action === 'new') openOriginal();
        if (action === 'collections') {showEditor(`<div class="journal-editor"><p class="eyebrow">A shelf for every mood</p><h2 id="journal-title">Your collections</h2>${collectionManager()}</div>`); bindCollections(editor);}
        if (action === 'logout') await K.signOut();
        if (action === 'import') {button.disabled = true; await K.importGuest(); toast('Imported. Your local originals are still on this device.');}
        if (action === 'password') {const {error} = await K.client.auth.resetPasswordForEmail(K.user.email,{redirectTo:new URL('profile.html',location.href).href}); if(error) throw error; toast('Check your email for the password reset link.');}
      } catch(e) {button.disabled = false; toast(K.errorMessage(e));}
    });
    root.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => {filter=button.dataset.tab; render();});
    root.querySelector('#cookbook-search')?.addEventListener('input', event => {query=event.target.value; renderResults(); bindCards(root); hydratePhotos();});
    root.querySelector('#collection-filter')?.addEventListener('change', event => {collection=event.target.value; renderResults(); bindCards(root); hydratePhotos();});
    const form = root.querySelector('#profile-form');
    if (form) {const version=K.version('profile','me'); form.onsubmit=async event => {event.preventDefault(); try {await K.set('profile','me',{display_name:new FormData(form).get('display_name').trim()},version); toast('Profile saved.');} catch(e) {toast(K.errorMessage(e));}};}
    bindCards(root); bindCollections(root); K.hydratePhotos();
  }
  function bindCards(scope) {
    scope.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEntry(b.dataset.edit));
    scope.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeEntry(b.dataset.remove));
    scope.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>editHistory(b.dataset.history));
    scope.querySelectorAll('[data-delete-history]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this cooking memory?'))return; try{await K.remove('history',b.dataset.deleteHistory);}catch(e){toast(K.errorMessage(e));}});
  }
  function bindCollections(scope) {
    const form = scope.querySelector('#collection-form');
    if (form) form.onsubmit = async event => {
      event.preventDefault(); const name=new FormData(form).get('name').trim(); if(!name)return;
      if(K.list('collection').some(r=>r.data.name.toLowerCase()===name.toLowerCase())) {toast('That collection already exists.');return;}
      try {await K.set('collection',crypto.randomUUID(),{name}); if(dialog.open) {dialog.close();} toast('A new shelf, ready for recipes.');}catch(e){toast(K.errorMessage(e));}
    };
    scope.querySelectorAll('[data-rename-collection]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.renameCollection, current=K.get('collection',id), version=K.version('collection',id);
      const name=prompt('Collection name',current.name)?.trim(); if(!name)return;
      try{await K.set('collection',id,{name:name.slice(0,80)},version);if(dialog.open)dialog.close();}catch(e){toast(K.errorMessage(e));}
    });
    scope.querySelectorAll('[data-delete-collection]').forEach(b=>b.onclick=async()=>{
      if(!confirm('Delete this collection? Its recipes and notes will be kept.'))return;
      try{await K.remove('collection',b.dataset.deleteCollection);if(dialog.open)dialog.close();}catch(e){toast(K.errorMessage(e));}
    });
  }
  document.querySelector('#journal-close').onclick = () => dialog.close();
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  if(new URLSearchParams(location.search).get('tab')==='history')filter='history';
  window.addEventListener('kitchen:change', render);
  render();
})();
