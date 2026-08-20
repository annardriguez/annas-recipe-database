const searchInput = document.querySelector("#recipe-search");
const sortSelect = document.querySelector("#sort-select");
const recipeGrid = document.querySelector("#recipe-grid");
const recipeCount = document.querySelector("#recipe-count");
const emptyMessage = document.querySelector("#empty-message");
const clearFiltersButton = document.querySelector("#clear-filters");
const dialog = document.querySelector("#recipe-dialog");
const dialogContent = document.querySelector("#dialog-content");
const dialogClose = document.querySelector("#dialog-close");
const quickFilters = document.querySelector("#quick-filters");
const activeSummary = document.querySelector("#active-summary");
const favouriteCount = document.querySelector("#favourite-count");
const showFavouritesButton = document.querySelector("#show-favourites");
const showFavouritesNavButton = document.querySelector("#show-favourites-nav");
const randomRecipeButton = document.querySelector("#random-recipe");
const featuredCard = document.querySelector("#featured-card");
const toast = document.querySelector("#toast");
const accountButton = document.querySelector("#open-account");
const accountDialog = document.querySelector("#account-dialog");
const accountDialogClose = document.querySelector("#account-dialog-close");
const accountContent = document.querySelector("#account-content");

const savedRecipeIds = new Set(
  JSON.parse(localStorage.getItem("annaRecipeFavourites") || "[]")
);

let activeFilter = "all";
let showingFavourites = false;
let toastTimer;
let profileName = localStorage.getItem("annaKitchenProfile") || "";
let supabaseClient = null;
let currentUser = null;
let cloudSyncReady = false;

const labels = {
  main: "Main meal",
  breakfast: "Breakfast",
  snack: "Sweet & snack"
};

const filterOptions = [
  ["all", "All Recipes"],
  ["quick", "⚡ Under 15 min"],
  ["high protein", "💪 High protein"],
  ["breakfast", "Breakfast"],
  ["snack", "Snack"],
  ["vegetarian", "🌱 Vegetarian"],
  ["sweet", "🍫 Sweet"],
  ["pasta", "🍝 Pasta"],
  ["bowl", "🥣 Bowls"],
  ["meal prep", "📦 Meal prep"],
  ["air fryer", "Air fryer"],
  ["thermomix", "Thermomix"]
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMeta(value, suffix, fallback = "Flexible") {
  return value === null || value === undefined ? fallback : `${value}${suffix}`;
}

function isQuick(recipe) {
  return recipe.time <= 15 || recipe.tags.includes("quick");
}

function isHighProtein(recipe) {
  return recipe.tags.includes("high protein") || (recipe.protein ?? 0) >= 25;
}

function matchesFilter(recipe, filter) {
  if (filter === "all") return true;
  if (filter === "quick") return isQuick(recipe);
  if (filter === "high protein") return isHighProtein(recipe);
  return (
    recipe.tags.includes(filter) ||
    recipe.equipment.includes(filter) ||
    recipe.category === filter
  );
}

function saveFavourites() {
  localStorage.setItem(
    "annaRecipeFavourites",
    JSON.stringify([...savedRecipeIds])
  );
  updateFavouriteCount();
  if (accountDialog?.open) renderAccountDialog();
}

function updateFavouriteCount() {
  favouriteCount.textContent = savedRecipeIds.size;
  document.querySelectorAll("[data-favourite-count]").forEach(item => {
    item.textContent = savedRecipeIds.size;
  });
  accountButton.textContent = currentUser ? "My Kitchen" : "Log in";
}

async function toggleFavourite(recipe, button) {
  const willSave = !savedRecipeIds.has(recipe.id);

  if (savedRecipeIds.has(recipe.id)) {
    savedRecipeIds.delete(recipe.id);
    showToast(`Removed ${recipe.title} from saved recipes`);
  } else {
    savedRecipeIds.add(recipe.id);
    showToast(`Saved ${recipe.title}`);
  }

  saveFavourites();

  if (button) {
    button.classList.toggle("saved", savedRecipeIds.has(recipe.id));
    button.textContent = savedRecipeIds.has(recipe.id) ? "♥" : "♡";
    button.setAttribute(
      "aria-label",
      savedRecipeIds.has(recipe.id)
        ? `Remove ${recipe.title} from saved recipes`
        : `Save ${recipe.title}`
    );
  }

  document.querySelectorAll(`[data-save-id="${recipe.id}"]`).forEach(item => {
    item.classList.toggle("saved", savedRecipeIds.has(recipe.id));
    if (item.classList.contains("dialog-save")) {
      item.textContent = savedRecipeIds.has(recipe.id)
        ? "♥ Saved to favourites"
        : "♡ Save recipe";
    } else {
      item.textContent = savedRecipeIds.has(recipe.id) ? "♥" : "♡";
    }
  });

  if (showingFavourites) renderRecipes();
  await persistFavouriteToCloud(recipe.id, willSave);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getSavedRecipes() {
  return recipes.filter(recipe => savedRecipeIds.has(recipe.id));
}

function isSupabaseConfigured() {
  const config = window.ANNA_SUPABASE_CONFIG || {};

  return Boolean(
    window.supabase?.createClient &&
    config.url &&
    config.anonKey &&
    !config.url.includes("PASTE_") &&
    !config.anonKey.includes("PASTE_")
  );
}

function getAccountLabel() {
  if (!currentUser) return "";
  return currentUser.user_metadata?.name || currentUser.email || "your kitchen";
}

async function initSupabaseAuth() {
  if (!isSupabaseConfigured()) {
    updateFavouriteCount();
    return;
  }

  const config = window.ANNA_SUPABASE_CONFIG;
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) await syncRemoteFavourites();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    cloudSyncReady = Boolean(currentUser);

    if (currentUser) {
      await syncRemoteFavourites();
      showToast("Logged in and synced");
    } else {
      updateFavouriteCount();
      if (accountDialog?.open) renderAccountDialog();
    }
  });

  updateFavouriteCount();
}

async function syncRemoteFavourites() {
  if (!supabaseClient || !currentUser) return;

  const { data, error } = await supabaseClient
    .from("recipe_favourites")
    .select("recipe_id")
    .eq("user_id", currentUser.id);

  if (error) {
    cloudSyncReady = false;
    showToast("Could not sync saved recipes");
    return;
  }

  const remoteIds = new Set((data || []).map(item => item.recipe_id));
  const mergedIds = new Set([...remoteIds, ...savedRecipeIds]);

  if (mergedIds.size > remoteIds.size) {
    const rows = [...mergedIds].map(recipeId => ({
      user_id: currentUser.id,
      recipe_id: recipeId
    }));

    await supabaseClient
      .from("recipe_favourites")
      .upsert(rows, { onConflict: "user_id,recipe_id" });
  }

  savedRecipeIds.clear();
  mergedIds.forEach(id => savedRecipeIds.add(id));
  cloudSyncReady = true;
  saveFavourites();
  renderRecipes();
}

async function persistFavouriteToCloud(recipeId, shouldSave) {
  if (!supabaseClient || !currentUser || !cloudSyncReady) return;

  const request = shouldSave
    ? supabaseClient
        .from("recipe_favourites")
        .upsert({ user_id: currentUser.id, recipe_id: recipeId }, { onConflict: "user_id,recipe_id" })
    : supabaseClient
        .from("recipe_favourites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("recipe_id", recipeId);

  const { error } = await request;
  if (error) showToast("Saved locally, but cloud sync failed");
}

function renderAccountDialog() {
  const configured = isSupabaseConfigured();
  const accountLabel = getAccountLabel();
  const syncText = !configured
    ? "Supabase setup needed"
    : currentUser
      ? cloudSyncReady
        ? "Cloud sync on"
        : "Cloud sync checking"
      : "Ready when you are";

  accountContent.innerHTML = `
    <div class="account-panel">
      <p class="eyebrow">My Kitchen</p>
      <h2>${currentUser ? "Cloud sync is on" : "Sync your favorites"}</h2>
      ${currentUser ? `<p class="account-email">${escapeHtml(accountLabel)}</p>` : ""}
      <p class="account-status ${currentUser ? "synced" : ""}">${syncText}</p>

      ${currentUser ? `
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
        <button class="planner-tool-button" id="view-saved-recipes" type="button">Open favorites</button>
        ${currentUser ? `<button class="planner-tool-button" id="sign-out-profile" type="button">Log out</button>` : ""}
      </div>
    </div>
  `;

  accountContent.querySelector("#account-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const email = accountContent.querySelector("#profile-email").value.trim();
    if (!email) return;

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href.split("#")[0] }
    });

    showToast(error ? "Could not send login link" : "Check your email for the login link");
  });

  accountContent.querySelector("#view-saved-recipes").addEventListener("click", () => {
    accountDialog.close();
    document.body.classList.remove("dialog-open");
    showingFavourites = false;
    showSavedRecipes();
  });

  accountContent.querySelector("#sign-out-profile")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    cloudSyncReady = false;
    updateFavouriteCount();
    renderAccountDialog();
    showToast("Logged out");
  });

}

function openAccountDialog() {
  renderAccountDialog();
  accountDialog.showModal();
  document.body.classList.add("dialog-open");
}

function createFilterButtons() {
  filterOptions.forEach(([value, text]) => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.dataset.filter = value;
    button.textContent = text;
    button.classList.toggle("active", value === activeFilter);
    quickFilters.appendChild(button);
  });

  quickFilters.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    activeFilter = button.dataset.filter;
    showingFavourites = false;
    quickFilters.querySelectorAll("button").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderRecipes();
  });
}

function createRecipeCard(recipe, index) {
  const article = document.createElement("article");
  article.className = "recipe-card";
  article.tabIndex = 0;

  const saved = savedRecipeIds.has(recipe.id);
  const palette = index % 6;
  const badgeTag = isHighProtein(recipe)
    ? "High Protein"
    : recipe.tags.includes("vegetarian")
      ? "Vegetarian"
      : labels[recipe.category] || recipe.category;
  const badgeClass = badgeTag.toLowerCase().includes("vegetarian")
    ? "vegetarian"
    : "";

  article.innerHTML = `
    <div class="recipe-visual palette-${palette}">
      <button
        class="card-save ${saved ? "saved" : ""}"
        data-save-id="${escapeHtml(recipe.id)}"
        aria-label="${saved ? "Remove" : "Save"} ${escapeHtml(recipe.title)}"
      >${saved ? "♥" : "♡"}</button>
      <div class="image-badges" aria-hidden="true">
        <span>◷ ${recipe.time} min</span>
        <span class="${badgeClass}">${badgeTag === "Vegetarian" ? "☘" : "◈"} ${escapeHtml(badgeTag)}</span>
      </div>
      <span class="recipe-emoji">${escapeHtml(recipe.emoji)}</span>
    </div>

    <div class="recipe-content">
      <div class="recipe-kicker">
        <span>${labels[recipe.category] || recipe.category}</span>
        <span>${recipe.time} min</span>
      </div>

      <h3>${escapeHtml(recipe.title)}</h3>
      <p>${escapeHtml(recipe.description)}</p>

      <div class="recipe-meta">
        <span>${formatMeta(recipe.calories, " kcal")}</span>
        <span>${formatMeta(recipe.protein, " g protein")}</span>
        <span>${formatMeta(recipe.carbs, " g carbs")}</span>
        <span>${formatMeta(recipe.fat, " g fat")}</span>
        ${recipe.tags.slice(0, 1).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>
  `;

  article.querySelector(".card-save").addEventListener("click", event => {
    event.stopPropagation();
    toggleFavourite(recipe, event.currentTarget);
  });

  article.addEventListener("click", () => openRecipe(recipe, palette));
  article.addEventListener("keydown", event => {
    if (event.key === "Enter") openRecipe(recipe, palette);
  });

  return article;
}

function getVisibleRecipes() {
  const query = searchInput.value.toLowerCase().trim();

  let visible = recipes.filter(recipe => {
    const searchable = [
      recipe.title,
      recipe.description,
      ...recipe.tags,
      ...recipe.ingredients,
      ...recipe.equipment
    ].join(" ").toLowerCase();

    const queryMatches = searchable.includes(query);
    const filterMatches = matchesFilter(recipe, activeFilter);
    const favouriteMatches =
      !showingFavourites || savedRecipeIds.has(recipe.id);

    return queryMatches && filterMatches && favouriteMatches;
  });

  const sort = sortSelect.value;

  if (sort === "time") visible.sort((a, b) => a.time - b.time);
  if (sort === "protein") {
    visible.sort((a, b) => (b.protein ?? -1) - (a.protein ?? -1));
  }
  if (sort === "calories") {
    visible.sort((a, b) => (a.calories ?? Infinity) - (b.calories ?? Infinity));
  }
  if (sort === "az") visible.sort((a, b) => a.title.localeCompare(b.title));

  return visible;
}

function updateSummary(visibleCount) {
  if (showingFavourites) {
    activeSummary.textContent =
      savedRecipeIds.size === 0
        ? "No saved recipes yet — tap the heart on any card."
        : `Showing ${visibleCount} saved recipe${visibleCount === 1 ? "" : "s"}.`;
    return;
  }

  if (activeFilter === "all" && !searchInput.value.trim()) {
    activeSummary.textContent = "Showing the whole kitchen.";
    return;
  }

  const filterName =
    filterOptions.find(([value]) => value === activeFilter)?.[1] || activeFilter;

  activeSummary.textContent = searchInput.value.trim()
    ? `${visibleCount} result${visibleCount === 1 ? "" : "s"} for “${searchInput.value.trim()}”${activeFilter !== "all" ? ` in ${filterName}` : ""}.`
    : `${visibleCount} recipe${visibleCount === 1 ? "" : "s"} in ${filterName}.`;
}

function renderRecipes() {
  const visible = getVisibleRecipes();
  recipeGrid.replaceChildren(
    ...visible.map((recipe, index) => createRecipeCard(recipe, index))
  );

  recipeCount.textContent = `${visible.length} of ${recipes.length}`;
  emptyMessage.hidden = visible.length !== 0;
  updateSummary(visible.length);
}

function openRecipe(recipe, palette = 0) {
  const saved = savedRecipeIds.has(recipe.id);

  dialogContent.innerHTML = `
    <header class="dialog-cover palette-${palette}">
      <div>
        <p class="eyebrow">${labels[recipe.category] || recipe.category}</p>
        <h2>${escapeHtml(recipe.title)}</h2>
        <p>${escapeHtml(recipe.description)}</p>
      </div>
      <div class="dialog-cover-emoji">${escapeHtml(recipe.emoji)}</div>
    </header>

    <div class="dialog-body">
      <aside>
        <div class="dialog-stats">
          <div>
            <strong>${recipe.time}</strong>
            <span>minutes</span>
          </div>
          <div>
            <strong>${recipe.calories ?? "—"}</strong>
            <span>kcal</span>
          </div>
          <div>
            <strong>${recipe.protein ?? "—"}</strong>
            <span>g protein</span>
          </div>
          <div>
            <strong>${recipe.carbs ?? "—"}</strong>
            <span>g carbs</span>
          </div>
          <div>
            <strong>${recipe.fat ?? "—"}</strong>
            <span>g fat</span>
          </div>
          <div>
            <strong>${recipe.fiber ?? "—"}</strong>
            <span>g fiber</span>
          </div>
        </div>

        <button
          class="dialog-save ${saved ? "saved" : ""}"
          data-save-id="${escapeHtml(recipe.id)}"
        >
          ${saved ? "♥ Saved to favourites" : "♡ Save recipe"}
        </button>

        <h3>Ingredients</h3>
        <ul>
          ${recipe.ingredients.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>

        ${recipe.note ? `
          <div class="recipe-note">
            <strong>Anna note</strong><br>
            ${escapeHtml(recipe.note)}
          </div>
        ` : ""}
      </aside>

      <section>
        <p class="eyebrow">Method</p>
        <h3>How to make it</h3>
        <ol class="dialog-steps">
          ${recipe.steps.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
        </ol>
      </section>
    </div>
  `;

  dialogContent.querySelector(".dialog-save").addEventListener("click", event => {
    toggleFavourite(recipe, event.currentTarget);
  });

  dialog.showModal();
  document.body.classList.add("dialog-open");
}

function closeDialog() {
  dialog.close();
  document.body.classList.remove("dialog-open");
}

function setFeaturedRecipe() {
  const featured = recipes[0];

  featuredCard.innerHTML = `
    <div class="featured-top">
      <span class="featured-label">Today's feature</span>
      <span>${featured.time} min</span>
    </div>

    <div class="featured-emoji">${escapeHtml(featured.emoji)}</div>

    <div>
      <h2>${escapeHtml(featured.title)}</h2>
      <div class="featured-meta">
        <span>${formatMeta(featured.calories, " kcal")}</span>
        <span>${formatMeta(featured.protein, " g protein")}</span>
      </div>
    </div>
  `;

  featuredCard.addEventListener("click", () => openRecipe(featured, 2));
}

function setStats() {
  document.querySelector("#total-recipes").textContent = recipes.length;
  document.querySelector("#vegetarian-recipes").textContent =
    recipes.filter(recipe => recipe.tags.includes("vegetarian")).length;
  document.querySelector("#quick-recipes").textContent =
    recipes.filter(isQuick).length;
  document.querySelector("#protein-recipes").textContent =
    recipes.filter(isHighProtein).length;
}

randomRecipeButton.addEventListener("click", () => {
  const pool = getVisibleRecipes().length ? getVisibleRecipes() : recipes;
  const randomRecipe = pool[Math.floor(Math.random() * pool.length)];
  openRecipe(randomRecipe, Math.floor(Math.random() * 6));
});

function showSavedRecipes() {
  showingFavourites = !showingFavourites;
  if (showingFavourites) {
    activeFilter = "all";
    searchInput.value = "";
    quickFilters.querySelectorAll("button").forEach(button => {
      button.classList.toggle("active", button.dataset.filter === "all");
    });
  }
  renderRecipes();
  document.querySelector("#recipes").scrollIntoView({ behavior: "smooth" });
}

showFavouritesButton.addEventListener("click", showSavedRecipes);
showFavouritesNavButton.addEventListener("click", showSavedRecipes);
accountButton.addEventListener("click", openAccountDialog);
accountDialogClose.addEventListener("click", () => {
  accountDialog.close();
  document.body.classList.remove("dialog-open");
});
accountDialog.addEventListener("click", event => {
  if (event.target === accountDialog) {
    accountDialog.close();
    document.body.classList.remove("dialog-open");
  }
});

clearFiltersButton.addEventListener("click", () => {
  activeFilter = "all";
  showingFavourites = false;
  searchInput.value = "";
  sortSelect.value = "default";

  quickFilters.querySelectorAll("button").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });

  renderRecipes();
});

searchInput.addEventListener("input", () => {
  showingFavourites = false;
  renderRecipes();
});

sortSelect.addEventListener("change", renderRecipes);

dialogClose.addEventListener("click", closeDialog);
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeDialog();
});

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

createFilterButtons();
updateFavouriteCount();
setStats();
initSupabaseAuth();
if (featuredCard) setFeaturedRecipe();
renderRecipes();
