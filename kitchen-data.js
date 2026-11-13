/* Shared private-data boundary. Guest storage is never used as an account cache. */
(() => {
  const client = window.AnnaBackend?.createClient(window.ANNA_APPWRITE_CONFIG);
  const kinds = ['favourite', 'recipe', 'entry', 'history', 'collection', 'meal', 'grocery', 'profile'];
  let user = null, ready = false, rows = [], status = 'Opening your kitchen…', epoch = 0, busy = false, recovery = false;
  let queue = Promise.resolve(), offline = false, downloaded = false, downloadGeneration = 0;
  const cache = window.AnnaOffline;
  const disconnected = () => typeof navigator !== 'undefined' && navigator.onLine === false;
  const requireConnection = () => {if(offline || disconnected())throw new Error('Go online to save changes to your account. Your downloaded recipes are available to read.');};
  function syncedStatus() {return 'Up to date · saved to your account' + (downloaded && cache?.shellReady ? ' · available offline' : cache?.shellUnavailable ? ' · offline app download unavailable; retry online' : cache ? ' · preparing offline access…' : '');}
  async function download() {
    if(!cache || !user?.emailVerified || offline)return;
    const generation=epoch, owner=user.id, stamp=cache.revision(), attempt=++downloadGeneration;
    downloaded=false;
    try {
      const snapshot=await cache.save(user,rows,stamp);
      for(const path of snapshot.paths) {
        if(generation!==epoch || attempt!==downloadGeneration)return;
        if(await cache.photo(owner,path))continue;
        const {data,error}=await client.storage.from('kitchen-photos').createSignedUrl(path,300);
        if(error)throw error;
        const blob=await (await fetch(data.signedUrl)).blob();
        if(generation!==epoch || attempt!==downloadGeneration)return;
        await cache.putPhoto(owner,path,blob,stamp);
      }
      if(generation!==epoch || attempt!==downloadGeneration)return;
      await cache.complete(snapshot);
      if(generation===epoch && attempt===downloadGeneration){downloaded=true;status=syncedStatus();emit();}
    } catch {
      if(generation===epoch && attempt===downloadGeneration){status='Saved to your account · offline download incomplete; retry sync online';emit();}
    }
  }
  async function restoreOffline(error) {
    if(client?.allowOfflineIdentity===false || Number(error?.code)>=400)return false;
    if(user && ready){offline=true;status='Offline · downloaded kitchen · reconnect to save and sync';emit();return true;}
    const generation=epoch, snapshot=await cache?.restore().catch(()=>null);
    if(generation!==epoch)return false;
    if(!snapshot){
      rows=guestRows();ready=true;offline=true;status='Offline · guest kitchen on this device · sign in online to download your account';emit();return true;
    }
    epoch++; user=snapshot.user;rows=snapshot.rows;ready=true;offline=true;downloaded=true;
    status='Offline · downloaded kitchen · reconnect to save and sync' + (snapshot.photosReady ? '' : ' · some photos may be unavailable');emit();return true;
  }
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const keyOf = r => `${r.kind}:${r.id}`;
  function guestRows() {
    const stored = read('annaKitchenGuest', []);
    const current = Array.isArray(stored) ? stored : [];
    const map = new Map(current.filter(r => r && kinds.includes(r.kind) && r.id && r.data && typeof r.data === 'object').map(r => [keyOf(r), r]));
    const add = (kind, id, data) => { if (!map.has(`${kind}:${id}`)) map.set(`${kind}:${id}`, { kind, id: String(id), data, version: 0 }); };
    const favourites = read('annaRecipeFavourites', []);
    if (Array.isArray(favourites)) favourites.forEach(id => add('favourite', id, {}));
    const originals = read('annaCustomRecipes', []);
    if (Array.isArray(originals)) originals.filter(r => r?.id && r?.title).forEach(r => add('recipe', r.id, r));
    Object.entries(read('annaMealPlan', {})).forEach(([id, recipe_id]) => add('meal', id, {recipe_id}));
    return [...map.values()];
  }
  function emit() { window.dispatchEvent(new CustomEvent('kitchen:change')); }
  function errorMessage(error) { return error?.message || 'Could not connect. Your changes have not been saved. Please try again.'; }
  function persistGuest() {
    localStorage.setItem('annaKitchenGuest', JSON.stringify(rows));
    // Keep legacy guest keys untouched as an additional migration backup.
  }
  function list(kind) { return rows.filter(r => r.kind === kind && !r.deleted).map(r => structuredClone(r)); }
  function get(kind, id) { return structuredClone(rows.find(r => r.kind === kind && r.id === String(id) && !r.deleted)?.data); }
  async function load() {
    if (!user || busy) return;
    const generation = epoch, owner = user.id;
    busy = true;
    try {
      let all = [], offset = 0;
      while (true) {
        const {data, error} = await client.from('kitchen_records').select('*').eq('user_id', owner)
          .order('kind').order('id').range(offset, offset + 499);
        if (error) throw error;
        all.push(...data);
        if (data.length < 500) break;
        offset += 500;
      }
      if (generation !== epoch) return;
      const changed = offline || JSON.stringify(rows) !== JSON.stringify(all) || !ready || status !== syncedStatus();
      if(changed)downloaded=false;
      rows = all; ready = true; offline=false; status = syncedStatus(); if (changed) emit();
      if(changed || !downloaded)void download();
    } catch (error) {
      if (generation === epoch) { if(disconnected() && ready){offline=true;status='Offline · downloaded kitchen · reconnect to save and sync';}else status = `Sync unavailable: ${errorMessage(error)}`; emit(); }
      throw error;
    } finally { busy = false; }
  }
  function batch(changes, versions) {
    const generation = epoch;
    const payload = changes.map((change, i) => ({...change, id: String(change.id),
        expected_version: versions?.[i] ?? rows.find(r => keyOf(r) === keyOf(change))?.version ?? 0 }));
    const run = async () => {
      if (generation !== epoch) throw new Error('Your account changed. Please reopen this page.');
      if (!ready) throw new Error('Your kitchen is still loading. Retry sync before saving.');
      if (!user) {
        const next = rows.slice();
        payload.forEach(c => {
          const index = next.findIndex(r => keyOf(r) === keyOf(c));
          const row = {...c, version: c.expected_version + 1};
          if (index < 0) next.push(row); else next[index] = row;
        });
        const previous = rows; rows = next;
        try { persistGuest(); } catch (error) { rows = previous; throw error; }
        status = 'Saved on this device · sign in to sync'; emit(); return;
      }
      requireConnection();
      status = 'Saving…'; emit();
      const {data, error} = await client.rpc('save_kitchen_records', {changes: payload});
      if (generation !== epoch) throw new Error('Your account changed while saving.');
      if (error) {
        status = `Not saved: ${errorMessage(error)}`; emit();
        // Refresh the current version after a conflict; preserve the editor's draft.
        if (error.message?.includes('changed on another device')) await load().catch(() => {});
        throw error;
      }
      data.forEach(row => {
        const index = rows.findIndex(r => keyOf(r) === keyOf(row));
        if (index < 0) rows.push(row); else rows[index] = row;
      });
      downloaded=false;status = syncedStatus(); emit(); void download();
    };
    const result = queue.then(run);
    queue = result.catch(() => {});
    return result;
  }
  async function importGuest() {
    if (!user || !ready) throw new Error('Sign in and finish loading your account first.');
    requireConnection();
    const generation = epoch;
    const records = guestRows().filter(r => !r.deleted);
    const {error} = await client.rpc('import_kitchen_guest', {records: records.map(({kind,id,data}) => ({kind,id,data}))});
    if (error) throw error;
    if (generation !== epoch) throw new Error('Your account changed during import.');
    while (busy) await new Promise(resolve => setTimeout(resolve, 20));
    if (generation !== epoch) throw new Error('Your account changed during import.');
    await load(); // Never remove source data, even after a successful import.
    localStorage.setItem(`annaKitchenImported:${user.id}`, JSON.stringify(records));
    emit();
  }
  function hasImport() {
    return Boolean(user && guestRows().some(r => !r.deleted) &&
      localStorage.getItem(`annaKitchenImported:${user.id}`) !== JSON.stringify(guestRows().filter(r => !r.deleted)));
  }
  async function changeSession(session) {
    const next = session?.user || null;
    if (next?.id === user?.id && next?.emailVerified === user?.emailVerified && ready) { user = next; emit(); return; }
    epoch++; const generation=epoch; offline=false;downloaded=false;downloadGeneration++;
    user = next; rows = []; ready = !user; if (!user) recovery = false;
    status = user ? 'Loading your private kitchen…' : 'Guest kitchen · saved on this device';
    if (!user) rows = guestRows();
    emit();
    if(cache){const saved=await cache.restore().catch(()=>null);if(!next || saved?.user?.id!==next.id)await cache.clear().catch(()=>{});}
    if(generation!==epoch)return;
    // Ensure a load from the previous account has finished before starting this one.
    while (busy) await new Promise(resolve => setTimeout(resolve, 20));
    if (user?.id === next?.id && user) await load().catch(async error => {if(generation===epoch && !ready)await restoreOffline(error);});
  }
  async function signOut() {
    const {error} = await client.auth.signOut({scope: 'local'});
    if (error) throw error;
    await changeSession(null);
  }
  async function upload(file) {
    if (!user || !ready) throw new Error('Sign in to upload private dish photos.');
    requireConnection();
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
      throw new Error('Choose a JPG, PNG or WebP photo smaller than 8 MB.');
    const owner = user.id, generation = epoch;
    const path = `${owner}/${crypto.randomUUID()}.${{'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]}`;
    const {error} = await client.storage.from('kitchen-photos').upload(path, file, {contentType:file.type, upsert:false});
    if (error) throw error;
    if (generation !== epoch) throw new Error('Your account changed during upload.');
    return path;
  }
  async function photoUrl(path) {
    if (!user || !path?.startsWith(`${user.id}/`)) return '';
    const generation = epoch;
    const cached=await cache?.photo(user.id,path).catch(()=>'');
    if(generation!==epoch)return '';
    if(cached)return cached;
    if(offline || disconnected())return '';
    const {data, error} = await client.storage.from('kitchen-photos').createSignedUrl(path, 300);
    return !error && generation === epoch ? data.signedUrl : '';
  }
  window.AnnaKitchen = {client, list, get, batch, importGuest, hasImport, signOut, upload, photoUrl,
    get offline() {return offline;}, get user() {return user;}, get passwordRecovery() {return recovery;}, finishRecovery() {recovery = false;}, get ready() {return ready;}, get status() {return status;},
    version: (kind,id) => rows.find(r => r.kind === kind && r.id === String(id))?.version ?? 0,
    set: (kind,id,data,version) => batch([{kind,id,data,deleted:false}], version === undefined ? undefined : [version]),
    remove: (kind,id,version) => batch([{kind,id,data:{},deleted:true}], version === undefined ? undefined : [version]),
    refresh: () => queue.then(async () => {
      if (!client) return;
      const {data,error} = await client.auth.getSession(); if (error) {if(await restoreOffline(error))return;throw error;}
      if (data.session?.user?.id !== user?.id || data.session?.user?.emailVerified !== user?.emailVerified || !ready) await changeSession(data.session);
      else await load();
    }), errorMessage
  };
  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      // Schedule data work outside the authentication callback.
      setTimeout(() => { changeSession(session).catch(() => {}); if (event === 'PASSWORD_RECOVERY') { recovery = true; window.dispatchEvent(new Event('kitchen:recovery')); } }, 0);
    });
    client.auth.getSession().then(async ({data,error}) => {
      if (error) { if(await restoreOffline(error))return;status = `Unable to restore session: ${errorMessage(error)}`; emit(); return; }
      return changeSession(data.session);
    }).catch(error => {status = errorMessage(error); emit();});
  } else { ready = true; rows = guestRows(); status = 'Guest kitchen · account service unavailable'; }
  setInterval(() => { if (user && document.visibilityState === 'visible') window.AnnaKitchen.refresh().catch(() => {}); }, 15000);
  window.addEventListener('kitchen:offline-unavailable',()=>{if(user && ready && !offline){status=syncedStatus();emit();}});
  window.addEventListener('kitchen:offline-ready',()=>{if(user && downloaded && !offline){status=syncedStatus();emit();}});
  window.addEventListener('offline',()=>{if(user && ready){offline=true;status='Offline · downloaded kitchen · reconnect to save and sync';emit();}});
  window.addEventListener('online', () => window.AnnaKitchen.refresh().catch(() => {}));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') window.AnnaKitchen.refresh().catch(() => {}); });
  window.addEventListener('storage', event => { if(event.key==='annaKitchenAuthRevision'){epoch++;downloadGeneration++;user=null;rows=[];ready=false;offline=false;emit();window.AnnaKitchen.refresh().catch(()=>{});return;} if (!user && event.key?.startsWith('anna')) {rows = guestRows(); emit();} });
})();
