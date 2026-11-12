(() => {
  const CUSTOM_RECIPE_STORAGE_KEY = "annaCustomRecipes";

  function parseCustomRecipeList() {
    return window.AnnaKitchen.list("recipe").map((row) => row.data);
  }

  function splitRecipeLines(value) {
    return String(value || "")
      .split(/\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeCustomRecipe(recipe) {
    const title = String(recipe.title || "").trim();
    const tags = Array.isArray(recipe.tags)
      ? recipe.tags
      : String(recipe.tags || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : splitRecipeLines(recipe.ingredients);
    const steps = Array.isArray(recipe.steps)
      ? recipe.steps
      : splitRecipeLines(recipe.steps);

    return {
      ...recipe,
      id:
        recipe.id ||
        `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: String(
        recipe.description || "A custom recipe from your kitchen.",
      ).trim(),
      emoji: String(recipe.emoji || "🍽️").trim() || "🍽️",
      category: recipe.category || "main",
      tags: [...new Set(["custom", ...tags.map((tag) => tag.toLowerCase())])],
      equipment: Array.isArray(recipe.equipment) ? recipe.equipment : [],
      time: Number(recipe.time) || 20,
      calories:
        recipe.calories == null || recipe.calories === ""
          ? null
          : Number(recipe.calories),
      protein:
        recipe.protein == null || recipe.protein === ""
          ? null
          : Number(recipe.protein),
      carbs:
        recipe.carbs == null || recipe.carbs === ""
          ? null
          : Number(recipe.carbs),
      fat: recipe.fat == null || recipe.fat === "" ? null : Number(recipe.fat),
      fiber:
        recipe.fiber == null || recipe.fiber === ""
          ? null
          : Number(recipe.fiber),
      ingredients: ingredients.length ? ingredients : ["Add ingredients"],
      steps: steps.length ? steps : ["Add your method"],
      note: String(recipe.note || "Saved by you.").trim(),
      isCustom: true,
    };
  }

  function getCustomRecipes() {
    return parseCustomRecipeList()
      .map(normalizeCustomRecipe)
      .filter((recipe) => recipe.title);
  }

  function refreshRecipeList(customRecipes = getCustomRecipes()) {
    if (typeof recipes === "undefined" || !Array.isArray(recipes)) return;

    for (let index = recipes.length - 1; index >= 0; index -= 1) {
      if (recipes[index]?.isCustom) recipes.splice(index, 1);
    }

    recipes.push(...customRecipes);
  }

  async function addCustomRecipe(recipe) {
    const normalized = normalizeCustomRecipe(recipe);
    if (!normalized.title) throw new Error("Recipe title is required");
    await window.AnnaKitchen.set("recipe", normalized.id, normalized);
    refreshRecipeList();
    return normalized;
  }

  async function removeCustomRecipe(recipeId) {
    const K = window.AnnaKitchen;
    const changes = ["recipe", "favourite", "entry"].map((kind) => ({
      kind,
      id: recipeId,
      data: {},
      deleted: true,
    }));
    await K.batch(changes);
    refreshRecipeList();
  }

  refreshRecipeList();
  window.addEventListener("kitchen:change", () => refreshRecipeList());
  window.AnnaCustomRecipes = {
    add: addCustomRecipe,
    list: getCustomRecipes,
    remove: removeCustomRecipe,
    normalize: normalizeCustomRecipe,
  };
})();
