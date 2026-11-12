/* Normalize Appwrite's SDK at the shared data boundary; the cookbook UI stays provider-independent. */
(() => {
  function createClient(config) {
    if (!window.Appwrite || !config?.projectId) return null;
    const {Client, Account, Functions, Storage, ID, Permission, Role} = window.Appwrite;
    const sdk = new Client().setEndpoint(config.endpoint).setProject(config.projectId);
    const account = new Account(sdk), functions = new Functions(sdk), storage = new Storage(sdk);
    const subscribers = new Set(), photos = new Map();
    let currentUser = null, recovery, notice = '', started;
    const userShape = user => user ? {id:user.$id,email:user.email,emailVerified:user.emailVerification,user_metadata:{display_name:user.name}} : null;
    const session = () => currentUser ? {user:currentUser} : null;
    function revokePhotos() {for(const url of photos.values()) URL.revokeObjectURL(url); photos.clear();}
    function changed(event,user) {if(currentUser?.id!==user?.id)revokePhotos(); currentUser=user; subscribers.forEach(fn=>fn(event,session()));}
    const result = async fn => {try{return {data:await fn(),error:null};}catch(error){return {data:null,error};}};
    async function readUser() {
      try {return userShape(await account.get());} catch(e) {if(e.code===401)return null; throw e;}
    }
    function redirect(url,flow) {const target=new URL(url); target.searchParams.set('flow',flow);return target.href;}
    async function start() {
      const params = new URLSearchParams(location.search), flow=params.get('flow'), userId=params.get('userId'), secret=params.get('secret');
      if (userId && secret && ['verify','recovery','magic'].includes(flow)) {
        // Scrub authentication secrets before rendering the account or loading any user data.
        const clean = new URL(location.href); ['userId','secret','expire','flow'].forEach(key=>clean.searchParams.delete(key));
        history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
        if (flow==='verify') {await account.updateVerification({userId,secret}); notice='Your email is verified. You can now log in and sync your kitchen.';}
        if (flow==='magic') await account.updateMagicURLSession({userId,secret});
        if (flow==='recovery') recovery={userId,secret};
      }
      changed(recovery?'PASSWORD_RECOVERY':'INITIAL_SESSION',await readUser());
    }
    async function execution(body) {
      const response = await functions.createExecution({functionId:config.functionId,body:JSON.stringify(body),async:false});
      let payload;
      try {payload=JSON.parse(response.responseBody);} catch {throw new Error('Your kitchen is not ready yet. Please retry in a moment.');}
      if (response.responseStatusCode>=400 || payload.error) {
        const error=Object.assign(new Error(payload.error?.message || 'Could not sync your kitchen.'),{code:payload.error?.code || response.responseStatusCode});
        if(error.code===401) {const user=await readUser();if(!user)changed('SIGNED_OUT',null);}
        throw error;
      }
      return payload.data;
    }
    window.addEventListener('storage', event => {
      if(event.key !== 'cookieFallback')return;
      readUser().then(user => {
        if(currentUser?.id !== user?.id || currentUser?.emailVerified !== user?.emailVerified)changed(user?'SIGNED_IN':'SIGNED_OUT',user);
      }).catch(()=>{});
    });
    const auth = {
      onAuthStateChange(fn) {subscribers.add(fn);return {data:{subscription:{unsubscribe:()=>subscribers.delete(fn)}}};},
      getSession:()=>result(async()=>{
        if(!started)started=start();
        try {await started;} catch(error) {started=null; throw error;}
        const user=await readUser();
        if(currentUser?.id!==user?.id || currentUser?.emailVerified!==user?.emailVerified)changed(user?'SIGNED_IN':'SIGNED_OUT',user);
        return {session:session()};
      }),
      signInWithPassword:({email,password})=>result(async()=>{await account.createEmailPasswordSession({email,password});changed('SIGNED_IN',await readUser());return {session:session()};}),
      signUp:({email,password,options})=>result(async()=>{
        await account.create({userId:ID.unique(),email,password,name:options.data.display_name});
        await account.createEmailPasswordSession({email,password});
        changed('SIGNED_IN',await readUser());
        try {await account.createVerification({url:redirect(options.emailRedirectTo,'verify')});}
        catch(e) {notice='Your account was created, but the verification email could not be sent. Use Resend verification.';throw e;}
        return {session:null};
      }),
      signInWithOtp:({email,options})=>result(()=>account.createMagicURLToken({userId:ID.unique(),email,url:redirect(options.emailRedirectTo,'magic')})),
      resetPasswordForEmail:(email,{redirectTo})=>result(()=>account.createRecovery({email,url:redirect(redirectTo,'recovery')})),
      resendVerification:()=>result(()=>account.createVerification({url:redirect(new URL('profile.html',location.href).href,'verify')})),
      updateUser:({password})=>result(async()=>{if(!recovery)throw new Error('Open a fresh password reset link from your email.');const data=await account.updateRecovery({...recovery,password});recovery=null;return data;}),
      signOut:()=>result(async()=>{await account.deleteSession({sessionId:'current'});changed('SIGNED_OUT',null);return {};})
    };
    // Keep the established account/data API stable while replacing its implementation.
    return {
      auth, get notice(){return notice;},
      from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:(start,end)=>result(()=>execution({action:'list',offset:start,limit:end-start+1}))}),
      rpc:(name,args)=>result(async()=>{
        if(name==='save_kitchen_records')return execution({action:'save',changes:args.changes});
        if(name!=='import_kitchen_guest')throw new Error('Unknown kitchen operation.');
        // Free-tier transactions permit 100 operations. Retry-safe chunks preserve source data on failure.
        for(let offset=0;offset<args.records.length;offset+=80)await execution({action:'import',records:args.records.slice(offset,offset+80)});
        return [];
      }),
      storage:{from:()=>({
        upload:(path,file)=>result(async()=>{
          if(!currentUser?.id || !path.startsWith(`${currentUser.id}/`))throw new Error('Sign in to upload your own photos.');
          const fileId=path.split('/')[1].split('.')[0];
          return storage.createFile({bucketId:config.bucketId,fileId,file,permissions:[Permission.read(Role.user(currentUser.id)),Permission.delete(Role.user(currentUser.id))]});
        }),
        createSignedUrl:path=>result(async()=>{
          if(!currentUser?.id || !path.startsWith(`${currentUser.id}/`))throw new Error('That photo belongs to another kitchen.');
          if(photos.has(path))return {signedUrl:photos.get(path)};
          const owner=currentUser.id, fileId=path.split('/')[1].split('.')[0];
          const metadata=await storage.getFile({bucketId:config.bucketId,fileId});
          const bytes=await sdk.call('get',new URL(storage.getFileView({bucketId:config.bucketId,fileId})),{}, {},'arrayBuffer');
          if(currentUser?.id!==owner)throw new Error('Your account changed while loading this photo.');
          const url=URL.createObjectURL(new Blob([bytes],{type:metadata.mimeType}));photos.set(path,url);
          return {signedUrl:url}; // Authenticated blob URL; no public file URL or bearer secret is exposed.
        })
      })}
    };
  }
  window.AnnaBackend={createClient};
})();
