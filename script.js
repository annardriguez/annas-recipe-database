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
const randomRecipeButton = document.querySelector("#random-recipe");
const featuredCard = document.querySelector("#featured-card");
const toast = document.querySelector("#toast");

const savedRecipeIds = new Set(
  JSON.parse(localStorage.getItem("annaRecipeFavourites") || "[]")
);

let activeFilter = "all";
const requestedView = new URLSearchParams(location.search).get("view");
const libraryView = ["recipes", "favourites"].includes(requestedView) ? requestedView : "home";
const showingFavourites = libraryView === "favourites";
let toastTimer;

const labels = {
  main: "Main meal",
  breakfast: "Breakfast",
  snack: "Sweet & snack"
};

const filterOptions = [
  ["all", "Everything"],
  ["main", "Main meals"],
  ["breakfast", "Breakfast"],
  ["snack", "Sweet & snack"],
  ["quick", "15 min or less"],
  ["high protein", "High protein"],
  ["vegetarian", "Vegetarian"],
  ["sweet", "Sweet"],
  ["pasta", "Pasta"],
  ["bowl", "Bowls"],
  ["meal prep", "Meal prep"],
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
  return Number.isFinite(recipe.time) && recipe.time <= 15;
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
}

function updateFavouriteCount() {
  favouriteCount.textContent = savedRecipeIds.size;
}

function toggleFavourite(recipe, button) {
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
    item.setAttribute("aria-pressed", String(savedRecipeIds.has(recipe.id)));
    item.setAttribute("aria-label", `${savedRecipeIds.has(recipe.id) ? "Remove" : "Save"} ${recipe.title}`);
    if (item.classList.contains("dialog-save")) {
      item.textContent = savedRecipeIds.has(recipe.id)
        ? "♥ Saved to favourites"
        : "♡ Save recipe";
    } else {
      item.textContent = savedRecipeIds.has(recipe.id) ? "♥" : "♡";
    }
  });

  if (showingFavourites) renderRecipes();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function createFilterButtons() {
  filterOptions.forEach(([value, text]) => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.dataset.filter = value;
    button.textContent = text;
    button.classList.toggle("active", value === activeFilter);
    button.setAttribute("aria-pressed", String(value === activeFilter));
    quickFilters.appendChild(button);
  });

  quickFilters.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    activeFilter = button.dataset.filter;
    quickFilters.querySelectorAll("button").forEach(item => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });

    renderRecipes();
  });
}

function createRecipeCard(recipe, index) {
  const article = document.createElement("article");
  article.className = "recipe-card";
  article.tabIndex = 0;
  article.setAttribute("aria-label", `View ${recipe.title}`);

  const saved = savedRecipeIds.has(recipe.id);
  const palette = recipes.indexOf(recipe) % 6;
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
        aria-pressed="${saved}"
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
    if (event.target !== article) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRecipe(recipe, palette);
    }
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

    const queryMatches = query.split(/\s+/).every(word => searchable.includes(word));
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
  clearFiltersButton.hidden = activeFilter === "all" && !searchInput.value && sortSelect.value === "default";
  recipeGrid.replaceChildren(
    ...visible.map((recipe, index) => createRecipeCard(recipe, index))
  );

  const total = showingFavourites ? recipes.filter(recipe => savedRecipeIds.has(recipe.id)).length : recipes.length;
  recipeCount.textContent = `${visible.length} of ${total} recipe${total === 1 ? "" : "s"}`;
  randomRecipeButton.disabled = visible.length === 0;
  const noSaved = showingFavourites && total === 0;
  document.querySelector("#empty-title").textContent = noSaved ? "Keep your favourites close." : "No recipes found.";
  document.querySelector("#empty-description").textContent = noSaved ? "Tap the heart on a recipe to save it here for another day." : "Try another ingredient or clear your filters.";
  document.querySelector("#empty-reset").hidden = noSaved;
  document.querySelector(".empty-browse").hidden = !noSaved;
  emptyMessage.hidden = visible.length !== 0;
  updateSummary(visible.length);
}

function openRecipe(recipe, palette = 0) {
  const saved = savedRecipeIds.has(recipe.id);

  dialogContent.innerHTML = `
    <header class="dialog-cover palette-${palette}">
      <div>
        <p class="eyebrow">${labels[recipe.category] || recipe.category}</p>
        <h2 id="recipe-dialog-title">${escapeHtml(recipe.title)}</h2>
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
        </div>

        <button
          class="dialog-save ${saved ? "saved" : ""}"
          data-save-id="${escapeHtml(recipe.id)}"
        >
          ${saved ? "♥ Saved to favourites" : "♡ Save recipe"}
        </button>

        <h3>Ingredients <small>${recipe.servings || 1} serving${recipe.servings > 1 ? "s" : ""}</small></h3>
        <ul class="ingredient-list">
          ${recipe.ingredients.map(item => `<li class="ingredient-item"><label><input type="checkbox"><span>${escapeHtml(item)}</span></label></li>`).join("")}
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
  dialogContent.scrollTop = 0;
  document.body.classList.add("dialog-open");
}

function closeDialog() {
  dialog.close();
  document.body.classList.remove("dialog-open");
}

function setFeaturedRecipe() {
  const featured = recipes[0];

  featuredCard.innerHTML = `
    <div class="featured-art" aria-hidden="true"><span class="feature-spark">✳</span><span class="featured-emoji">${escapeHtml(featured.emoji)}</span><span class="feature-note">a little kitchen favourite</span></div>
    <div class="featured-info"><span class="featured-label">On the menu today</span><h2>${escapeHtml(featured.title)}</h2><div class="featured-meta"><span>◷ ${featured.time} min</span><span>${formatMeta(featured.protein, " g protein")}</span><span class="feature-arrow" aria-hidden="true">↗</span></div></div>
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
  const pool = getVisibleRecipes();
  if (!pool.length) return;
  const randomRecipe = pool[Math.floor(Math.random() * pool.length)];
  openRecipe(randomRecipe, Math.floor(Math.random() * 6));
});

clearFiltersButton.addEventListener("click", () => {
  activeFilter = "all";
  searchInput.value = "";
  sortSelect.value = "default";

  quickFilters.querySelectorAll("button").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === "all");
      button.setAttribute("aria-pressed", String(button.dataset.filter === "all"));
  });

  renderRecipes();
});

searchInput.addEventListener("input", () => {
  renderRecipes();
});

sortSelect.addEventListener("change", renderRecipes);

document.querySelector("#empty-reset").addEventListener("click", () => clearFiltersButton.click());
dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));

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

document.querySelector("#discover").hidden = libraryView !== "home";
document.querySelectorAll(".navigation [data-view]").forEach(link => {
  const current = link.dataset.view === libraryView;
  link.classList.toggle("active", current);
  if (current) link.setAttribute("aria-current", "page");
});
if (libraryView !== "home") {
  document.querySelector("#collection-title").textContent = showingFavourites ? "Your favourites" : "All recipes";
  document.querySelector("#collection-eyebrow").textContent = showingFavourites ? "Saved for another day" : "The whole kitchen";
  const description = document.querySelector("#collection-description");
  description.hidden = false;
  description.textContent = showingFavourites ? "The ones you love, all in one place." : "Find your next favourite. Search an ingredient or explore the collection.";
  document.title = `${showingFavourites ? "Favourites" : "All recipes"} | Anna's Kitchen`;
  searchInput.placeholder = showingFavourites ? "Search your favourites…" : "Search recipes or ingredients…";
}
createFilterButtons();
updateFavouriteCount();
setStats();
if (featuredCard) setFeaturedRecipe();
renderRecipes();
