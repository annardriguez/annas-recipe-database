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
const customRecipeButton = document.querySelector("#open-custom-recipe");
const customRecipeDialog = document.querySelector("#custom-recipe-dialog");
const customRecipeClose = document.querySelector("#custom-recipe-close");
const customRecipeForm = document.querySelector("#custom-recipe-form");

const savedRecipeIds = new Set(
  window.AnnaKitchen.list("favourite").map((r) => r.id),
);

let activeFilter = "all";
const requestedView = new URLSearchParams(location.search).get("view");
const libraryView = ["recipes", "favourites"].includes(requestedView)
  ? requestedView
  : "home";
const showingFavourites = libraryView === "favourites";
let toastTimer;
const labels = {
  main: "Main meal",
  breakfast: "Breakfast",
  snack: "Sweet & snack",
  sweet: "Sweet",
  side: "Side",
  lunch: "Lunch",
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
  ["thermomix", "Thermomix"],
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMeta(value, suffix, fallback = "Not provided") {
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
  if (filter === "weeknight")
    return recipe.category === "main" && recipe.time <= 40;
  if (filter === "high protein") return isHighProtein(recipe);
  return (
    recipe.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase()) ||
    recipe.equipment.includes(filter) ||
    recipe.category === filter
  );
}

function updateFavouriteCount() {
  document
    .querySelectorAll("[data-favourite-count]")
    .forEach((item) => (item.textContent = savedRecipeIds.size));
}
async function toggleFavourite(recipe) {
  const K = window.AnnaKitchen;
  try {
    if (savedRecipeIds.has(recipe.id)) await K.remove("favourite", recipe.id);
    else await K.set("favourite", recipe.id, {});
    showToast(
      savedRecipeIds.has(recipe.id)
        ? "Recipe saved to your cookbook"
        : "Removed from saved recipes",
    );
  } catch (e) {
    showToast(K.errorMessage(e));
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getSavedRecipes() {
  return recipes.filter((recipe) => savedRecipeIds.has(recipe.id));
}

async function removeCustomRecipe(recipeId) {
  try {
    await window.AnnaCustomRecipes.remove(recipeId);
    dialog.close();
    showToast("Custom recipe removed");
  } catch (e) {
    showToast(window.AnnaKitchen.errorMessage(e));
  }
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

  quickFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    activeFilter = button.dataset.filter;
    quickFilters.querySelectorAll("button").forEach((item) => {
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
  const primaryTags = [
    recipe.isCustom
      ? "your recipe"
      : labels[recipe.category] || recipe.category,
    isQuick(recipe) ? "quick" : "",
    recipe.tags.includes("vegetarian") ? "vegetarian" : "",
    ...recipe.tags.filter(
      (tag) => !["custom", "quick", "vegetarian", "high protein"].includes(tag),
    ),
  ]
    .filter(Boolean)
    .slice(0, 3);

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
      ${AnnaKitchen.art(recipe)}
    </div>

    <div class="recipe-content">
      <div class="recipe-kicker">
        <span>${labels[recipe.category] || recipe.category}</span>
        <span>${recipe.isCustom ? "Your recipe" : `${recipe.time} min`}</span>
      </div>

      <h3>${escapeHtml(recipe.title)}</h3>
      <p>${escapeHtml(recipe.description)}</p>

      <div class="recipe-meta">
        ${primaryTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        <span class="nutrition-only nutrition-chip">${formatMeta(recipe.calories, " kcal")}</span>
        <span class="nutrition-only nutrition-chip">${formatMeta(recipe.protein, " g protein")}</span>
      </div>
    </div>
  `;

  article.querySelector(".card-save").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavourite(recipe, event.currentTarget);
  });

  article.addEventListener("click", () => openRecipe(recipe, palette));
  article.addEventListener("keydown", (event) => {
    if (event.target !== article) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRecipe(recipe, palette);
    }
  });

  return article;
}

const advancedIds = [
  "meal-filter",
  "time-filter",
  "diet-filter",
  "collection-filter",
  "calorie-filter",
  "protein-filter",
  "pantry-filter",
  "prep-filter",
];
function resetAdvanced() {
  advancedIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });
}
function hasAdvanced() {
  return advancedIds.some((id) => {
    const el = document.getElementById(id);
    return el.type === "checkbox" ? el.checked : Boolean(el.value);
  });
}
function matchesAdvanced(recipe) {
  const value = (id) => document.getElementById(id).value;
  const ingredients = recipe.ingredients.join(" ").toLowerCase();
  const pantry = value("pantry-filter")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const collection = value("collection-filter");
  const nutritionOn = window.AnnaNutrition?.isVisible();
  return (
    (!value("meal-filter") || recipe.category === value("meal-filter")) &&
    (!value("time-filter") ||
      (recipe.time != null && recipe.time <= Number(value("time-filter")))) &&
    (!value("diet-filter") ||
      recipe.tags.some((t) => t.toLowerCase() === value("diet-filter"))) &&
    (!collection ||
      (AnnaKitchen.collections()[collection] || []).includes(recipe.id)) &&
    (!nutritionOn ||
      !value("calorie-filter") ||
      (recipe.calories != null &&
        recipe.calories <= Number(value("calorie-filter")))) &&
    (!nutritionOn ||
      !value("protein-filter") ||
      (recipe.protein != null &&
        recipe.protein >= Number(value("protein-filter")))) &&
    pantry.every((item) => ingredients.includes(item)) &&
    (!document.getElementById("prep-filter").checked ||
      recipe.tags.includes("meal prep"))
  );
}
advancedIds.forEach((id) =>
  document.getElementById(id).addEventListener("input", renderRecipes),
);
document.getElementById("save-targets").addEventListener("click", async () => {
  const target = {
    calories: document.getElementById("calorie-filter").value,
    protein: document.getElementById("protein-filter").value,
  };
  if (await AnnaKitchen.write("annaNutritionTargets", target))
    showToast("Nutrition targets remembered on this browser");
});
const rememberedTargets = AnnaKitchen.read("annaNutritionTargets", {});
document.getElementById("calorie-filter").value =
  rememberedTargets.calories || "";
document.getElementById("protein-filter").value =
  rememberedTargets.protein || "";

function getVisibleRecipes() {
  const query = searchInput.value.toLowerCase().trim();

  let visible = recipes.filter((recipe) => {
    const searchable = [
      recipe.title,
      recipe.description,
      ...recipe.tags,
      ...recipe.ingredients,
      ...recipe.equipment,
      ...(AnnaKitchen.metadata(recipe.id).tags || []),
    ]
      .join(" ")
      .toLowerCase();

    const queryMatches = query
      .split(/\s+/)
      .every((word) => searchable.includes(word));
    const filterMatches = matchesFilter(recipe, activeFilter);
    const advancedMatches = matchesAdvanced(recipe);
    const favouriteMatches =
      !showingFavourites || savedRecipeIds.has(recipe.id);

    return queryMatches && filterMatches && favouriteMatches && advancedMatches;
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

  if (activeFilter === "all" && !searchInput.value.trim() && !hasAdvanced()) {
    activeSummary.textContent = "Showing the whole kitchen.";
    return;
  }

  const filterName =
    filterOptions.find(([value]) => value === activeFilter)?.[1] ||
    activeFilter;

  activeSummary.textContent = searchInput.value.trim()
    ? `${visibleCount} result${visibleCount === 1 ? "" : "s"} for “${searchInput.value.trim()}”${activeFilter !== "all" ? ` in ${filterName}` : ""}.`
    : hasAdvanced()
      ? `${visibleCount} recipes match your filters.`
      : `${visibleCount} recipe${visibleCount === 1 ? "" : "s"} in ${filterName}.`;
}

function renderRecipes() {
  const visible = getVisibleRecipes();
  clearFiltersButton.hidden =
    activeFilter === "all" &&
    !searchInput.value &&
    sortSelect.value === "default" &&
    !hasAdvanced();
  recipeGrid.replaceChildren(
    ...visible.map((recipe, index) => createRecipeCard(recipe, index)),
  );

  const total = showingFavourites
    ? recipes.filter((recipe) => savedRecipeIds.has(recipe.id)).length
    : recipes.length;
  recipeCount.textContent = `${visible.length} of ${total} recipe${total === 1 ? "" : "s"}`;
  randomRecipeButton.disabled = visible.length === 0;
  const noSaved = showingFavourites && total === 0;
  document.querySelector("#empty-title").textContent = noSaved
    ? "Keep your favourites close."
    : "No recipes found.";
  document.querySelector("#empty-description").textContent = noSaved
    ? "Tap the heart on a recipe to save it here for another day."
    : "Try another ingredient or clear your filters.";
  document.querySelector("#empty-reset").hidden = noSaved;
  document.querySelector(".empty-browse").hidden = !noSaved;
  emptyMessage.hidden = visible.length !== 0;
  updateSummary(visible.length);
  AnnaKitchen.hydratePhotos();
}

function openRecipe(recipe) {
  AnnaKitchen.openRecipe(recipe, { toggleFavourite });
}

function closeDialog() {
  dialog.close();
  document.body.classList.remove("dialog-open");
}

function setFeaturedRecipe() {
  const featured = recipes[0];
  featuredCard.innerHTML = `${AnnaKitchen.art(featured, true)}<span class="featured-topline">THE KITCHEN FAVOURITE · Nº 01</span><div class="featured-info"><span class="featured-label">A very good place to start</span><h2>${escapeHtml(featured.title)}</h2><div class="featured-meta"><span>${featured.time} MINUTES</span><span>${featured.servings} SERVINGS</span><span class="feature-arrow" aria-hidden="true">↗</span></div></div>`;
  featuredCard.addEventListener("click", () => openRecipe(featured));
}

randomRecipeButton.addEventListener("click", () => {
  const pool = getVisibleRecipes();
  if (!pool.length) return;
  const randomRecipe = pool[Math.floor(Math.random() * pool.length)];
  openRecipe(randomRecipe, Math.floor(Math.random() * 6));
});

customRecipeButton?.addEventListener("click", () => AnnaKitchen.openEditor());
customRecipeClose?.addEventListener("click", () => {
  customRecipeDialog.close();
  document.body.classList.remove("dialog-open");
});
customRecipeDialog?.addEventListener("click", (event) => {
  if (event.target === customRecipeDialog) {
    customRecipeDialog.close();
    document.body.classList.remove("dialog-open");
  }
});
customRecipeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = customRecipeForm.querySelector('[type="submit"]');
  submit.disabled = true;
  let recipe;
  try {
    recipe = await AnnaKitchen.saveEditor();
    if (!recipe) return;
  } catch (e) {
    showToast(window.AnnaKitchen.errorMessage(e));
    return;
  } finally {
    submit.disabled = false;
  }

  customRecipeDialog.close();
  document.body.classList.remove("dialog-open");
  searchInput.value = recipe.title;
  activeFilter = "all";
  resetAdvanced();

  quickFilters.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });
  updateLibraryStats();
  renderRecipes();
  document.querySelector("#recipes").scrollIntoView({ behavior: "smooth" });
  showToast("Recipe saved");
});

clearFiltersButton.addEventListener("click", () => {
  activeFilter = "all";
  searchInput.value = "";
  sortSelect.value = "default";
  resetAdvanced();

  quickFilters.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === "all");
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.filter === "all"),
    );
  });

  renderRecipes();
});

searchInput.addEventListener("input", () => {
  renderRecipes();
});

sortSelect.addEventListener("change", renderRecipes);

document
  .querySelector("#empty-reset")
  .addEventListener("click", () => clearFiltersButton.click());
dialog.addEventListener("close", () =>
  document.body.classList.remove("dialog-open"),
);

dialogClose.addEventListener("click", closeDialog);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

["discover", "library-stats", "seasonal-section", "collection-strip"].forEach(
  (id) => (document.getElementById(id).hidden = libraryView !== "home"),
);
document.querySelectorAll(".navigation [data-view]").forEach((link) => {
  const current = link.dataset.view === libraryView;
  link.classList.toggle("active", current);
  if (current) link.setAttribute("aria-current", "page");
});
if (libraryView !== "home") {
  document.querySelector("#collection-title").textContent = showingFavourites
    ? "Your favourites"
    : "All recipes";
  document.querySelector("#collection-eyebrow").textContent = showingFavourites
    ? "Saved for another day"
    : "The whole kitchen";
  const description = document.querySelector("#collection-description");
  description.hidden = false;
  description.textContent = showingFavourites
    ? "The ones you love, all in one place."
    : "Find your next favourite. Search an ingredient or explore the collection.";
  document.title = `${showingFavourites ? "Favourites" : "All recipes"} | Anna's Kitchen`;
  searchInput.placeholder = showingFavourites
    ? "Search your favourites…"
    : "Search recipes or ingredients…";
}
function updateLibraryStats() {
  document.querySelector("#total-recipes").textContent = recipes.length;
  document.querySelector("#vegetarian-recipes").textContent = recipes.filter(
    (recipe) => recipe.tags.includes("vegetarian"),
  ).length;
  document.querySelector("#quick-recipes").textContent =
    recipes.filter(isQuick).length;
  document.querySelector("#protein-recipes").textContent =
    recipes.filter(isHighProtein).length;
}
updateLibraryStats();
createFilterButtons();
updateFavouriteCount();

if (featuredCard) setFeaturedRecipe();
renderRecipes();

[customRecipeDialog].forEach((modal) => {
  modal.addEventListener("close", () =>
    document.body.classList.remove("dialog-open"),
  );
});

let libraryOwner = window.AnnaKitchen.user?.id;
window.addEventListener("kitchen:change", () => {
  const K = window.AnnaKitchen;
  if (libraryOwner !== K.user?.id) {
    dialog.close();
    dialogContent.replaceChildren();
    customRecipeDialog.close();
    customRecipeForm.reset();
    libraryOwner = K.user?.id;
  }
  savedRecipeIds.clear();
  K.list("favourite").forEach((r) => savedRecipeIds.add(r.id));
  updateFavouriteCount();
  updateLibraryStats();
  renderRecipes();
  document.querySelectorAll("[data-save-id]").forEach((item) => {
    const saved = savedRecipeIds.has(item.dataset.saveId);
    item.classList.toggle("saved", saved);
    item.setAttribute("aria-pressed", String(saved));
    item.textContent = item.classList.contains("dialog-save")
      ? saved
        ? "♥ Saved to favourites"
        : "♡ Save recipe"
      : saved
        ? "♥"
        : "♡";
  });
});

function applyCollection(filter) {
  activeFilter = filter;
  quickFilters.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === filter);
    b.setAttribute("aria-pressed", String(b.dataset.filter === filter));
  });
  renderRecipes();
  document
    .querySelector(".collection-heading")
    .scrollIntoView({ behavior: "smooth" });
}
const curatedCollections = [
  ["weeknight", "Weeknight dinners"],
  ["meal prep", "Meal prep favourites"],
  ["high protein", "Protein, please"],
  ["sweet", "Something sweet"],
  ["quick", "In a hurry"],
  ["comfort food", "A little comfort"],
];
document.querySelector("#collection-tiles").innerHTML = curatedCollections
  .map(
    ([filter, title], i) =>
      `<button class="collection-tile" data-curated="${filter}"><span>0${i + 1}<span aria-hidden="true">↗</span></span><strong>${title}</strong></button>`,
  )
  .join("");
document
  .querySelectorAll("[data-curated]")
  .forEach((b) => (b.onclick = () => applyCollection(b.dataset.curated)));
function renderSeason() {
  const month = new Date().getMonth();
  const cold = month >= 9 || month <= 1;
  const spring = month >= 2 && month <= 4;
  const season = cold
    ? {
        label: "THE COSY SEASON",
        title: "A little comfort<br>for colder days.",
        description:
          "Bowls to curl up with. Something warm from the oven. A good reason to stay in.",
        ids: ["pumpkin-peanut-soup", "mushroom-risotto"],
        filter: "comfort food",
      }
    : spring
      ? {
          label: "A FRESH START",
          title: "A little brighter.<br>A little greener.",
          description:
            "Fresh flavours, bright bowls and good things to welcome longer days.",
          ids: ["feta-chickpea-tuna-salad", "truffle-pea-pasta"],
          filter: "vegetarian",
        }
      : {
          label: "LONG DAYS, GOOD FOOD",
          title: "Less time inside.<br>More at the table.",
          description:
            "Fresh, easy favourites for sun-filled days and dinners with the windows open.",
          ids: ["summer-spring-rolls-peanut-dip", "cucumber-tuna-crunch-salad"],
          filter: "quick",
        };
  document.getElementById("season-label").textContent = season.label;
  document.getElementById("season-title").innerHTML = season.title;
  document.getElementById("season-description").textContent =
    season.description;
  const browse = document.getElementById("season-browse");
  browse.textContent = cold
    ? "Explore comfort food ↗"
    : "Find more inspiration ↗";
  browse.onclick = () => applyCollection(season.filter);
  document.getElementById("seasonal-recipes").replaceChildren(
    ...season.ids.map((id) => {
      const r = recipes.find((r) => r.id === id);
      const b = document.createElement("button");
      b.className = "seasonal-card";
      b.innerHTML = `<div class="recipe-visual">${AnnaKitchen.art(r)}</div><p class="mini-meta" style="margin-top:15px">${r.time} MINUTES · ${r.tags.includes("vegetarian") ? "VEGETARIAN" : "FROM THE RECIPE BOX"}</p><h3>${escapeHtml(r.title)}</h3>`;
      b.onclick = () => openRecipe(r);
      return b;
    }),
  );
}
renderSeason();
function openLinkedRecipe() {
  if (!location.hash.startsWith("#recipe=")) return;
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(8));
  } catch {
    return;
  }
  const recipe = recipes.find((r) => r.id === id);
  if (recipe) openRecipe(recipe);
}
window.addEventListener("hashchange", openLinkedRecipe);
openLinkedRecipe();
const editId = new URLSearchParams(location.search).get("edit");
if (editId) {
  const recipe = recipes.find((r) => r.id === editId);
  if (recipe) AnnaKitchen.openEditor(recipe);
}
document.addEventListener("kitchen:changed", () => {
  updateLibraryStats();
  renderRecipes();
});
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-nutrition-toggle]")) renderRecipes();
});

let appliedNutritionTargets = "";
window.addEventListener("kitchen:change", () => {
  const targets = AnnaKitchen.read("annaNutritionTargets", {}),
    encoded = JSON.stringify(targets);
  if (encoded !== appliedNutritionTargets) {
    appliedNutritionTargets = encoded;
    document.getElementById("calorie-filter").value = targets.calories || "";
    document.getElementById("protein-filter").value = targets.protein || "";
    renderRecipes();
  }
});

window.addEventListener("kitchen:change", () => {
  if (!dialog.open && location.hash.startsWith("#recipe=")) openLinkedRecipe();
});

const importControl = document.querySelector(".import-label");
importControl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    document.getElementById("import-kitchen").click();
  }
});
