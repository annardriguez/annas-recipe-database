const accountButton = document.querySelector("#open-account");
const accountDialog = document.querySelector("#account-dialog");
const accountDialogClose = document.querySelector("#account-dialog-close");
const accountContent = document.querySelector("#account-content");

const accountSavedRecipeIds = new Set(
  JSON.parse(localStorage.getItem("annaRecipeFavourites") || "[]")
);

let accountSupabaseClient = null;
let accountCurrentUser = null;
let accountCloudSyncReady = false;

function accountEscapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function accountIsSupabaseConfigured() {
  const config = window.ANNA_SUPABASE_CONFIG || {};

  return Boolean(
    window.supabase?.createClient &&
    config.url &&
    config.anonKey &&
    !config.url.includes("PASTE_") &&
    !config.anonKey.includes("PASTE_")
  );
}

function accountUpdateButton() {
  if (!accountButton) return;
  accountButton.textContent = accountCurrentUser ? "My Kitchen" : "Log in";
}

function accountSaveLocalFavourites() {
  localStorage.setItem(
    "annaRecipeFavourites",
    JSON.stringify([...accountSavedRecipeIds])
  );
  document.querySelectorAll("[data-favourite-count]").forEach(item => {
    item.textContent = accountSavedRecipeIds.size;
  });
}

async function accountSyncRemoteFavourites() {
  if (!accountSupabaseClient || !accountCurrentUser) return;

  const { data, error } = await accountSupabaseClient
    .from("recipe_favourites")
    .select("recipe_id")
    .eq("user_id", accountCurrentUser.id);

  if (error) {
    accountCloudSyncReady = false;
    accountShowToast("Could not sync saved recipes");
    return;
  }

  const remoteIds = new Set((data || []).map(item => item.recipe_id));
  const mergedIds = new Set([...remoteIds, ...accountSavedRecipeIds]);

  if (mergedIds.size > remoteIds.size) {
    const rows = [...mergedIds].map(recipeId => ({
      user_id: accountCurrentUser.id,
      recipe_id: recipeId
    }));

    await accountSupabaseClient
      .from("recipe_favourites")
      .upsert(rows, { onConflict: "user_id,recipe_id" });
  }

  accountSavedRecipeIds.clear();
  mergedIds.forEach(id => accountSavedRecipeIds.add(id));
  accountCloudSyncReady = true;
  accountSaveLocalFavourites();
  accountUpdateButton();
}

async function accountInitSupabaseAuth() {
  if (!accountIsSupabaseConfigured()) {
    accountUpdateButton();
    return;
  }

  const config = window.ANNA_SUPABASE_CONFIG;
  accountSupabaseClient = window.supabase.createClient(config.url, config.anonKey);

  const { data } = await accountSupabaseClient.auth.getSession();
  accountCurrentUser = data.session?.user || null;
  if (accountCurrentUser) await accountSyncRemoteFavourites();

  accountSupabaseClient.auth.onAuthStateChange(async (_event, session) => {
    accountCurrentUser = session?.user || null;
    accountCloudSyncReady = Boolean(accountCurrentUser);

    if (accountCurrentUser) {
      await accountSyncRemoteFavourites();
      accountShowToast("Logged in and synced");
    }

    accountUpdateButton();
    if (accountDialog?.open) accountRenderDialog();
  });

  accountUpdateButton();
}

function accountShowToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function accountRenderDialog() {
  const configured = accountIsSupabaseConfigured();
  const syncText = !configured
    ? "Supabase setup needed"
    : accountCurrentUser
      ? accountCloudSyncReady ? "Cloud sync on" : "Cloud sync checking"
      : "Ready when you are";

  accountContent.innerHTML = `
    <div class="account-panel">
      <p class="eyebrow">My Kitchen</p>
      <h2>${accountCurrentUser ? "Cloud sync is on" : "Sync your favorites"}</h2>
      ${accountCurrentUser ? `<p class="account-email">${accountEscapeHtml(accountCurrentUser.email || "Signed in")}</p>` : ""}
      <p class="account-status ${accountCurrentUser ? "synced" : ""}">${syncText}</p>

      ${accountCurrentUser ? `
        <p class="account-helper">Your favorites are saved in the cloud and will be there when you sign in on another device.</p>
      ` : `
        <form class="account-form" id="account-form">
          <label>
            <span>Email</span>
            <input id="profile-email" type="email" placeholder="anna@example.com" autocomplete="email" ${configured ? "" : "disabled"}>
          </label>
          <button class="primary-button" type="submit" ${configured ? "" : "disabled"}>Send sign-in link</button>
        </form>
        <p class="account-helper">${configured ? "Enter your email and I will send a secure sign-in link. No password needed." : "Cloud sync is almost ready. Supabase still needs its public config."}</p>
      `}

      <div class="account-actions">
        <a class="planner-tool-button" href="index.html#recipes">Open favorites</a>
        ${accountCurrentUser ? `<button class="planner-tool-button" id="sign-out-profile" type="button">Log out</button>` : ""}
      </div>
    </div>
  `;

  accountContent.querySelector("#account-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const email = accountContent.querySelector("#profile-email").value.trim();
    if (!email) return;

    const { error } = await accountSupabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href.split("#")[0] }
    });

    accountShowToast(error ? "Could not send login link" : "Check your email for the login link");
  });

  accountContent.querySelector("#sign-out-profile")?.addEventListener("click", async () => {
    await accountSupabaseClient.auth.signOut();
    accountCurrentUser = null;
    accountCloudSyncReady = false;
    accountUpdateButton();
    accountRenderDialog();
    accountShowToast("Logged out");
  });
}

function accountOpenDialog() {
  accountRenderDialog();
  accountDialog.showModal();
  document.body.classList.add("dialog-open");
}

accountButton?.addEventListener("click", accountOpenDialog);
accountDialogClose?.addEventListener("click", () => {
  accountDialog.close();
  document.body.classList.remove("dialog-open");
});
accountDialog?.addEventListener("click", event => {
  if (event.target === accountDialog) {
    accountDialog.close();
    document.body.classList.remove("dialog-open");
  }
});

accountInitSupabaseAuth();
