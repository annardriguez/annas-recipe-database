function applyNutritionPreference(showNutrition) {
  document.body.classList.toggle("hide-nutrition", !showNutrition);

  document.querySelectorAll("[data-nutrition-toggle]").forEach(button => {
    button.textContent = showNutrition ? "Nutrition on" : "Nutrition off";
    button.setAttribute("aria-pressed", String(showNutrition));
    button.setAttribute(
      "aria-label",
      showNutrition ? "Hide calories and macros" : "Show calories and macros"
    );
  });

  document.querySelectorAll('select option[value="protein"], select option[value="calories"]').forEach(option => {
    option.hidden = !showNutrition;
    if (!showNutrition && option.parentElement?.value === option.value) {
      option.parentElement.value = "default";
      option.parentElement.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

const savedNutritionPreference =
  localStorage.getItem("annaShowNutrition") === "true";
applyNutritionPreference(savedNutritionPreference);

document.addEventListener("click", event => {
  const button = event.target.closest("[data-nutrition-toggle]");
  if (button) {
    const nextPreference = document.body.classList.contains("hide-nutrition");
    localStorage.setItem("annaShowNutrition", String(nextPreference));
    applyNutritionPreference(nextPreference);
  }
});

window.AnnaNutrition = {
  apply: applyNutritionPreference,
  isVisible: () => !document.body.classList.contains("hide-nutrition")
};
