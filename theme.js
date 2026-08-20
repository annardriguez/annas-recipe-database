const themeButtons = document.querySelectorAll(".icon-button");
const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  themeMeta?.setAttribute("content", isDark ? "#181716" : "#f4efe7");

  themeButtons.forEach(button => {
    button.textContent = isDark ? "☀" : "☾";
    button.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
    button.setAttribute("aria-pressed", String(isDark));
  });
}

const savedTheme = localStorage.getItem("annaKitchenTheme") || "light";
applyTheme(savedTheme);

function updateSharedFavouriteCounts() {
  const savedRecipeIds = JSON.parse(
    localStorage.getItem("annaRecipeFavourites") || "[]"
  );

  document.querySelectorAll("[data-favourite-count]").forEach(item => {
    item.textContent = savedRecipeIds.length;
  });
}

updateSharedFavouriteCounts();

themeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme")
      ? "light"
      : "dark";
    localStorage.setItem("annaKitchenTheme", nextTheme);
    applyTheme(nextTheme);
  });
});
