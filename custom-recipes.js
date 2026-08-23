const CUSTOM_RECIPE_STORAGE_KEY = "annaCustomRecipes";

function parseCustomRecipeList() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_RECIPE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomRecipeList(customRecipes) {
  localStorage.setItem(CUSTOM_RECIPE_STORAGE_KEY, JSON.stringify(customRecipes));
}

function splitRecipeLines(value) {
  return String(value || "")
    .split(/\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeCustomRecipe(recipe) {
  const title = String(recipe.title || "").trim();
  const tags = Array.isArray(recipe.tags) ? recipe.tags : splitRecipeLines(recipe.tags);
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : splitRecipeLines(recipe.ingredients);
  const steps = Array.isArray(recipe.steps) ? recipe.steps : splitRecipeLines(recipe.steps);

  return {
    id: recipe.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description: String(recipe.description || "A custom recipe from your kitchen.").trim(),
    emoji: String(recipe.emoji || "🍽️").trim() || "🍽️",
    category: recipe.category || "main",
    tags: [...new Set(["custom", ...tags.map(tag => tag.toLowerCase())])],
    equipment: Array.isArray(recipe.equipment) ? recipe.equipment : [],
    time: Number(recipe.time) || 20,
    calories: Number(recipe.calories) || null,
    protein: Number(recipe.protein) || null,
    carbs: Number(recipe.carbs) || null,
    fat: Number(recipe.fat) || null,
    fiber: Number(recipe.fiber) || null,
    ingredients: ingredients.length ? ingredients : ["Add ingredients"],
    steps: steps.length ? steps : ["Add your method"],
    note: String(recipe.note || "Saved by you.").trim(),
    isCustom: true
  };
}

function getCustomRecipes() {
  return parseCustomRecipeList().map(normalizeCustomRecipe).filter(recipe => recipe.title);
}

function refreshRecipeList(customRecipes = getCustomRecipes()) {
  if (typeof recipes === "undefined" || !Array.isArray(recipes)) return;

  for (let index = recipes.length - 1; index >= 0; index -= 1) {
    if (recipes[index]?.isCustom) recipes.splice(index, 1);
  }

  recipes.push(...customRecipes);
}

function addCustomRecipe(recipe) {
  const normalized = normalizeCustomRecipe(recipe);
  if (!normalized.title) throw new Error("Recipe title is required");

  const customRecipes = getCustomRecipes();
  customRecipes.unshift(normalized);
  saveCustomRecipeList(customRecipes);
  refreshRecipeList(customRecipes);
  return normalized;
}

function removeCustomRecipe(recipeId) {
  const customRecipes = getCustomRecipes().filter(recipe => recipe.id !== recipeId);
  saveCustomRecipeList(customRecipes);
  refreshRecipeList(customRecipes);
}

refreshRecipeList();

window.AnnaCustomRecipes = {
  add: addCustomRecipe,
  list: getCustomRecipes,
  remove: removeCustomRecipe
};
