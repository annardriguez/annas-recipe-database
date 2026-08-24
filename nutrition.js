const nutritionButtons = document.querySelectorAll("[data-nutrition-toggle]");

function applyNutritionPreference(showNutrition) {
  document.body.classList.toggle("hide-nutrition", !showNutrition);

  nutritionButtons.forEach(button => {
    button.textContent = showNutrition ? "Nutrition on" : "Nutrition off";
    button.setAttribute("aria-pressed", String(showNutrition));
    button.setAttribute(
      "aria-label",
      showNutrition ? "Hide calories and macros" : "Show calories and macros"
    );
  });
}

const savedNutritionPreference =
  localStorage.getItem("annaShowNutrition") !== "false";
applyNutritionPreference(savedNutritionPreference);

nutritionButtons.forEach(button => {
  button.addEventListener("click", () => {
    const nextPreference = document.body.classList.contains("hide-nutrition");
    localStorage.setItem("annaShowNutrition", String(nextPreference));
    applyNutritionPreference(nextPreference);
  });
});
