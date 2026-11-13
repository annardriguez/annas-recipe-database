/* Shared cookbook tools. Original recipe data and legacy storage keys are retained. */
(() => {
  "use strict";
  const html = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c],
    );
  const K = window.AnnaKitchen;
  const notify = (message) => {
    const el = document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => el.classList.remove("show"), 2800);
  };
  function read(key, fallback) {
    if (key === "annaRecipeFavourites")
      return K.list("favourite").map((r) => r.id);
    if (key === "annaCustomRecipes") return K.list("recipe").map((r) => r.data);
    if (key === "annaRecipeEdits")
      return Object.fromEntries(
        K.list("entry")
          .filter((r) => r.data.recipeEdit)
          .map((r) => [r.id, r.data.recipeEdit]),
      );
    if (key === "annaRecipeNotes")
      return Object.fromEntries(
        K.list("entry").map((r) => [
          r.id,
          {
            note: r.data.notes || "",
            substitutions: r.data.substitutions || "",
            tags: r.data.tags || [],
          },
        ]),
      );
    if (key === "annaCollections")
      return Object.fromEntries(
        K.list("collection").map((c) => [
          c.data.name,
          K.list("entry")
            .filter((e) => (e.data.collection_ids || []).includes(c.id))
            .map((e) => e.id),
        ]),
      );
    const value = K.get("profile", "cookbook-tools")?.[key];
    if (value !== undefined) return value;
    if (!K.user) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch {}
    }
    return fallback;
  }
  async function saveChanges(changes) {
    for (let i = 0; i < changes.length; i += 80)
      await K.batch(
        changes.slice(i, i + 80).map((c) => ({ deleted: false, ...c })),
      );
  }
  async function write(key, value) {
    try {
      if (key === "annaRecipeFavourites") {
        const ids = new Set(value),
          old = K.list("favourite");
        await saveChanges([
          ...value
            .filter((id) => !K.get("favourite", id))
            .map((id) => ({ kind: "favourite", id, data: {} })),
          ...old
            .filter((r) => !ids.has(r.id))
            .map((r) => ({
              kind: "favourite",
              id: r.id,
              data: {},
              deleted: true,
            })),
        ]);
      } else if (key === "annaRecipeEdits") {
        const changes = Object.entries(value).map(([id, recipeEdit]) => ({
          kind: "entry",
          id,
          data: { ...K.get("entry", id), recipeEdit },
        }));
        await saveChanges(changes);
      } else if (key === "annaRecipeNotes") {
        await saveChanges(
          Object.entries(value).map(([id, m]) => ({
            kind: "entry",
            id,
            data: {
              ...K.get("entry", id),
              notes: m.note,
              substitutions: m.substitutions,
              tags: m.tags,
            },
          })),
        );
      } else if (key === "annaCollections") {
        const existing = K.list("collection"),
          changes = [],
          ids = new Map(existing.map((r) => [r.data.name, r.id]));
        for (const name of Object.keys(value))
          if (!ids.has(name)) {
            const id = crypto.randomUUID();
            ids.set(name, id);
            changes.push({ kind: "collection", id, data: { name } });
          }
        const recipeIds = new Set([
          ...K.list("entry").map((r) => r.id),
          ...Object.values(value).flat(),
        ]);
        for (const id of recipeIds) {
          const entry = K.get("entry", id) || {};
          const memberships = [
            ...new Set([
              ...Object.entries(value)
                .filter(([, members]) => members.includes(id))
                .map(([name]) => ids.get(name)),
            ]),
          ];
          if (
            JSON.stringify(entry.collection_ids || []) !==
            JSON.stringify(memberships)
          )
            changes.push({
              kind: "entry",
              id,
              data: { ...entry, collection_ids: memberships },
            });
        }
        if (changes.length) await saveChanges(changes);
      } else
        await K.set("profile", "cookbook-tools", {
          ...K.get("profile", "cookbook-tools"),
          [key]: value,
        });
      return true;
    } catch (error) {
      notify(K.errorMessage(error));
      return false;
    }
  }
  const originals = new Map(
    recipes
      .filter((r) => !r.isCustom)
      .map((r) => [r.id, JSON.parse(JSON.stringify(r))]),
  );
  function applyEdits() {
    for (const recipe of recipes) {
      const original = originals.get(recipe.id);
      if (original) {
        const id = recipe.id;
        Object.keys(recipe).forEach((key) => delete recipe[key]);
        Object.assign(
          recipe,
          structuredClone(original),
          K.get("entry", id)?.recipeEdit || {},
        );
      }
    }
  }
  applyEdits();
  window.addEventListener("kitchen:change", () => {
    applyEdits();
    refreshCollections();
  });
  const collections = () => read("annaCollections", {});
  const metadata = (id) => read("annaRecipeNotes", {})[id] || {};
  const number = (n) =>
    Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "—";
  const fraction = (text) => {
    const map = {
      "¼": 0.25,
      "½": 0.5,
      "¾": 0.75,
      "⅓": 1 / 3,
      "⅔": 2 / 3,
      "⅛": 0.125,
      "⅜": 0.375,
      "⅝": 0.625,
      "⅞": 0.875,
    };
    let total = 0;
    String(text)
      .trim()
      .split(/\s+/)
      .forEach((part) => {
        if (part.includes("/")) {
          const [a, b] = part.split("/").map(Number);
          total += a / b;
        } else if (/[¼½¾⅓⅔⅛⅜⅝⅞]/.test(part)) {
          const glyph = part.slice(-1);
          total += (Number(part.slice(0, -1)) || 0) + map[glyph];
        } else total += Number(part);
      });
    return total;
  };
  const amountPattern =
    "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?[¼½¾⅓⅔⅛⅜⅝⅞]?|[¼½¾⅓⅔⅛⅜⅝⅞])";
  const leadingAmount = new RegExp(
    "^(.*?:\\s*)?(" +
      amountPattern +
      ")(?:\\s*[–-]\\s*(" +
      amountPattern +
      "))?(?=\\s|$)",
  );
  function scaleIngredient(line, ratio) {
    if (!Number.isFinite(ratio) || ratio === 1) return line;
    // Scale the leading quantity and explicit equivalent measures, never cooking times or percentages.
    return String(line)
      .replace(
        leadingAmount,
        (_, prefix, a, b) =>
          `${prefix || ""}${number(fraction(a) * ratio)}${b ? "–" + number(fraction(b) * ratio) : ""}`,
      )
      .replace(
        new RegExp(
          "\\((" + amountPattern + ")\\s*(g|kg|ml|l|cups?|tbsp|tsp)(?=\\s|\\))",
          "gi",
        ),
        (_, a, u) => `(${number(fraction(a) * ratio)} ${u}`,
      );
  }
  function image(recipe) {
    const photo = recipe.photo || K.get("entry", recipe.id)?.photo;
    if (photo) return { src: "", path: photo, caption: "Your recipe photo" };
    if (
      recipe.image &&
      /^(data:image\/(?:jpeg|png|webp);base64,|https?:\/\/|assets\/)/.test(
        recipe.image,
      )
    )
      return {
        src: recipe.image,
        caption: recipe.imageCaption || "Your recipe photo",
      };
    if (recipe.id === "korean-beef-fried-rice")
      return {
        src: "assets/korean-beef-rice.jpg",
        caption: "AI-generated serving inspiration",
      };
    const generated = {
      "honey-chilli-tofu": "honey-chilli-tofu",
      "tomato-courgette-orzo": "tomato-orzo",
      "pumpkin-peanut-soup": "pumpkin-soup",
      "mushroom-risotto": "mushroom-risotto",
      "hazelnut-date-caramel-slices": "caramel-bars",
      "peanut-butter-date-caramel-slices": "caramel-bars",
    };
    if (generated[recipe.id])
      return {
        src: `assets/${generated[recipe.id]}.jpg`,
        caption: "AI-generated serving inspiration",
      };
    const text = `${recipe.title} ${recipe.tags.join(" ")}`.toLowerCase();
    const category = /brownie|chocolate|caramel|snickers/.test(text)
      ? "chocolate"
      : /pancake|french toast/.test(text)
        ? "pancakes"
        : /salmon/.test(text)
          ? "salmon"
          : /burger/.test(text)
            ? "burger"
            : /soup|ramen|stew/.test(text)
              ? "soup"
              : /pasta|orzo|lasagn|gnocchi|mac &|carbonara|mafaldine/.test(text)
                ? "pasta"
                : /salad|spring roll/.test(text)
                  ? "salad"
                  : /rice|risotto|tofu|chicken|chickpea/.test(text) &&
                      recipe.category === "main"
                    ? "bowl"
                    : null;
    return category
      ? {
          src: `assets/${category === "soup" ? "pumpkin-soup" : category}.jpg`,
          caption:
            category === "soup"
              ? "AI-generated serving inspiration"
              : "Serving inspiration · Unsplash",
        }
      : null;
  }
  function art(recipe, eager = false) {
    const photo = image(recipe);
    return photo
      ? `<img ${photo.path ? `data-photo-path="${html(photo.path)}"` : `src="${html(photo.src)}"`} alt="${html(photo.caption === "Your recipe photo" ? recipe.title : "Illustrative food photograph")}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><span class="image-credit">${html(photo.caption)}</span>`
      : `<div class="recipe-no-photo"><span class="food-mark" aria-hidden="true">✳</span><small>From Anna’s recipe box</small></div>`;
  }
  async function hydratePhotos() {
    for (const img of document.querySelectorAll("img[data-photo-path]")) {
      const path = img.dataset.photoPath;
      const url = await K.photoUrl(path);
      if (url && img.isConnected && img.dataset.photoPath === path)
        img.src = url;
    }
  }
  const saved = (id) => Boolean(K.get("favourite", id));
  let current = null,
    wakeLock = null,
    cooking = false,
    cookIndex = 0;
  async function releaseWake() {
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch {}
      wakeLock = null;
    }
  }
  async function requestWake() {
    if (!cooking || !navigator.wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      document
        .querySelector(".wake-status")
        ?.replaceChildren(
          document.createTextNode("Screen stays awake while cooking."),
        );
    } catch {
      document
        .querySelector(".wake-status")
        ?.replaceChildren(
          document.createTextNode(
            "Keep your screen awake using your device settings.",
          ),
        );
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && cooking) requestWake();
  });
  const recipeDialog = document.querySelector("#recipe-dialog");
  recipeDialog?.addEventListener("close", () => {
    cooking = false;
    releaseWake();
    if (location.hash.startsWith("#recipe="))
      history.replaceState(null, "", location.pathname + location.search);
    document.body.classList.toggle(
      "dialog-open",
      Boolean(document.querySelector("dialog[open]")),
    );
  });
  function openRecipe(recipe, options = {}) {
    current = {
      recipe,
      options,
      servings: Number(recipe.servings) || null,
      checked: new Set(),
      tab: "ingredients",
      noteSnapshot: JSON.stringify(metadata(recipe.id)),
    };
    cooking = false;
    releaseWake();
    renderRecipe();
    if (!recipeDialog.open) recipeDialog.showModal();
    recipeDialog.scrollTop = 0;
    document.body.classList.add("dialog-open");
    history.replaceState(null, "", "#recipe=" + encodeURIComponent(recipe.id));
  }
  function ingredientMarkup(recipe, ratio, checked) {
    return recipe.ingredients
      .map(
        (line, i) =>
          `<li class="ingredient-item"><label><input type="checkbox" data-ingredient="${i}" ${checked.has(i) ? "checked" : ""}><span>${html(scaleIngredient(line, ratio))}</span></label></li>`,
      )
      .join("");
  }
  function bindIngredients(root) {
    root
      .querySelectorAll("[data-ingredient]")
      .forEach((input) =>
        input.addEventListener("change", () =>
          input.checked
            ? current.checked.add(Number(input.dataset.ingredient))
            : current.checked.delete(Number(input.dataset.ingredient)),
        ),
      );
  }
  function renderRecipe() {
    const { recipe: r, servings, checked, options, tab } = current;
    const base = Number(r.servings) || null,
      ratio = base ? servings / base : 1;
    const notes = current.draft || metadata(r.id),
      lists = collections(),
      isSaved = saved(r.id);
    document.querySelector("#dialog-content").innerHTML = `
      <header class="recipe-cover"><div class="recipe-cover-copy"><p class="eyebrow">THE RECIPE BOX / ${html(r.category)}</p><h2 id="recipe-dialog-title">${html(r.title)}</h2><p>${html(r.description)}</p>
      <div class="recipe-actions"><button class="dialog-save ${isSaved ? "saved" : ""}" data-save-id="${html(r.id)}" aria-pressed="${isSaved}">${isSaved ? "♥ Saved to favourites" : "♡ Save recipe"}</button><button id="edit-recipe">Edit recipe</button><button id="plan-recipe">Add to plan ↗</button><button id="print-recipe">Print</button><button id="share-recipe">Copy link</button></div></div><div class="recipe-cover-image">${art(r, true)}</div></header>
      <div class="recipe-summary"><div><strong>${html(r.time)} minutes</strong>Total · as recorded</div><div><strong>${r.prepTime != null ? number(r.prepTime) + " min" : "Not recorded"}</strong>Preparation</div><div><strong>${r.cookTime != null ? number(r.cookTime) + " min" : "Not recorded"}</strong>Cooking</div><div><strong>${base ? `${servings} serving${servings === 1 ? "" : "s"}` : "Yield not recorded"}</strong>${base ? "Adjust below to suit your table" : "Original quantities shown"}</div></div>
      <nav class="recipe-tabs" aria-label="Recipe sections"><button class="${tab === "ingredients" ? "active" : ""}" data-tab="ingredients" aria-pressed="${tab === "ingredients"}">Ingredients</button><button class="${tab === "method" ? "active" : ""}" data-tab="method" aria-pressed="${tab === "method"}">Method & notes</button></nav>
      <div class="recipe-detail-body" data-tab="${tab}"><aside class="ingredients-pane"><div class="ingredient-heading"><h3>Ingredients</h3><div class="serving-control"><button id="less-servings" aria-label="Decrease servings" ${!base || servings <= 1 ? "disabled" : ""}>−</button><span aria-live="polite">${servings || "—"}</span><button id="more-servings" aria-label="Increase servings" ${!base || servings >= 48 ? "disabled" : ""}>+</button></div></div><p class="form-hint">${base ? `For ${servings} serving${servings === 1 ? "" : "s"}. Tick off as you go. ${ratio !== 1 ? "Quantities scaled from the original recipe; season to taste." : ""}` : "Serving size is missing. Add it in Edit recipe to scale quantities."}</p><ul class="ingredient-list">${ingredientMarkup(r, ratio, checked)}</ul>
      ${r.note ? `<div class="recipe-note"><strong>From the recipe notebook</strong>${html(r.note)}</div>` : ""}
      <div class="nutrition-block nutrition-only"><div class="nutrition-heading"><h3>Nutrition</h3><select id="nutrition-basis" aria-label="Nutrition basis"><option value="serving">Per serving</option><option value="batch" ${!base ? "disabled" : ""}>Whole batch</option></select></div><div class="macro-grid" id="macro-grid"></div><p class="nutrition-disclaimer">Recorded values, not independently verified. May be estimates; see the recipe notebook for source details. Missing values are shown as —. Batch totals multiply recorded per-serving values. Substitutions require updated nutrition.</p></div></aside>
      <section class="method-pane"><div class="method-heading"><h3>Let’s make it.</h3><button class="small-button" id="start-cooking">Start cooking ↗</button></div><ol class="dialog-steps">${r.steps.map((step) => `<li>${html(step)}</li>`).join("")}</ol>
      <div class="personal-notes"><p class="eyebrow">MAKE IT YOURS</p><h3>Your kitchen notes</h3><label for="personal-note">What worked, what you’d change</label><textarea id="personal-note" rows="3" placeholder="A little more lemon next time…">${html(notes.note || "")}</textarea><label for="personal-subs">Modifications & substitutions</label><textarea id="personal-subs" rows="2" placeholder="Swapped cream for oat cream…">${html(notes.substitutions || "")}</textarea><label for="personal-tags">Personal tags (comma separated)</label><input id="personal-tags" value="${html((notes.tags || []).join(", "))}" placeholder="make again, freezer-friendly"><label for="recipe-collection">Keep in a collection</label><select id="recipe-collection"><option value="">Choose a collection…</option>${Object.keys(
        lists,
      )
        .map(
          (name) =>
            `<option value="${html(name)}" ${lists[name].includes(r.id) ? "selected" : ""}>${html(name)}</option>`,
        )
        .join(
          "",
        )}</select><button class="text-button" id="new-collection">+ Create collection</button><button class="small-button" id="add-to-collection">Add to collection</button><p class="form-hint" id="collection-memberships">In: ${html(
        Object.keys(lists)
          .filter((k) => lists[k].includes(r.id))
          .join(", ") || "No collections yet",
      )}</p><button class="text-button" id="remove-from-collection">Remove from selected collection</button><br><button class="small-button save-note" id="save-note">Save my notes</button><p class="form-hint">Your kitchen saves on this device as a guest, or privately to your account when signed in.</p></div></section></div>
      <section class="related-section"><p class="eyebrow">ANOTHER DAY, ANOTHER GOOD DINNER</p><h3>You might also like</h3><div class="related-list">${recipes
        .filter((x) => x.id !== r.id && x.category === r.category)
        .sort(
          (a, b) =>
            b.tags.filter((t) => r.tags.includes(t)).length -
            a.tags.filter((t) => r.tags.includes(t)).length,
        )
        .slice(0, 3)
        .map(
          (x) =>
            `<a href="#recipe=${encodeURIComponent(x.id)}" data-related="${html(x.id)}">${html(x.title)}<small>${x.time} minutes ↗</small></a>`,
        )
        .join("")}</div></section>`;
    const root = document.querySelector("#dialog-content");
    root.querySelector(".dialog-save").onclick = async (event) => {
      if (options.toggleFavourite)
        await options.toggleFavourite(r, event.currentTarget);
      else {
        const ids = new Set(read("annaRecipeFavourites", []));
        ids.has(r.id) ? ids.delete(r.id) : ids.add(r.id);
        if (await write("annaRecipeFavourites", [...ids])) {
          event.currentTarget.textContent = ids.has(r.id)
            ? "♥ Saved to favourites"
            : "♡ Save recipe";
          event.currentTarget.setAttribute("aria-pressed", ids.has(r.id));
          document
            .querySelectorAll("[data-favourite-count]")
            .forEach((el) => (el.textContent = ids.size));
          notify("Favourites updated on this device");
        }
      }
    };
    root.querySelector("#less-servings").onclick = () => {
      current.servings--;
      renderRecipe();
    };
    root.querySelector("#more-servings").onclick = () => {
      current.servings++;
      renderRecipe();
    };
    bindIngredients(root);
    root.querySelectorAll("button[data-tab]").forEach(
      (button) =>
        (button.onclick = () => {
          current.tab = button.dataset.tab;
          root.querySelector(".recipe-detail-body").dataset.tab = current.tab;
          root.querySelectorAll("button[data-tab]").forEach((b) => {
            if (b.tagName === "BUTTON") {
              b.classList.toggle("active", b === button);
              b.setAttribute("aria-pressed", b === button);
            }
          });
        }),
    );
    root.querySelector("#start-cooking").onclick = () => {
      cooking = true;
      cookIndex = 0;
      renderCook();
      requestWake();
      recipeDialog.scrollTop = 0;
    };
    root.querySelector("#edit-recipe").onclick = () => {
      if (!document.querySelector("#custom-recipe-dialog")) {
        location.href = `index.html?edit=${encodeURIComponent(r.id)}`;
        return;
      }
      recipeDialog.close();
      openEditor(r);
    };
    root.querySelector("#plan-recipe").onclick = () =>
      (location.href = `planner.html?add=${encodeURIComponent(r.id)}&servings=${servings || base || 1}`);
    root.querySelector("#print-recipe").onclick = () => window.print();
    root.querySelector("#share-recipe").onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        notify("Recipe link copied");
      } catch {
        notify("Copy the recipe link from your address bar");
      }
    };
    for (const id of ["personal-note", "personal-subs", "personal-tags"])
      root.querySelector("#" + id).oninput = () => {
        current.draft = {
          note: root.querySelector("#personal-note").value,
          substitutions: root.querySelector("#personal-subs").value,
          tags: root
            .querySelector("#personal-tags")
            .value.split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      };
    root.querySelector("#save-note").onclick = async () => {
      const all = {};
      all[r.id] = {
        note: root.querySelector("#personal-note").value,
        substitutions: root.querySelector("#personal-subs").value,
        tags: root
          .querySelector("#personal-tags")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (JSON.stringify(metadata(r.id)) !== current.noteSnapshot) {
        notify(
          "These notes changed elsewhere. Copy your draft, then reopen the recipe to review the latest notes.",
        );
        return;
      }
      const draft = all[r.id],
        button = root.querySelector("#save-note");
      button.disabled = true;
      try {
        await K.set(
          "entry",
          r.id,
          {
            ...K.get("entry", r.id),
            notes: draft.note,
            substitutions: draft.substitutions,
            tags: draft.tags,
          },
          K.version("entry", r.id),
        );
        if (current?.recipe.id === r.id)
          current.noteSnapshot = JSON.stringify(metadata(r.id));
        notify("Kitchen notes saved");
      } catch (error) {
        notify(K.errorMessage(error));
      } finally {
        button.disabled = false;
      }
    };
    root.querySelector("#new-collection").onclick = () =>
      openCollectionDialog(r.id, () => renderRecipe());
    root.querySelector("#add-to-collection").onclick = async () => {
      const name = root.querySelector("#recipe-collection").value;
      if (!name) {
        notify("Choose or create a collection first");
        return;
      }
      const lists = collections();
      lists[name] = [...new Set([...(lists[name] || []), r.id])];
      if (await write("annaCollections", lists)) {
        notify(`Added to ${name}`);
        refreshCollections();
        renderRecipe();
      }
    };
    root.querySelector("#remove-from-collection").onclick = async () => {
      const name = root.querySelector("#recipe-collection").value;
      if (!name) return;
      const lists = collections();
      lists[name] = (lists[name] || []).filter((id) => id !== r.id);
      if (await write("annaCollections", lists)) {
        notify("Removed from collection");
        refreshCollections();
        renderRecipe();
      }
    };
    root.querySelectorAll("[data-related]").forEach(
      (a) =>
        (a.onclick = (e) => {
          e.preventDefault();
          openRecipe(
            recipes.find((x) => x.id === a.dataset.related),
            options,
          );
        }),
    );
    hydratePhotos();
    const nutritionBasis = root.querySelector("#nutrition-basis");
    nutritionBasis.onchange = () => {
      const multiplier = nutritionBasis.value === "batch" ? servings || 1 : 1;
      root.querySelector("#macro-grid").innerHTML = [
        ["calories", "kcal", ""],
        ["protein", "Protein", "g"],
        ["carbs", "Carbs", "g"],
        ["fat", "Fat", "g"],
        ["fiber", "Fibre", "g"],
      ]
        .map(
          ([key, label, unit]) =>
            `<div><strong>${r[key] == null ? "—" : number(r[key] * multiplier) + unit}</strong>${label}</div>`,
        )
        .join("");
    };
    nutritionBasis.onchange();
  }
  function renderCook() {
    const { recipe: r, servings, checked } = current;
    const content = document.querySelector("#dialog-content");
    content.innerHTML = `<section class="cook-panel"><div class="cook-top"><h2 id="recipe-dialog-title">${html(r.title)}</h2><button class="small-button" id="exit-cooking">Exit cooking mode</button></div><div class="cook-progress" aria-hidden="true"><span style="width:${((cookIndex + 1) / r.steps.length) * 100}%"></span></div><div class="cook-step"><p class="eyebrow" role="status" aria-live="polite">STEP ${cookIndex + 1} OF ${r.steps.length}</p><p class="cook-step-text" tabindex="-1">${html(r.steps[cookIndex])}</p><div class="cook-controls"><button class="small-button" id="previous-step" ${cookIndex === 0 ? "disabled" : ""}>← Previous</button><button class="primary-button" id="next-step">${cookIndex === r.steps.length - 1 ? "Finish cooking ✓" : "Next step →"}</button></div><p class="wake-status">${wakeLock ? "Screen stays awake while cooking." : "Screen-awake support depends on your browser. Keep this tab open."}</p><details class="cook-ingredients"><summary>Ingredients · ${servings || "original"} ${servings ? "servings" : "quantities"}</summary><ul class="ingredient-list">${ingredientMarkup(r, r.servings ? servings / r.servings : 1, checked)}</ul></details></div></section>`;
    content.querySelector("#previous-step").onclick = () => {
      cookIndex--;
      renderCook();
      content.querySelector(".cook-step-text").focus();
    };
    content.querySelector("#next-step").onclick = () => {
      if (cookIndex < r.steps.length - 1) {
        cookIndex++;
        renderCook();
        content.querySelector(".cook-step-text").focus();
      } else {
        cooking = false;
        releaseWake();
        current.tab = "method";
        renderRecipe();
        notify("Made with love. Enjoy every bite.");
      }
    };
    content.querySelector("#exit-cooking").onclick = () => {
      cooking = false;
      releaseWake();
      current.tab = "method";
      renderRecipe();
    };
    bindIngredients(content);
  }
  function openCollectionDialog(recipeId, done) {
    let modal = document.querySelector("#collection-dialog");
    if (!modal) {
      modal = document.createElement("dialog");
      modal.id = "collection-dialog";
      modal.style.maxWidth = "460px";
      document.body.append(modal);
    }
    modal.innerHTML =
      '<form class="account-panel"><p class="eyebrow">A PLACE FOR YOUR FAVOURITES</p><h2>A new collection</h2><label class="form-hint" for="collection-name">Collection name</label><input id="collection-name" required maxlength="60" placeholder="Sunday suppers"><div class="editor-footer" style="margin-top:20px"><button class="primary-button">Create collection</button><button type="button" class="text-button">Cancel</button></div></form>';
    modal.querySelector("button[type=button]").onclick = () => modal.close();
    modal.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const name = modal.querySelector("input").value.trim();
      if (!name) return;
      const lists = collections();
      if (Object.hasOwn(lists, name)) {
        notify("A collection with that name already exists");
        return;
      }
      Object.defineProperty(lists, name, {
        value: recipeId ? [recipeId] : [],
        enumerable: true,
        writable: true,
        configurable: true,
      });
      if (await write("annaCollections", lists)) {
        modal.close();
        refreshCollections();
        done?.();
        notify("Collection created");
      }
    };
    modal.showModal();
  }
  function refreshCollections() {
    const select = document.querySelector(
      "#advanced-filters #collection-filter",
    );
    if (!select) return;
    const value = select.value;
    select.innerHTML =
      '<option value="">All collections</option>' +
      Object.keys(collections())
        .map((name) => `<option value="${html(name)}">${html(name)}</option>`)
        .join("");
    select.value = value;
  }
  let editingPhotoPath = null,
    editingVersion = 0,
    editingId = null,
    editorPhoto = "",
    photoCaption = "",
    photoBusy = false;
  const editor = document.querySelector("#custom-recipe-dialog");
  if (editor) {
    editor.setAttribute("aria-labelledby", "editor-title");
    editor.innerHTML = `<button class="dialog-close" id="custom-recipe-close" type="button" aria-label="Close recipe editor">×</button><form class="custom-recipe-form" id="custom-recipe-form"><p class="eyebrow">YOUR PERSONAL COOKBOOK</p><h2 id="editor-title">Something worth keeping.</h2><div class="custom-form-grid">
    <label class="full">Recipe name<input name="title" required maxlength="180" placeholder="The pasta everyone asks for"></label><label class="full">A little introduction<textarea name="description" rows="2" placeholder="Where it came from. Why you love it."></textarea></label>
    <label>Meal type<select name="category"><option value="main">Main meal</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="snack">Snack</option><option value="sweet">Sweet</option><option value="side">Side</option></select></label><label>Servings<input name="servings" type="number" min="1" max="48" step="1" placeholder="e.g. 2"></label>
    <label>Total time (minutes)<input name="time" type="number" required min="1" max="10080" placeholder="e.g. 30"></label><label>Preparation time (optional)<input name="prepTime" type="number" min="0" max="10080"></label><label>Cooking time (optional)<input name="cookTime" type="number" min="0" max="10080"></label>
    <label class="full">Recipe photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><span class="form-hint">JPEG, PNG or WebP, up to 8 MB. Saved with your recipe.</span><img class="photo-preview" id="photo-preview" alt="Your selected recipe photo" hidden><button class="text-button" id="remove-photo" type="button">Remove photo</button></label>
    <p class="editor-section">The good stuff.</p><label class="full">Ingredients<textarea name="ingredients" required rows="7" placeholder="200 g pasta\n1 tbsp olive oil\n2 garlic cloves, minced"></textarea><span class="form-hint">One ingredient per line, with its quantity. Commas stay in the ingredient. Amounts should be for the full batch.</span></label><label class="full">Method<textarea name="steps" required rows="7" placeholder="One clear instruction per line."></textarea></label>
    <label class="full">Recipe tags<input name="tags" placeholder="vegetarian, meal prep, comfort food"><span class="form-hint">Separate tags with commas. Dietary filters use these tags.</span></label><label class="full">Source & recipe notes<textarea name="note" rows="3" placeholder="Source, tips, or any uncertainty about the quantities or nutrition."></textarea></label>
    <p class="editor-section nutrition-only">Nutrition, if you have it.</p><p class="form-hint full nutrition-only">Values per serving. Leave unknown values blank. These will be displayed as recorded values, not verified calculations.</p>${[
      ["calories", "Calories (kcal)"],
      ["protein", "Protein (g)"],
      ["carbs", "Carbohydrates (g)"],
      ["fat", "Fat (g)"],
      ["fiber", "Fibre (g)"],
    ]
      .map(
        ([name, label]) =>
          `<label class="nutrition-only">${label}<input name="${name}" type="number" min="0" step="any"></label>`,
      )
      .join(
        "",
      )}</div><div class="editor-footer"><button class="primary-button" type="submit">Save recipe ↗</button><button class="text-button" id="cancel-editor" type="button">Cancel</button><button class="danger-button" id="delete-recipe" type="button" hidden>Delete this recipe</button></div><p class="form-hint" id="editor-status" role="status">Saved on this device as a guest, or privately to your signed-in account.</p></form>`;
    editor.querySelector("[name=photo]").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      ) {
        notify("Choose a JPEG, PNG or WebP under 8 MB");
        e.target.value = "";
        return;
      }
      photoBusy = true;
      editor.querySelector("[type=submit]").disabled = true;
      try {
        if (K.user) {
          editingPhotoPath = await K.upload(file);
          editorPhoto = await K.photoUrl(editingPhotoPath);
          photoCaption = "Your recipe photo";
          updatePhoto();
          return;
        }
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#f6f3eb";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        editorPhoto = canvas.toDataURL("image/jpeg", 0.78);
        photoCaption = "Your recipe photo";
        bitmap.close();
        updatePhoto();
      } catch {
        notify("This photo could not be read. Try another image.");
      } finally {
        photoBusy = false;
        editor.querySelector("[type=submit]").disabled = false;
      }
    };
    editor.querySelector("#remove-photo").onclick = () => {
      editorPhoto = "";
      editingPhotoPath = null;
      photoCaption = "";
      editor.querySelector("[name=photo]").value = "";
      updatePhoto();
    };
    editor.querySelector("#cancel-editor").onclick = () => editor.close();
    editor.querySelector("#delete-recipe").onclick = async () => {
      const button = editor.querySelector("#delete-recipe");
      if (button.dataset.confirm !== "yes") {
        button.dataset.confirm = "yes";
        button.textContent = "Confirm delete";
        return;
      }
      try {
        await window.AnnaCustomRecipes.remove(editingId);
        editor.close();
        notify("Recipe deleted. Cooking memories are retained.");
      } catch (error) {
        notify(K.errorMessage(error));
      }
    };
  }
  function updatePhoto() {
    const preview = editor.querySelector("#photo-preview");
    preview.hidden = !editorPhoto;
    if (editorPhoto) preview.src = editorPhoto;
    else preview.removeAttribute("src");
  }
  function openEditor(recipe = null) {
    editingId = recipe?.id || null;
    editingVersion = recipe
      ? K.version(recipe.isCustom ? "recipe" : "entry", recipe.id)
      : 0;
    editingPhotoPath = recipe?.photo || null;
    editorPhoto = recipe?.image || "";
    photoCaption = recipe?.imageCaption || "";
    const form = editor.querySelector("form");
    form.reset();
    editor.querySelector("#editor-title").textContent = recipe
      ? "A little fine-tuning."
      : "Something worth keeping.";
    if (recipe) {
      for (const el of form.elements) {
        if (!el.name || el.type === "file") continue;
        const value = recipe[el.name];
        el.value = Array.isArray(value)
          ? value.join(el.name === "tags" ? ", " : "\n")
          : (value ?? "");
      }
    }
    updatePhoto();
    const del = editor.querySelector("#delete-recipe");
    del.hidden = !recipe?.isCustom;
    del.dataset.confirm = "";
    del.textContent = "Delete this recipe";
    editor.showModal();
    document.body.classList.add("dialog-open");
  }
  async function saveEditor() {
    if (photoBusy) return null;
    const form = editor.querySelector("form"),
      data = Object.fromEntries(new FormData(form));
    const existing = recipes.find((r) => r.id === editingId);
    const r = {
      ...existing,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      ingredients: data.ingredients
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      steps: data.steps
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      tags: data.tags
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      note: data.note.trim(),
      image: K.user ? "" : editorPhoto,
      photo: editingPhotoPath,
      imageCaption: photoCaption,
      equipment: existing?.equipment || [],
    };
    for (const key of [
      "time",
      "servings",
      "prepTime",
      "cookTime",
      "calories",
      "protein",
      "carbs",
      "fat",
      "fiber",
    ])
      r[key] = data[key] === "" ? null : Number(data[key]);
    if (!r.title || !r.ingredients.length || !r.steps.length) {
      notify("Add a name, ingredients and at least one step");
      return null;
    }
    if (existing && !existing.isCustom) {
      await K.set(
        "entry",
        existing.id,
        { ...K.get("entry", existing.id), recipeEdit: r },
        editingVersion,
      );
      Object.assign(existing, r);
      return existing;
    }
    if (existing?.isCustom) {
      const normalized = window.AnnaCustomRecipes.normalize({
        ...r,
        id: editingId,
      });
      await K.set("recipe", editingId, normalized, editingVersion);
      return normalized;
    }
    return await window.AnnaCustomRecipes.add({
      ...r,
      id: editingId || undefined,
    });
  }
  // Conservative quantity consolidation: merge exact ingredient names and compatible units only.
  function groceryEntries(meals) {
    const grouped = new Map();
    for (const { recipe, servings } of meals) {
      const ratio =
        recipe.servings && Number(servings) > 0
          ? servings / recipe.servings
          : 1;
      for (const source of recipe.ingredients) {
        const line = scaleIngredient(source, ratio)
          .replace(/^[^:]+:\s*/, "")
          .trim();
        const match = line.match(
          new RegExp(
            "^(" +
              amountPattern +
              ")\\s*(kg|g|ml|l|litres?|liters?|tbsp|tsp|cups?)\\b\\s*(.+)$",
            "i",
          ),
        );
        let key, entry;
        if (match) {
          let amount = fraction(match[1]),
            unit = match[2].toLowerCase(),
            name = match[3].trim();
          if (unit === "kg") {
            unit = "g";
            amount *= 1000;
          }
          if (["l", "litre", "litres", "liter", "liters"].includes(unit)) {
            unit = "ml";
            amount *= 1000;
          }
          if (unit === "cups") unit = "cup";
          key = `${unit}|${name.toLowerCase()}`;
          entry = { name, amount, unit, count: 1 };
        } else {
          const count = line.match(
            new RegExp("^(" + amountPattern + ")\\s+(.+)$"),
          );
          if (count && !/^\d|%|–|-/.test(count[2])) {
            key = "count|" + count[2].toLowerCase();
            entry = {
              name: count[2],
              amount: fraction(count[1]),
              unit: "",
              count: 1,
            };
          } else {
            key = "raw|" + line.toLowerCase();
            entry = { name: line, amount: null, unit: "", count: 1 };
          }
        }
        if (grouped.has(key)) {
          const old = grouped.get(key);
          old.count++;
          if (entry.amount !== null) old.amount += entry.amount;
        } else grouped.set(key, entry);
      }
    }
    const category = (name) =>
      /chicken|beef|salmon|tuna|shrimp|prawn|chorizo|pork|koolvis|meat|spekjes/.test(
        name,
      )
        ? "Meat & fish"
        : /yogurt|yoghurt|milk|cream|cheese|feta|burrata|parmesan|halloumi|egg|butter\b/.test(
              name,
            ) && !/peanut|cocoa/.test(name)
          ? "Dairy & eggs"
          : /onion|garlic|carrot|tomato|spinach|courgette|zucchini|lemon|lime|aubergine|potato|pepper|mushroom|broccoli|cucumber|lettuce|banana|berry|berries|mango|pumpkin|ginger|coriander|parsley/.test(
                name,
              ) && !/powder|sauce|paste|dried|canned/.test(name)
            ? "Fruit & vegetables"
            : "Pantry & other";
    return [...grouped.entries()]
      .map(([key, x]) => ({
        ...x,
        key,
        category: category(x.name.toLowerCase()),
        text:
          x.amount !== null
            ? `${number(x.amount)}${x.unit ? " " + x.unit : ""} ${x.name}`
            : `${x.name}${x.count > 1 ? " × " + x.count + " uses" : ""}`,
      }))
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      );
  }
  const recordKinds = [
    "favourite",
    "recipe",
    "entry",
    "history",
    "collection",
    "meal",
    "grocery",
    "profile",
  ];
  document.querySelector("#export-kitchen")?.addEventListener("click", () => {
    if (!K.ready) {
      notify("Wait until your kitchen finishes loading");
      return;
    }
    const backup = {
      format: "annas-kitchen",
      version: 3,
      exportedAt: new Date().toISOString(),
      records: recordKinds.flatMap((kind) =>
        K.list(kind).map(({ kind, id, data }) => ({ kind, id, data })),
      ),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "annas-kitchen-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify("Backup exported. Private photo files stay in your account.");
  });
  document
    .querySelector("#import-kitchen")
    ?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (!K.ready) throw Error("Wait until your kitchen finishes loading");
        if (file.size > 25 * 1024 * 1024) throw Error("File too large");
        const backup = JSON.parse(await file.text());
        if (
          backup.format !== "annas-kitchen" ||
          backup.version !== 3 ||
          !Array.isArray(backup.records)
        )
          throw Error("Not a current kitchen backup");
        const changes = [];
        for (const row of backup.records) {
          if (
            !row ||
            !recordKinds.includes(row.kind) ||
            typeof row.id !== "string" ||
            !row.id.length ||
            row.id.length > 240 ||
            !row.data ||
            typeof row.data !== "object" ||
            Array.isArray(row.data)
          )
            throw Error("Invalid backup record");
          if (JSON.stringify(row.data).length > 524288)
            throw Error("Backup record too large");
          if (
            row.kind === "recipe" &&
            (!row.data.title ||
              !Array.isArray(row.data.ingredients) ||
              !Array.isArray(row.data.steps) ||
              !Array.isArray(row.data.tags))
          )
            throw Error("Invalid recipe");
          if (K.version(row.kind, row.id) > 0) continue;
          const data = structuredClone(row.data);
          if (
            data.photo &&
            (!K.user || !data.photo.startsWith(K.user.id + "/"))
          )
            delete data.photo;
          changes.push({ kind: row.kind, id: row.id, data });
        }
        for (let i = 0; i < changes.length; i += 80)
          await saveChanges(changes.slice(i, i + 80));
        notify(
          `Imported ${changes.length} new records. Existing records were kept.`,
        );
      } catch (error) {
        notify("Could not import this backup: " + K.errorMessage(error));
      } finally {
        e.target.value = "";
      }
    });
  document.addEventListener(
    "close",
    () => {
      if (!document.querySelector("dialog[open]"))
        document.body.classList.remove("dialog-open");
    },
    true,
  );
  Object.assign(K, {
    html,
    read,
    write,
    notify,
    art,
    image,
    scaleIngredient,
    groceryEntries,
    openRecipe,
    openEditor,
    saveEditor,
    collections,
    metadata,
    refreshCollections,
    openCollectionDialog,
    originals,
    hydratePhotos,
  });
  let activeOwner = K.user?.id;
  window.addEventListener("kitchen:change", () => {
    if (activeOwner !== K.user?.id) {
      activeOwner = K.user?.id;
      recipeDialog?.close();
      document.querySelector("#dialog-content")?.replaceChildren();
      editor?.close();
      current = null;
    }
    hydratePhotos();
  });
  refreshCollections();
})();
