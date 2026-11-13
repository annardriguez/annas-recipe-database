/* Device-only, last-account offline downloads. Never stored in the guest collection. */
(() => {
  const base = new URL('./',location.href);
  const databaseName = 'anna-kitchen-offline:' + base.pathname;
  const urls = new Map();
  let opened, shellReady = false, shellUnavailable = false;
  const revision = () => localStorage.getItem('annaKitchenAuthRevision') || 'initial';
  const locked = () => localStorage.getItem('annaKitchenSignedOut') === '1';
  function database() {
    if (!opened) opened = new Promise((resolve,reject) => {
      const request = indexedDB.open(databaseName,1);
      request.onupgradeneeded = () => {request.result.createObjectStore('state'); request.result.createObjectStore('photos');};
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {opened = null; throw error;});
    return opened;
  }
  async function transaction(mode, action) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(['state','photos'],mode);
      const state = tx.objectStore('state'), photos = tx.objectStore('photos');
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Offline storage is unavailable.'));
      const request = state.get('active');
      request.onsuccess = () => {try {result = action(state,photos,request.result, value => {result=value;});} catch(error) {tx.abort(); reject(error);}};
    });
  }
  function revoke() {for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}
  function matches(snapshot, owner) {return Boolean(snapshot) && !locked() && snapshot?.user?.id === owner && snapshot.revision === revision();}
  function photoPaths(user,rows) {
    const paths=new Set();
    function visit(value) {
      if(!value || typeof value !== 'object')return;
      for(const [key,item] of Object.entries(value)) {
        if(key==='photo' && typeof item==='string' && item.startsWith(user.id+'/'))paths.add(item);
        else if(item && typeof item==='object')visit(item);
      }
    }
    rows.filter(row=>!row.deleted).forEach(row=>visit(row.data));return [...paths];
  }
  const store = {
    revision, locked, get shellReady(){return shellReady;}, get shellUnavailable(){return shellUnavailable;},
    async save(user,rows,stamp) {
      if(!user?.emailVerified || locked() || revision()!==stamp)throw new Error('Account changed during download.');
      const snapshot={user:structuredClone(user),rows:structuredClone(rows),revision:stamp,downloadId:crypto.randomUUID(),savedAt:new Date().toISOString(),photosReady:false,paths:photoPaths(user,rows)};
      await transaction('readwrite',(state,photos,previous) => {
        if(locked() || revision()!==stamp)return;
        if(previous?.user?.id!==user.id){photos.clear();revoke();}
        state.put(snapshot,'active');
        const cursor=photos.openCursor();cursor.onsuccess=()=>{const item=cursor.result;if(!item)return;if(!snapshot.paths.includes(item.key)) {item.delete();if(urls.has(item.key)){URL.revokeObjectURL(urls.get(item.key));urls.delete(item.key);}}item.continue();};
      });
      return snapshot;
    },
    async complete(snapshot) {
      await transaction('readwrite',(state,_photos,current)=>{
        if(matches(current,snapshot.user.id) && current.downloadId===snapshot.downloadId)state.put({...current,photosReady:true},'active');
      });
    },
    restore:()=>transaction('readonly',(_state,_photos,snapshot)=>matches(snapshot,snapshot?.user?.id) && snapshot?.user?.emailVerified ? snapshot : null),
    async putPhoto(owner,path,blob,stamp) {
      // Store bytes rather than Blob objects for WebKit compatibility.
      const stored={bytes:await blob.arrayBuffer(),type:blob.type};
      await transaction('readwrite',(_state,photos,snapshot)=>{
        if(matches(snapshot,owner) && revision()===stamp && snapshot.paths.includes(path))photos.put(stored,path);
      });
    },
    async photo(owner,path) {
      if(!path?.startsWith(owner+'/'))return '';
      const blob=await transaction('readonly',(_state,photos,snapshot,done)=>{
        if(!matches(snapshot,owner) || !snapshot.paths.includes(path))return null;
        const request=photos.get(path);request.onsuccess=()=>done(request.result || null);
      });
      if(!blob || locked())return '';
      if(!urls.has(path))urls.set(path,URL.createObjectURL(new Blob([blob.bytes],{type:blob.type})));
      return urls.get(path);
    },
    async clear() {revoke();await transaction('readwrite',(state,photos)=>{state.clear();photos.clear();});}
  };
  window.AnnaOffline=store;
  async function register() {
    if(!('serviceWorker' in navigator)){shellUnavailable=true;return;}
    shellUnavailable=false;
    try {
      const registration=await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.href,updateViaCache:'none'});
      function watch(worker){if(!worker)return;const check=()=>{if(worker.state==='activated'){shellReady=true;window.dispatchEvent(new Event('kitchen:offline-ready'));}};worker.addEventListener('statechange',check);check();}
      watch(registration.active);watch(registration.installing);
      registration.addEventListener('updatefound',()=>watch(registration.installing));
      // Updates wait for open pages to close; no unsaved editor is reloaded.
    } catch {shellUnavailable=true;window.dispatchEvent(new Event('kitchen:offline-unavailable'));}
  }
  register();
  window.addEventListener('online',register);
})();
