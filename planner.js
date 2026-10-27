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
const recipePicker = document.querySelector("#recipe-picker-dialog");
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
  snack: "Sweet & snack",
  sweet: "Sweet",
  side: "Side",
  lunch: "Lunch"
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
  return Number.isFinite(recipe.time) && recipe.time <= 15;
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
  plannerSearch.value = "";
  renderPlanner();
  recipePicker.showModal();
  plannerSearch.focus();
}

function assignRecipe(recipeId) {
  if (!selectedSlot) {
    showToast("Pick a calendar slot first");
    return;
  }

  mealPlan[makeSlotKey(selectedSlot.dateKey, selectedSlot.slot)] = recipeId;
  savePlan();
  renderPlanner();
  recipePicker.close();
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
    : "Choose any meal to add a recipe.";

  calendarGrid.replaceChildren(...weekDates.map(renderDay));
  renderRecipePicker();
  renderWeeklySummary();
}

function renderDay(date) {
  const dateKey = toDateKey(date);
  const day = document.createElement("section");
  day.className = "calendar-day";
  day.classList.toggle("is-today", dateKey === toDateKey(new Date()));
  day.innerHTML = `
    <div class="day-header">
      <span class="day-name">${dayFormatter.format(date)}</span>
      <span class="day-date">${date.getDate()}</span>
    </div>
  `;

  const meals = document.createElement("div");
  meals.className = "day-meals";
  mealSlots.forEach(slot => meals.appendChild(renderSlot(dateKey, slot)));
  day.appendChild(meals);

  return day;
}

function renderSlot(dateKey, slot) {
  const key = makeSlotKey(dateKey, slot);
  const recipe = getRecipeById(mealPlan[key]);
  const isActive =
    selectedSlot?.dateKey === dateKey && selectedSlot?.slot === slot;
  const cell = document.createElement("div");
  cell.className = `meal-slot ${recipe ? "has-meal" : ""} ${isActive ? "active" : ""}`;
  const choose = document.createElement("button");
  choose.type = "button";
  choose.id = `meal-${dateKey}-${slot}`;
  choose.className = "meal-choice";
  choose.setAttribute("aria-label", `${slot} on ${dateKey}: ${recipe ? recipe.title + ". Change recipe" : "Add a recipe"}`);
  choose.innerHTML = `
    <span class="slot-label">${escapeHtml(slot)}</span>
    ${recipe ? `<span class="slot-meal"><strong>${escapeHtml(recipe.title)}</strong><span>${recipe.time} min</span></span>` : '<span class="slot-empty"><span aria-hidden="true">+</span> Add meal</span>'}
  `;
  choose.addEventListener("click", () => selectSlot(dateKey, slot));
  cell.appendChild(choose);
  if (recipe) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "slot-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${recipe.title} from ${slot} on ${dateKey}`);
    remove.addEventListener("click", () => removeMeal(dateKey, slot));
    cell.appendChild(remove);
  }
  return cell;
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

    return query.split(/\s+/).every(word => searchable.includes(word));
  });
}

function renderRecipePicker() {
  pickerTitle.textContent = selectedSlot
    ? `Add to ${selectedSlot.slot}`
    : "Choose a recipe";
  pickerHelper.textContent = selectedSlot
    ? `${fullDateFormatter.format(new Date(`${selectedSlot.dateKey}T00:00:00`))} · Choose a recipe to add or replace this meal.`
    : "Then choose a recipe to place in the calendar.";

  const visible = getFilteredRecipes();
  recipeList.replaceChildren(...visible.map(renderPickerRecipe));
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "picker-empty";
    empty.textContent = "No recipes found. Try another ingredient.";
    recipeList.appendChild(empty);
  }
}

function renderPickerRecipe(recipe) {
  const item = document.createElement("article");
  item.className = "picker-recipe";
  item.innerHTML = `
    <span class="picker-emoji">${escapeHtml(recipe.emoji)}</span>
    <span>
      <h3><button class="picker-preview" type="button">${escapeHtml(recipe.title)}</button></h3>
      <p>${escapeHtml(recipe.description)}</p>
      <span class="picker-meta">
        <span>${recipe.time} min</span>
        <span class="nutrition-only">${formatMeta(recipe.protein, " g protein")}</span>
        <span>${isQuick(recipe) ? "quick" : labels[recipe.category] || recipe.category}</span>
      </span>
    </span>
    <button class="recipe-add-button" type="button">Add <span aria-hidden="true">+</span></button>
  `;

  item.querySelector(".recipe-add-button").addEventListener("click", () => {
    assignRecipe(recipe.id);
  });

  item.querySelector(".picker-preview").addEventListener("click", () => openRecipe(recipe));
  item.querySelector(".recipe-add-button").setAttribute("aria-label", `Add ${recipe.title}`);

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
          <div class="nutrition-only">
            <strong>${recipe.calories ?? "-"}</strong>
            <span>kcal</span>
          </div>
          <div class="nutrition-only">
            <strong>${recipe.protein ?? "-"}</strong>
            <span>g protein</span>
          </div>
          <div class="nutrition-only">
            <strong>${recipe.carbs ?? "-"}</strong>
            <span>g carbs</span>
          </div>
          <div class="nutrition-only">
            <strong>${recipe.fat ?? "-"}</strong>
            <span>g fat</span>
          </div>
          <div class="nutrition-only">
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

function getPlannedRecipesForDay(date) {
  const dateKey = toDateKey(date);

  return mealSlots
    .map(slot => getRecipeById(mealPlan[makeSlotKey(dateKey, slot)]))
    .filter(Boolean);
}

function sumMacro(plannedRecipes, key) {
  return plannedRecipes.reduce((total, recipe) => {
    const value = recipe[key];
    return typeof value === "number" ? total + value : total;
  }, 0);
}

function formatDailyMacro(value, suffix = "") {
  return value ? `${value}${suffix}` : "-";
}

function renderDailyMacro(date) {
  const plannedRecipes = getPlannedRecipesForDay(date);
  const plannedCount = plannedRecipes.length;
  const calories = sumMacro(plannedRecipes, "calories");
  const protein = sumMacro(plannedRecipes, "protein");
  const carbs = sumMacro(plannedRecipes, "carbs");
  const fat = sumMacro(plannedRecipes, "fat");

  return `
    <article class="daily-summary ${plannedCount ? "" : "empty"}">
      <div>
        <strong>${dayFormatter.format(date)}</strong>
        <span>${dateFormatter.format(date)} · ${plannedCount || "no"} meal${plannedCount === 1 ? "" : "s"}</span>
      </div>
      <dl>
        <div><dt>kcal</dt><dd>${formatDailyMacro(calories)}</dd></div>
        <div><dt>protein</dt><dd>${formatDailyMacro(protein, "g")}</dd></div>
        <div><dt>carbs</dt><dd>${formatDailyMacro(carbs, "g")}</dd></div>
        <div><dt>fat</dt><dd>${formatDailyMacro(fat, "g")}</dd></div>
      </dl>
    </article>
  `;
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

  plannedMealCount.textContent = `${plannedCount} meal${plannedCount === 1 ? "" : "s"} planned`;
  weeklySummary.innerHTML = getWeekDates().map(renderDailyMacro).join("");

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
dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
dialogClose.addEventListener("click", closeDialog);
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeDialog();
});

document.querySelector(".picker-close").addEventListener("click", () => recipePicker.close());
recipePicker.addEventListener("click", event => {
  if (event.target !== recipePicker) return;
  const bounds = recipePicker.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) recipePicker.close();
});
recipePicker.addEventListener("close", () => {
  const previousSlot = selectedSlot;
  selectedSlot = null;
  renderPlanner();
  if (previousSlot) document.getElementById(`meal-${previousSlot.dateKey}-${previousSlot.slot}`)?.focus();
});
updateSaveStatus(savedPlanAt);
renderPlanner();
