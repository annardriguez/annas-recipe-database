(() => {
  const K = window.AnnaKitchen;
  const dialog = document.querySelector('#account-dialog');
  const content = document.querySelector('#account-content');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let mode = 'login', renderedUser;
  const redirect = new URL('profile.html', location.href).href.split('?')[0].split('#')[0];
  function message(text) { const box = document.querySelector('#account-message'); if (box) box.textContent = text; }
  function render() {
    if (!content) return;
    renderedUser = `${K.user?.id || ''}:${K.user?.emailVerified}`;
    content.innerHTML = `<div class="account-panel"><p class="eyebrow">Your very own kitchen</p><h2>${K.user ? 'Welcome back.' : mode === 'signup' ? 'Pull up a chair.' : mode === 'recovery' ? 'A fresh start.' : 'Make yourself at home.'}</h2>
      <p class="account-helper">${K.user ? escape(K.user.email) : 'Your recipes, little discoveries, and dinner plans. Together, wherever you cook.'}</p>
      <p role="status" class="kitchen-sync">${escape(K.status)}</p>
      ${K.client?.notice ? `<p class="account-helper">${escape(K.client.notice)}</p>` : ''}
      ${K.user && K.user.emailVerified === false ? '<p class="account-helper">Please verify your email to enable your private kitchen.</p><button class="planner-tool-button" id="account-verify">Resend verification</button><button class="planner-tool-button" id="account-refresh">I have verified my email</button>' : ''}
      ${K.user && mode !== 'recovery' ? `<div class="account-actions"><a class="primary-button" href="cookbook.html">My cookbook ↗</a><a class="planner-tool-button" href="profile.html">Profile & settings</a><button class="planner-tool-button" id="account-logout">Log out</button></div>` : `
      <form id="account-form" class="account-form">
        ${mode !== 'recovery' ? '<label>Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>' : ''}
        ${mode === 'signup' ? '<label>Display name<input name="name" autocomplete="nickname" maxlength="80" required></label>' : ''}
        ${['login','signup','recovery'].includes(mode) ? `<label>${mode === 'recovery' ? 'New password' : 'Password'}<input name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="8" required></label>` : ''}
        <button type="submit" class="primary-button" ${K.client ? '' : 'disabled'}>${{login:'Log in',signup:'Create account',magic:'Send sign-in link',reset:'Send reset link',recovery:'Save new password'}[mode]}</button>
      </form>
      <div class="account-actions">${[['login','Log in'],['signup','Create account'],['magic','Email me a login link'],['reset','Forgot password?']].filter(([m]) => m !== mode).map(([m,label]) => `<button class="planner-tool-button" data-auth-mode="${m}">${label}</button>`).join('')}</div>`}
      <p id="account-message" role="status" aria-live="polite"></p></div>`;
    content.querySelectorAll('[data-auth-mode]').forEach(button => button.onclick = () => {mode = button.dataset.authMode; render();});
    content.querySelector('#account-verify')?.addEventListener('click', async () => {const {error}=await K.client.auth.resendVerification(); message(error?K.errorMessage(error):'Check your email for the verification link.');});
    content.querySelector('#account-refresh')?.addEventListener('click', async () => {try{await K.refresh();render();}catch(e){message(K.errorMessage(e));}});
    content.querySelector('#account-logout')?.addEventListener('click', async () => {try {await K.signOut(); render();} catch(e) {message(K.errorMessage(e));}});
    content.querySelector('#account-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget, button = form.querySelector('button');
      const values = Object.fromEntries(new FormData(form)); button.disabled = true;
      try {
        let result;
        if (mode === 'login') result = await K.client.auth.signInWithPassword({email:values.email,password:values.password});
        if (mode === 'signup') result = await K.client.auth.signUp({email:values.email,password:values.password,options:{data:{display_name:values.name},emailRedirectTo:redirect}});
        if (mode === 'magic') result = await K.client.auth.signInWithOtp({email:values.email,options:{emailRedirectTo:redirect,shouldCreateUser:false}});
        if (mode === 'reset') result = await K.client.auth.resetPasswordForEmail(values.email,{redirectTo:redirect});
        if (mode === 'recovery') result = await K.client.auth.updateUser({password:values.password});
        if (result.error) throw result.error;
        if (mode === 'recovery') {K.finishRecovery(); mode = 'login'; render(); message('Password updated.');}
        else if (mode === 'signup' && !result.data.session) message('Check your email to verify your account, then log in.');
        else if (mode === 'magic' || mode === 'reset') message('If an account exists for that email, a secure link is on its way.');
        else message('Opening your kitchen…');
      } catch(e) {message(K.errorMessage(e));} finally {button.disabled = false;}
    });
  }
  function open() {render(); if (!dialog.open) dialog.showModal();}
  document.querySelector('#open-account')?.addEventListener('click', open);
  document.querySelector('#account-dialog-close')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {if (event.target === dialog) dialog.close();});
  window.addEventListener('kitchen:recovery', () => {mode = 'recovery'; open();});
  window.addEventListener('kitchen:change', () => {
    const button = document.querySelector('#open-account');
    if (button) button.textContent = K.user ? 'My kitchen' : 'Log in';
    document.querySelectorAll('[data-favourite-count]').forEach(el => el.textContent = K.list('favourite').length);
    // Avoid replacing an in-progress sign-up/reset form on token refresh.
    if (dialog?.open && renderedUser !== `${K.user?.id || ''}:${K.user?.emailVerified}`) render();
    else if (dialog?.open) content.querySelector('.kitchen-sync').textContent = K.status;
  });
  window.AnnaAccount = {open};
  const initialButton = document.querySelector('#open-account');
  if (initialButton) initialButton.textContent = K.user ? 'My kitchen' : 'Log in';
  // Auth can finish while later static scripts are still downloading.
  if (K.passwordRecovery) {mode = 'recovery'; open();}
})();
