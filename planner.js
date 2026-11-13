/* Weekly planner on the existing private/guest data boundary. */
(() => {
  const K = window.AnnaKitchen,
    escape = K.html;
  const batch = (changes) =>
    K.batch(changes.map((c) => ({ deleted: false, ...c })));
  const $ = (selector) => document.querySelector(selector);
  const slots = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const startOfWeek = (value) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (d.getDay() || 7) + 1);
    return d;
  };
  const addDays = (value, n) => {
    const d = new Date(value);
    d.setDate(d.getDate() + n);
    return d;
  };
  const dateKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shortDate = new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }),
    dayName = new Intl.DateTimeFormat("en", { weekday: "short" });
  const fullDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const recipeById = (id) => recipes.find((r) => r.id === id);
  let week = startOfWeek(new Date()),
    selected = null,
    undo = null,
    owner = K.user?.id;
  const params = new URLSearchParams(location.search),
    incomingId = params.get("add");
  let incoming = recipeById(incomingId),
    incomingConsumed = false;
  const incomingServings = Math.max(
    1,
    Math.min(48, Number(params.get("servings")) || 1),
  );
  const dates = () => Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const slotKey = (date, slot) => `${date}|${slot}`;
  function meals() {
    return dates().flatMap((date) =>
      slots
        .map((slot) => {
          const key = slotKey(dateKey(date), slot),
            data = K.get("meal", key),
            recipe = recipeById(data?.recipe_id);
          return recipe
            ? {
                key,
                recipe,
                servings: data.servings || recipe.servings || 1,
                date,
                slot,
              }
            : null;
        })
        .filter(Boolean),
    );
  }
  function remember() {
    undo = {
      week: dateKey(week),
      entries: K.list("meal").filter((r) =>
        dates().some((d) => r.id.startsWith(dateKey(d) + "|")),
      ),
    };
    $("#undo-plan").hidden = false;
  }
  async function perform(fn, message) {
    try {
      await fn();
      if (message) K.notify(message);
      return true;
    } catch (error) {
      K.notify(K.errorMessage(error));
      return false;
    }
  }
  function render() {
    incoming = incomingConsumed ? null : recipeById(incomingId);
    ensureIncoming();
    const weekDates = dates();
    $("#planner-week-title").textContent =
      `${shortDate.format(week)} – ${shortDate.format(weekDates[6])}`;
    $("#planner-week-subtitle").textContent = incoming
      ? `Choose a slot for ${incoming.title}.`
      : "A little room for good food. Choose any meal to get started.";
    $("#planner-save-status").textContent = K.status;
    $("#calendar-grid").setAttribute("aria-busy", String(!K.ready));
    for (const id of [
      "organize-week",
      "clear-week",
      "save-template",
      "reuse-template",
    ])
      $("#" + id).disabled = !K.ready;
    const extra = $(".grocery-form button");
    if (extra) extra.disabled = !K.ready;
    $("#calendar-grid").replaceChildren(...weekDates.map(renderDay));
    $("#undo-plan").hidden = !undo || undo.week !== dateKey(week);
    renderSummary();
    refreshTemplates();
  }
  function renderDay(date) {
    const key = dateKey(date),
      section = document.createElement("section");
    section.className =
      "calendar-day" + (key === dateKey(new Date()) ? " is-today" : "");
    section.innerHTML = `<div class="day-header"><span class="day-name">${dayName.format(date)}</span><span class="day-date">${date.getDate()}</span></div><div class="day-meals"></div>`;
    for (const slot of slots) {
      const id = slotKey(key, slot),
        data = K.get("meal", id),
        r = recipeById(data?.recipe_id),
        cell = document.createElement("div");
      cell.className = "meal-slot" + (r ? " has-meal" : "");
      const choice = document.createElement("button");
      choice.className = "meal-choice";
      choice.id = `meal-${key}-${slot}`;
      choice.type = "button";
      choice.disabled = !K.ready;
      choice.setAttribute(
        "aria-label",
        `${slot} on ${key}: ${r ? r.title + ". Change recipe" : "Add a recipe"}`,
      );
      choice.innerHTML = `<span class="slot-label">${slot}</span>${r ? `<span class="slot-meal"><strong>${escape(r.title)}</strong><span>${r.time} min</span></span>` : '<span class="slot-empty"><span aria-hidden="true">+</span>Add meal</span>'}`;
      choice.onclick = () => selectSlot(key, slot);
      cell.append(choice);
      if (r) {
        const remove = document.createElement("button");
        remove.className = "slot-remove";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute(
          "aria-label",
          `Remove ${r.title} from ${slot} on ${key}`,
        );
        remove.onclick = () =>
          perform(async () => {
            remember();
            await K.remove("meal", id);
          }, "Meal removed");
        cell.append(remove);
        const label = document.createElement("div");
        label.className = "slot-servings";
        label.innerHTML = `Servings <input type="number" min="1" max="48" step="1" value="${data.servings || r.servings || 1}" aria-label="Servings for ${escape(r.title)} on ${key} at ${slot}">`;
        const input = label.querySelector("input");
        input.inputMode = "numeric";
        const apply = document.createElement("button");
        apply.type = "button";
        apply.className = "slot-servings-apply";
        apply.textContent = "Update servings";
        apply.hidden = true;
        apply.setAttribute(
          "aria-label",
          `Update servings for ${r.title} on ${key} at ${slot}`,
        );
        label.append(apply);
        let saving = false;
        const updateServings = async () => {
          const value = Number(input.value);
          if (!Number.isInteger(value) || value < 1 || value > 48) {
            input.setAttribute("aria-invalid", "true");
            K.notify("Choose a whole number of servings from 1 to 48.");
            return;
          }
          const currentMeal = K.get("meal", id);
          if (!currentMeal || currentMeal.recipe_id !== r.id) {
            render();
            return;
          }
          if (saving || value === (currentMeal.servings || r.servings || 1)) {
            apply.hidden = true;
            return;
          }
          saving = true;
          apply.disabled = true;
          await perform(async () => {
            remember();
            await K.set("meal", id, { ...currentMeal, servings: value });
          });
          saving = false;
          apply.disabled = false;
        };
        input.oninput = () => {
          input.removeAttribute("aria-invalid");
          apply.hidden =
            Number(input.value) === (data.servings || r.servings || 1);
        };
        input.onchange = updateServings;
        input.onkeydown = (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            updateServings();
          }
        };
        apply.onclick = updateServings;
        cell.append(label);
      } else if (data?.recipe_id) {
        const missing = document.createElement("p");
        missing.className = "form-hint";
        missing.textContent =
          "Previous recipe unavailable. Choose a replacement.";
        cell.append(missing);
      }
      section.querySelector(".day-meals").append(cell);
    }
    return section;
  }
  async function selectSlot(date, slot) {
    if (!K.ready) {
      K.notify("Your kitchen is loading. Please try again in a moment.");
      return;
    }
    selected = { date, slot };
    if (incoming) {
      if (await assign(incoming.id, incomingServings)) {
        incomingConsumed = true;
        incoming = null;
        $("#incoming-meal")?.remove();
        history.replaceState(null, "", location.pathname);
        render();
      }
      return;
    }
    $("#planner-search").value = "";
    renderPicker();
    $("#recipe-picker-dialog").showModal();
    document.body.classList.add("dialog-open");
    $("#planner-search").focus();
  }
  async function assign(id, servings) {
    if (!selected) return;
    const target = { ...selected };
    return await perform(async () => {
      remember();
      await K.set("meal", slotKey(target.date, target.slot), {
        recipe_id: id,
        servings: servings || recipeById(id)?.servings || 1,
      });
      $("#recipe-picker-dialog").close();
      selected = null;
    }, "A good meal, planned.");
  }
  function renderPicker() {
    $("#picker-title").textContent = selected
      ? `A little something for ${selected.slot.toLowerCase()}.`
      : "Choose a recipe";
    $("#picker-helper").textContent = selected
      ? fullDate.format(new Date(selected.date + "T12:00:00"))
      : "Pick a recipe for your week.";
    const words = $("#planner-search").value.trim().toLowerCase().split(/\s+/);
    const matches = recipes.filter((r) =>
      words.every((word) =>
        [r.title, r.description, ...r.tags, ...r.ingredients]
          .join(" ")
          .toLowerCase()
          .includes(word),
      ),
    );
    $("#planner-recipe-list").replaceChildren(
      ...matches.map((r) => {
        const item = document.createElement("article");
        item.className = "picker-recipe";
        item.innerHTML = `<span class="picker-emoji" aria-hidden="true">✳</span><div><h3><button class="picker-preview">${escape(r.title)}</button></h3><p>${escape(r.description)}</p><span class="picker-meta"><span>${r.time} min</span><span>${r.category}</span><span class="nutrition-only">${r.protein == null ? "Protein not recorded" : r.protein + " g protein"}</span></span></div><button class="recipe-add-button" aria-label="Add ${escape(r.title)}">Add +</button>`;
        item.querySelector(".picker-preview").onclick = () => K.openRecipe(r);
        item.querySelector(".recipe-add-button").onclick = async (e) => {
          e.currentTarget.disabled = true;
          await assign(r.id);
          if (e.currentTarget) e.currentTarget.disabled = false;
        };
        return item;
      }),
    );
    if (!matches.length)
      $("#planner-recipe-list").innerHTML =
        '<p class="picker-empty">Nothing in the recipe box just yet. Try another ingredient.</p>';
  }
  function groceryItems() {
    const items = K.groceryEntries(meals());
    const manual = K.list("grocery").filter(
      (r) => r.data.manual && r.data.week === dateKey(week),
    );
    return [
      ...items,
      ...manual.map((r) => ({
        key: r.id,
        text: r.data.text,
        category: "A little extra",
        manual: true,
        id: r.id,
      })),
    ];
  }
  function groceryId(item) {
    if (item.manual) return item.id;
    let hash = 2166136261;
    for (const c of item.key + "|" + item.text) {
      hash ^= c.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `${dateKey(week)}|item-${(hash >>> 0).toString(16)}`;
  }
  function renderSummary() {
    const planned = meals();
    $("#planned-meal-count").textContent = `${planned.length} meals planned`;
    $("#weekly-summary").innerHTML = dates()
      .map((date) => {
        const daily = planned.filter((m) => dateKey(m.date) === dateKey(date));
        const macro = (key) =>
          !daily.length || daily.some((m) => m.recipe[key] == null)
            ? "—"
            : Math.round(
                daily.reduce((n, m) => n + m.recipe[key] * m.servings, 0) * 10,
              ) / 10;
        return `<article class="daily-summary"><div><strong>${dayName.format(date)}</strong><span>${shortDate.format(date)} · ${daily.length} meals</span></div><dl>${[
          ["calories", "kcal"],
          ["protein", "protein"],
          ["carbs", "carbs"],
          ["fat", "fat"],
        ]
          .map(
            ([key, label]) =>
              `<div><dt>${label}</dt><dd>${macro(key)}${key !== "calories" && macro(key) !== "—" ? "g" : ""}</dd></div>`,
          )
          .join("")}</dl></article>`;
      })
      .join("");
    const list = $("#shopping-list"),
      items = groceryItems();
    list.innerHTML = "";
    let category = "";
    for (const item of items) {
      if (item.category !== category) {
        category = item.category;
        const heading = document.createElement("li");
        heading.className = "shopping-category";
        heading.textContent = category;
        list.append(heading);
      }
      const li = document.createElement("li"),
        id = groceryId(item),
        data = K.get("grocery", id);
      li.innerHTML = `<label><input type="checkbox" ${data?.checked ? "checked" : ""}><span>${escape(item.text)}</span></label>`;
      li.querySelector("input").onchange = async (e) => {
        const checked = e.target.checked;
        e.target.disabled = true;
        await perform(() =>
          K.set("grocery", id, {
            text: item.text,
            week: dateKey(week),
            manual: !!item.manual,
            checked,
          }),
        );
        renderSummary();
      };
      if (item.manual) {
        const remove = document.createElement("button");
        remove.className = "clear-button";
        remove.textContent = "Remove";
        remove.onclick = () => perform(() => K.remove("grocery", id));
        li.append(remove);
      }
      list.append(li);
    }
    if (!items.length)
      list.innerHTML =
        '<li class="shopping-empty">A good week starts with one meal. Add a recipe above and your shopping list will appear here.</li>';
  }
  $("#previous-week").onclick = () => {
    week = addDays(week, -7);
    render();
  };
  $("#next-week").onclick = () => {
    week = addDays(week, 7);
    render();
  };
  $("#today-week").onclick = () => {
    week = startOfWeek(new Date());
    render();
  };
  $("#planner-search").oninput = renderPicker;
  $("#copy-shopping-list").onclick = async () => {
    const items = groceryItems();
    if (!items.length) {
      K.notify("Plan a few meals first");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        items.map((i) => "- " + i.text).join("\n"),
      );
      K.notify("Shopping list copied");
    } catch {
      K.notify(
        "Your browser could not copy the list. Select the text to copy it.",
      );
    }
  };
  $("#organize-week").onclick = () =>
    perform(async () => {
      remember();
      const changes = [],
        used = new Set(meals().map((m) => m.recipe.id));
      dates().forEach((date, i) =>
        slots.forEach((slot, j) => {
          const key = slotKey(dateKey(date), slot);
          if (K.get("meal", key)) return;
          const pool = recipes.filter((r) =>
            slot === "Breakfast"
              ? r.category === "breakfast"
              : slot === "Snack"
                ? ["snack", "sweet"].includes(r.category)
                : r.category === "main",
          );
          const available = pool.filter((r) => !used.has(r.id));
          const source = available.length ? available : pool;
          const r = source[(i + j) % source.length];
          if (r) {
            used.add(r.id);
            changes.push({
              kind: "meal",
              id: key,
              data: { recipe_id: r.id, servings: 1 },
            });
          }
        }),
      );
      if (changes.length) await batch(changes);
    }, "Empty slots filled. A week to look forward to.");
  $("#clear-week").onclick = () =>
    perform(async () => {
      remember();
      const changes = K.list("meal")
        .filter((r) => dates().some((d) => r.id.startsWith(dateKey(d) + "|")))
        .map((r) => ({ kind: "meal", id: r.id, data: {}, deleted: true }));
      if (changes.length) await batch(changes);
    }, "Week cleared. Undo is available.");
  $("#undo-plan").onclick = () =>
    perform(async () => {
      if (!undo || undo.week !== dateKey(week)) return;
      const old = new Map(undo.entries.map((r) => [r.id, r.data])),
        keys = new Set([
          ...old.keys(),
          ...K.list("meal")
            .filter((r) =>
              dates().some((d) => r.id.startsWith(dateKey(d) + "|")),
            )
            .map((r) => r.id),
        ]);
      await batch(
        [...keys].map((id) => ({
          kind: "meal",
          id,
          data: old.get(id) || {},
          deleted: !old.has(id),
        })),
      );
      undo = null;
      render();
    }, "Last change undone");
  function templates() {
    return K.get("profile", "meal-templates")?.plans || {};
  }
  function refreshTemplates() {
    const select = $("#plan-template");
    if (!select) return;
    const value = select.value;
    select.innerHTML =
      '<option value="">Choose a saved week…</option>' +
      Object.keys(templates())
        .map(
          (name) => `<option value="${escape(name)}">${escape(name)}</option>`,
        )
        .join("");
    select.value = value;
  }
  $("#save-template").onclick = () => {
    if (!meals().length) {
      K.notify("Add a meal before saving this week");
      return;
    }
    let modal = $("#template-dialog");
    if (!modal) {
      modal = document.createElement("dialog");
      modal.id = "template-dialog";
      modal.style.maxWidth = "460px";
      document.body.append(modal);
    }
    modal.innerHTML =
      '<form class="account-panel"><p class="eyebrow">GOOD WEEKS ARE WORTH REPEATING</p><h2>Keep this week.</h2><label class="form-hint" for="template-name">Give your plan a name</label><input id="template-name" required maxlength="60" placeholder="My easy week"><div class="editor-footer" style="margin-top:20px"><button class="primary-button">Save week</button><button class="text-button" type="button">Cancel</button></div></form>';
    modal.querySelector("[type=button]").onclick = () => modal.close();
    modal.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const name = modal.querySelector("input").value.trim();
      if (!name) return;
      const all = templates();
      if (Object.hasOwn(all, name)) {
        K.notify("Choose a new name for this plan");
        return;
      }
      const entries = meals().map((m) => ({
        day: dates().findIndex((d) => dateKey(d) === dateKey(m.date)),
        slot: m.slot,
        id: m.recipe.id,
        servings: m.servings,
      }));
      Object.defineProperty(all, name, {
        value: entries,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      await perform(async () => {
        await K.set("profile", "meal-templates", { plans: all });
        modal.close();
      }, "Week saved for another day");
    };
    modal.showModal();
  };
  $("#reuse-template").onclick = () =>
    perform(async () => {
      const name = $("#plan-template").value,
        template = templates()[name];
      if (!template) {
        K.notify("Choose a saved week first");
        return;
      }
      remember();
      const changes = template
        .filter(
          (e) =>
            Number.isInteger(e.day) &&
            e.day >= 0 &&
            e.day < 7 &&
            slots.includes(e.slot) &&
            recipeById(e.id),
        )
        .map((e) => ({
          kind: "meal",
          id: slotKey(dateKey(addDays(week, e.day)), e.slot),
          data: { recipe_id: e.id, servings: e.servings },
        }))
        .filter((c) => !K.get("meal", c.id));
      if (changes.length) await batch(changes);
      K.notify(
        changes.length
          ? `Added ${changes.length} meals to empty slots`
          : "Your planned meals are already in those slots",
      );
    });
  const picker = $("#recipe-picker-dialog");
  $(".picker-close").onclick = () => picker.close();
  picker.addEventListener("click", (e) => {
    if (e.target !== picker) return;
    const b = picker.getBoundingClientRect();
    if (
      e.clientX < b.left ||
      e.clientX > b.right ||
      e.clientY < b.top ||
      e.clientY > b.bottom
    )
      picker.close();
  });
  picker.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]"))
      document.body.classList.remove("dialog-open");
    if (selected) {
      $(`#meal-${selected.date}-${selected.slot}`)?.focus();
      selected = null;
    }
  });
  const recipeDialog = $("#recipe-dialog");
  $("#dialog-close").onclick = () => recipeDialog.close();
  recipeDialog.addEventListener("click", (e) => {
    if (e.target === recipeDialog) recipeDialog.close();
  });
  const groceryForm = document.createElement("form");
  groceryForm.className = "grocery-form";
  groceryForm.innerHTML =
    '<label class="visually-hidden" for="grocery-extra">Add to your grocery list</label><input id="grocery-extra" maxlength="180" required placeholder="Anything else to pick up?"><button class="planner-tool-button">Add</button>';
  $("#shopping-list").after(groceryForm);
  groceryForm.onsubmit = async (e) => {
    e.preventDefault();
    const input = $("#grocery-extra"),
      text = input.value.trim();
    if (!text) return;
    const button = groceryForm.querySelector("button");
    button.disabled = true;
    await perform(async () => {
      await K.set("grocery", crypto.randomUUID(), {
        text,
        week: dateKey(week),
        manual: true,
        checked: false,
      });
      groceryForm.reset();
    });
    button.disabled = false;
  };
  function ensureIncoming() {
    if (!incoming) {
      $("#incoming-meal")?.remove();
      return;
    }
    let banner = $("#incoming-meal");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "incoming-meal";
      banner.className = "recipe-note";
      $(".planner-shell").prepend(banner);
    }
    banner.innerHTML = `<strong>Let’s make a little plan</strong>Choose a slot below for ${escape(incoming.title)} · ${incomingServings} servings. <button class="text-button" id="cancel-incoming">Cancel</button>`;
    banner.querySelector("button").onclick = () => {
      incomingConsumed = true;
      incoming = null;
      banner.remove();
      history.replaceState(null, "", location.pathname);
      render();
    };
  }

  function linked() {
    if (!K.ready) return;
    if (location.hash.startsWith("#recipe=")) {
      try {
        const r = recipeById(decodeURIComponent(location.hash.slice(8)));
        if (r) K.openRecipe(r);
      } catch {}
    }
  }
  window.addEventListener("hashchange", linked);
  window.addEventListener("kitchen:change", () => {
    if (owner !== K.user?.id) {
      owner = K.user?.id;
      undo = null;
      picker.close();
      recipeDialog.close();
    }
    render();
    if (!recipeDialog.open) linked();
  });
  render();
  linked();
})();
