/* One cooking diary for library recipes, planner previews and the personal cookbook. */
(() => {
  const K = window.AnnaKitchen;
  let dialog = document.querySelector('#journal-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'journal-dialog';
    dialog.setAttribute('aria-labelledby','journal-title');
    dialog.innerHTML = '<button class="dialog-close" id="journal-close" aria-label="Close editor">×</button><div id="journal-content"></div>';
    document.body.append(dialog);
  }
  const editor = dialog.querySelector('#journal-content');
  const escape = K.html;
  const toast = K.notify;
  const statuses = {'want to try':'Want to try','made it':'Made it','make again':'Make again'};
  const today = () => {const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const recipeById = id => recipes.find(r => r.id === id);
  function showEditor(html) {
    editor.innerHTML = html;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    hydratePhotos(editor);
  }
  function openOriginal(id) { dialog.close(); K.openEditor(recipeById(id)); }
  async function hydratePhotos(scope = root) {
    for (const img of scope.querySelectorAll('[data-photo]')) {
      const url = await K.photoUrl(img.dataset.photo);
      if (url && img.isConnected) {img.src = url; img.hidden = false;}
    }
  }
  function saveForm(form, fn) {
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button = form.querySelector('[type="submit"]') || form.querySelector('button'); button.disabled = true;
      const message = form.querySelector('[data-form-message]');
      try {await fn(new FormData(form)); dialog.close(); toast(K.user ? 'Saved to your kitchen.' : 'Saved on this device.');}
      catch(e) {if (message) message.textContent = K.errorMessage(e); else toast(K.errorMessage(e));}
      finally {button.disabled = false;}
    });
  }
  function openEntry(id, options = {}) {
    const recipe = recipeById(id); if (!recipe) return;
    const entry = K.get('entry',id) || {}; let version = K.version('entry',id), photo = entry.photo || recipe.photo;
    const selectedStatus = options.log && (!entry.status || entry.status === 'want to try') ? 'made it' : entry.status;
    showEditor(`<div class="journal-editor"><p class="eyebrow">Your recipe, your way</p><h2 id="journal-title">${escape(recipe.title)}</h2><p>${escape(recipe.description)}</p><div class="journal-recipe"><div><h3>Ingredients</h3><ul>${recipe.ingredients.map(s => `<li>${escape(s)}</li>`).join('')}</ul></div><div><h3>Method</h3><ol>${recipe.steps.map(s => `<li>${escape(s)}</li>`).join('')}</ol></div></div><form class="journal-form" id="entry-form">
      <div class="form-pair"><label>On my list<select name="status">${Object.entries(statuses).map(([key,label])=>`<option ${selectedStatus===key?'selected':''}>${label.toLowerCase()}</option>`).join('')}</select></label><label>My rating<select name="rating"><option value="0">Not rated yet</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(entry.rating)===n?'selected':''}>${'★'.repeat(n)}</option>`).join('')}</select></label></div>
      <label>Kitchen notes<textarea name="notes" rows="3" maxlength="12000" placeholder="What made it special?">${escape(entry.notes || '')}</textarea></label><label>Modifications & substitutions<textarea name="substitutions" rows="2" maxlength="12000" placeholder="A little less chilli, oat milk instead…">${escape(entry.substitutions || '')}</textarea></label>
      <fieldset><legend>Keep it on a shelf</legend>${K.list('collection').map(c=>`<label class="check-label"><input type="checkbox" name="collections" value="${escape(c.id)}" ${entry.collection_ids?.includes(c.id)?'checked':''}>${escape(c.data.name)}</label>`).join('') || '<p>Create a collection from your cookbook page to organise this recipe.</p>'}</fieldset>
      ${photo ? `<img class="editor-photo" data-photo="${escape(photo)}" alt="Your cooked dish" hidden><label class="check-label"><input type="checkbox" name="remove_photo">Remove this photo</label>` : ''}
      <label>A photo from your kitchen<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" ${K.user?'':'disabled'}></label><small>${K.user?'JPG, PNG or WebP, up to 8 MB. Visible only to your account.':'Sign in to upload photos to your private kitchen.'}</small>
      <div class="memory-log"><label class="check-label"><input type="checkbox" name="log" ${options.log ? 'checked' : ''}>I cooked this — add a memory</label><label>Cooked on<input type="date" name="cooked_on" value="${today()}" max="${today()}"></label><p>Each cook becomes its own memory, with today’s notes, photo and rating.</p></div>
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

  dialog.querySelector('#journal-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {if(event.target === dialog)dialog.close();});
  dialog.addEventListener('close', () => document.body.classList.toggle('dialog-open',Boolean(document.querySelector('dialog[open]'))));
  let owner = K.user?.id;
  window.addEventListener('kitchen:change', () => {
    if (owner !== K.user?.id) {owner = K.user?.id; dialog.close(); editor.replaceChildren();}
  });
  K.journal = {openEntry, editHistory, removeEntry};
})();
