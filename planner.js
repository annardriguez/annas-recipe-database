const calendarGrid = document.querySelector("#calendar-grid");
const weekTitle = document.querySelector("#planner-week-title");
const weekSubtitle = document.querySelector("#planner-week-subtitle");
const saveStatus = document.querySelector("#planner-save-status");
const previousWeekButton = document.querySelector("#previous-week");
const nextWeekButton = document.querySelector("#next-week");
const todayWeekButton = document.querySelector("#today-week");
const organizeWeekButton = document.querySelector("#organize-week");
const clearWeekButton = document.querySelector("#clear-week");
const plannerSearch = document.querySelector("#planner-search");
const recipeList = document.querySelector("#planner-recipe-list");
const pickerTitle = document.querySelector("#picker-title");
const pickerHelper = document.querySelector("#picker-helper");
const favouriteCount = document.querySelector("#planner-favourite-count");
const plannedMealCount = document.querySelector("#planned-meal-count");
const weeklySummary = document.querySelector("#weekly-summary");
const shoppingList = document.querySelector("#shopping-list");
const copyShoppingListButton = document.querySelector("#copy-shopping-list");
const dialog = document.querySelector("#recipe-dialog");
const dialogContent = document.querySelector("#dialog-content");
const dialogClose = document.querySelector("#dialog-close");
const toast = document.querySelector("#toast");

const mealSlots = ["Breakfast", "Lunch", "Dinner", "Snack"];
const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "short",
  day: "numeric"
});

let currentWeekStart = startOfWeek(new Date());
let selectedSlot = null;
let toastTimer;

const mealPlan = JSON.parse(localStorage.getItem("annaMealPlan") || "{}");
const savedPlanAt = localStorage.getItem("annaMealPlanSavedAt");
const savedRecipeIds = new Set(
  JSON.parse(localStorage.getItem("annaRecipeFavourites") || "[]")
);

const labels = {
  main: "Main meal",
  breakfast: "Breakfast",
  snack: "Sweet & snack"
};

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

function startOfWeek(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function makeSlotKey(dateKey, slot) {
  return `${dateKey}|${slot}`;
}

function getRecipeById(id) {
  return recipes.find(recipe => recipe.id === id);
}

function formatSavedTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function hasSavedMeals() {
  return Object.keys(mealPlan).length > 0;
}

function updateSaveStatus(savedAt = localStorage.getItem("annaMealPlanSavedAt")) {
  if (!saveStatus) return;

  if (!hasSavedMeals()) {
    saveStatus.textContent =
      "This planner saves on this device when you add meals.";
    return;
  }

  const savedTime = formatSavedTime(savedAt);
  saveStatus.textContent = savedTime
    ? `Saved on this device · last updated ${savedTime}`
    : "Saved on this device.";
}

function savePlan(savedAt = new Date().toISOString()) {
  localStorage.setItem("annaMealPlan", JSON.stringify(mealPlan));
  localStorage.setItem("annaMealPlanSavedAt", savedAt);
  updateSaveStatus(savedAt);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function isQuick(recipe) {
  return recipe.time <= 15 || recipe.tags.includes("quick");
}

function isHighProtein(recipe) {
  return recipe.tags.includes("high protein") || (recipe.protein ?? 0) >= 25;
}

function setWeek(offset) {
  currentWeekStart = addDays(currentWeekStart, offset * 7);
  selectedSlot = null;
  renderPlanner();
}

function selectSlot(dateKey, slot) {
  selectedSlot = { dateKey, slot };
  renderPlanner();
}

function assignRecipe(recipeId) {
  if (!selectedSlot) {
    showToast("Pick a calendar slot first");
    return;
  }

  mealPlan[makeSlotKey(selectedSlot.dateKey, selectedSlot.slot)] = recipeId;
  savePlan();
  renderPlanner();
  showToast("Meal added to the planner");
}

function removeMeal(dateKey, slot) {
  delete mealPlan[makeSlotKey(dateKey, slot)];
  savePlan();
  renderPlanner();
  showToast("Meal removed");
}

function getWeekDates() {
  return Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index));
}

function renderPlanner() {
  const weekDates = getWeekDates();
  const weekEnd = weekDates[6];
  weekTitle.textContent = `${dateFormatter.format(currentWeekStart)} - ${dateFormatter.format(weekEnd)}`;
  weekSubtitle.textContent = selectedSlot
    ? `${selectedSlot.slot} on ${fullDateFormatter.format(new Date(`${selectedSlot.dateKey}T00:00:00`))}`
    : "Choose a meal slot to start planning.";

  calendarGrid.replaceChildren(...weekDates.map(renderDay));
  renderRecipePicker();
  renderWeeklySummary();
}

function renderDay(date) {
  const dateKey = toDateKey(date);
  const day = document.createElement("section");
  day.className = "calendar-day";
  day.innerHTML = `
    <div class="day-header">
      <span class="day-name">${dayFormatter.format(date)}</span>
      <span class="day-date">${date.getDate()}</span>
    </div>
  `;

  mealSlots.forEach(slot => {
    day.appendChild(renderSlot(dateKey, slot));
  });

  return day;
}

function renderSlot(dateKey, slot) {
  const key = makeSlotKey(dateKey, slot);
  const recipe = getRecipeById(mealPlan[key]);
  const isActive =
    selectedSlot?.dateKey === dateKey && selectedSlot?.slot === slot;
  const button = document.createElement("button");
  button.className = `meal-slot ${recipe ? "has-meal" : ""} ${isActive ? "active" : ""}`;
  button.type = "button";
  button.innerHTML = recipe
    ? `
      <span class="slot-label">${escapeHtml(slot)}</span>
      <span class="slot-meal">
        <strong>${escapeHtml(recipe.title)}</strong>
        <span>${recipe.time} min · ${formatMeta(recipe.protein, " g protein")}</span>
      </span>
      <span class="slot-remove" data-remove="true">Remove</span>
    `
    : `
      <span class="slot-label">${escapeHtml(slot)}</span>
      <span class="slot-empty">+ Add recipe</span>
    `;

  button.addEventListener("click", event => {
    if (event.target.closest("[data-remove]")) {
      event.stopPropagation();
      removeMeal(dateKey, slot);
      return;
    }

    selectSlot(dateKey, slot);
  });

  return button;
}

function getFilteredRecipes() {
  const query = plannerSearch.value.trim().toLowerCase();

  return recipes.filter(recipe => {
    const searchable = [
      recipe.title,
      recipe.description,
      recipe.category,
      ...recipe.tags,
      ...recipe.ingredients
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });
}

function renderRecipePicker() {
  pickerTitle.textContent = selectedSlot
    ? `Add to ${selectedSlot.slot}`
    : "Pick a meal slot";
  pickerHelper.textContent = selectedSlot
    ? "Choose a recipe below. Picking another recipe will replace the current meal."
    : "Then choose a recipe to place in the calendar.";

  const visible = getFilteredRecipes();
  recipeList.replaceChildren(...visible.map(renderPickerRecipe));
}

function renderPickerRecipe(recipe) {
  const item = document.createElement("article");
  item.className = "picker-recipe";
  item.innerHTML = `
    <span class="picker-emoji">${escapeHtml(recipe.emoji)}</span>
    <span>
      <h3>${escapeHtml(recipe.title)}</h3>
      <p>${escapeHtml(recipe.description)}</p>
      <span class="picker-meta">
        <span>${recipe.time} min</span>
        <span>${formatMeta(recipe.protein, " g protein")}</span>
        <span>${isQuick(recipe) ? "quick" : labels[recipe.category] || recipe.category}</span>
      </span>
    </span>
    <button class="recipe-add-button" type="button">Add to slot</button>
  `;

  item.querySelector(".recipe-add-button").addEventListener("click", () => {
    assignRecipe(recipe.id);
  });

  item.addEventListener("dblclick", () => openRecipe(recipe));

  return item;
}

const mealThemeKeywords = [
  "rice",
  "pasta",
  "noodle",
  "gnocchi",
  "potato",
  "soup",
  "bowl",
  "salad",
  "tofu",
  "chicken",
  "salmon",
  "tuna",
  "halloumi",
  "lentil",
  "aubergine",
  "pumpkin",
  "sweet"
];

function getMealThemes(recipe) {
  const searchable = [
    recipe.title,
    recipe.description,
    recipe.category,
    ...recipe.tags,
    ...recipe.ingredients
  ].join(" ").toLowerCase();

  return mealThemeKeywords.filter(theme => searchable.includes(theme));
}

function pickRecipe(pool, index, usedIds, avoidThemes = [], offset = 0) {
  if (!pool.length) return null;

  const start = (index + offset) % pool.length;
  const ordered = [...pool.slice(start), ...pool.slice(0, start)];
  const noRepeat = ordered.filter(recipe => !usedIds.has(recipe.id));
  const bestMatch = noRepeat.find(recipe =>
    !getMealThemes(recipe).some(theme => avoidThemes.includes(theme))
  );

  return bestMatch || noRepeat[0] || ordered[0];
}

function organizeWeek() {
  const breakfastPool = recipes.filter(recipe => recipe.category === "breakfast");
  const mainPool = recipes.filter(recipe => recipe.category === "main");
  const lunchPool = mainPool.filter(recipe =>
    recipe.tags.includes("quick") ||
    recipe.tags.includes("bowl") ||
    recipe.tags.includes("meal prep") ||
    recipe.time <= 25
  );
  const snackPool = recipes.filter(recipe =>
    recipe.category === "snack" || recipe.tags.includes("snack")
  );

  getWeekDates().forEach((date, index) => {
    const dateKey = toDateKey(date);
    const usedToday = new Set();
    const breakfast = pickRecipe(breakfastPool, index, usedToday);
    if (breakfast) usedToday.add(breakfast.id);

    const lunch = pickRecipe(lunchPool.length ? lunchPool : mainPool, index, usedToday, [], 2);
    if (lunch) usedToday.add(lunch.id);

    const lunchThemes = lunch ? getMealThemes(lunch) : [];
    const dinner = pickRecipe(mainPool, index, usedToday, lunchThemes, 9);
    if (dinner) usedToday.add(dinner.id);

    const snack = pickRecipe(snackPool, index, usedToday, [], 4);

    if (breakfast) mealPlan[makeSlotKey(dateKey, "Breakfast")] = breakfast.id;
    if (lunch) mealPlan[makeSlotKey(dateKey, "Lunch")] = lunch.id;
    if (dinner) mealPlan[makeSlotKey(dateKey, "Dinner")] = dinner.id;
    if (snack) mealPlan[makeSlotKey(dateKey, "Snack")] = snack.id;
  });

  selectedSlot = null;
  savePlan();
  renderPlanner();
  showToast("Week organized with sensible meals");
}

function clearWeek() {
  getWeekDates().forEach(date => {
    const dateKey = toDateKey(date);
    mealSlots.forEach(slot => {
      delete mealPlan[makeSlotKey(dateKey, slot)];
    });
  });
  selectedSlot = null;
  savePlan();
  renderPlanner();
  showToast("Week cleared");
}

function openRecipe(recipe) {
  dialogContent.innerHTML = `
    <header class="dialog-cover palette-2">
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
            <strong>${recipe.calories ?? "-"}</strong>
            <span>kcal</span>
          </div>
          <div>
            <strong>${recipe.protein ?? "-"}</strong>
            <span>g protein</span>
          </div>
          <div>
            <strong>${recipe.carbs ?? "-"}</strong>
            <span>g carbs</span>
          </div>
          <div>
            <strong>${recipe.fat ?? "-"}</strong>
            <span>g fat</span>
          </div>
          <div>
            <strong>${recipe.fiber ?? "-"}</strong>
            <span>g fiber</span>
          </div>
        </div>

        <h3>Ingredients</h3>
        <ul>
          ${recipe.ingredients.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
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

  dialog.showModal();
  document.body.classList.add("dialog-open");
}

function getPlannedRecipesForWeek() {
  return getWeekDates().flatMap(date => {
    const dateKey = toDateKey(date);

    return mealSlots
      .map(slot => getRecipeById(mealPlan[makeSlotKey(dateKey, slot)]))
      .filter(Boolean);
  });
}

function sumMacro(plannedRecipes, key) {
  return plannedRecipes.reduce((total, recipe) => {
    const value = recipe[key];
    return typeof value === "number" ? total + value : total;
  }, 0);
}

function uniqueIngredients(plannedRecipes) {
  const seen = new Set();

  return plannedRecipes.flatMap(recipe => recipe.ingredients).filter(item => {
    const normalized = item
      .toLowerCase()
      .replace(/^[\d\s./–-]+(g|ml|tsp|tbsp|small|large|medium)?\s+/i, "")
      .trim();

    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function renderWeeklySummary() {
  const plannedRecipes = getPlannedRecipesForWeek();
  const plannedCount = plannedRecipes.length;
  const calories = sumMacro(plannedRecipes, "calories");
  const protein = sumMacro(plannedRecipes, "protein");
  const carbs = sumMacro(plannedRecipes, "carbs");
  const fat = sumMacro(plannedRecipes, "fat");

  plannedMealCount.textContent = `${plannedCount} meal${plannedCount === 1 ? "" : "s"} planned`;
  weeklySummary.innerHTML = `
    <div><strong>${calories || "-"}</strong><span>kcal total</span></div>
    <div><strong>${protein || "-"}</strong><span>g protein</span></div>
    <div><strong>${carbs || "-"}</strong><span>g carbs</span></div>
    <div><strong>${fat || "-"}</strong><span>g fat</span></div>
  `;

  const ingredients = uniqueIngredients(plannedRecipes).slice(0, 28);
  shoppingList.replaceChildren(
    ...(ingredients.length
      ? ingredients.map(item => {
          const listItem = document.createElement("li");
          listItem.textContent = item;
          return listItem;
        })
      : [Object.assign(document.createElement("li"), {
          className: "shopping-empty",
          textContent: "Plan meals to build a shopping list."
        })])
  );
}

async function copyShoppingList() {
  const ingredients = uniqueIngredients(getPlannedRecipesForWeek());

  if (!ingredients.length) {
    showToast("Plan a few meals first");
    return;
  }

  const text = ingredients.map(item => `- ${item}`).join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("Shopping list copied");
  } catch {
    showToast("Could not copy list in this browser");
  }
}

function closeDialog() {
  dialog.close();
  document.body.classList.remove("dialog-open");
}

previousWeekButton.addEventListener("click", () => setWeek(-1));
nextWeekButton.addEventListener("click", () => setWeek(1));
todayWeekButton.addEventListener("click", () => {
  currentWeekStart = startOfWeek(new Date());
  selectedSlot = null;
  renderPlanner();
});
organizeWeekButton.addEventListener("click", organizeWeek);
clearWeekButton.addEventListener("click", clearWeek);
plannerSearch.addEventListener("input", renderRecipePicker);
copyShoppingListButton.addEventListener("click", copyShoppingList);
dialogClose.addEventListener("click", closeDialog);
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeDialog();
});

favouriteCount.textContent = savedRecipeIds.size;
document.querySelectorAll("[data-favourite-count]").forEach(item => {
  item.textContent = savedRecipeIds.size;
});
updateSaveStatus(savedPlanAt);
renderPlanner();
