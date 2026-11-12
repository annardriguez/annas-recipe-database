// New cookbook journeys run in an isolated guest browser. No account data is changed.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage(),
    errors = [];
  global.testPage = page;
  page.on("pageerror", (e) => errors.push(e.message + " " + e.stack));
  const base = "http://127.0.0.1:4173/";
  const ready = () => page.waitForFunction(() => window.AnnaKitchen?.ready);
  await page.goto(base);
  await ready();
  assert.equal(await page.locator(".recipe-card").count(), 72);
  await page.screenshot({ path: "tests/redesign-desktop.png" });
  await page
    .getByRole("button", { name: "Open featured recipe", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Decrease servings", exact: true })
    .click();
  assert.match(
    await page.locator(".ingredient-list").innerText(),
    /510 g extra-lean/,
  );
  assert.match(
    await page.locator(".ingredient-list").innerText(),
    /360 g cooked/,
  );
  await page.locator('[data-ingredient="0"]').check();
  await page
    .getByRole("button", { name: "Increase servings", exact: true })
    .click();
  assert.ok(await page.locator('[data-ingredient="0"]').isChecked());
  await page.locator("#personal-note").fill("More spring onions next time.");
  await page.locator("#personal-subs").fill("Tamari for soy sauce.");
  await page.locator("#personal-tags").fill("make again, freezer-friendly");
  await page
    .getByRole("button", { name: "Save my notes", exact: true })
    .click();
  await page.waitForFunction(() =>
    window.AnnaKitchen.get("entry", "korean-beef-fried-rice")?.notes?.includes(
      "spring onions",
    ),
  );
  await page
    .getByRole("button", { name: "+ Create collection", exact: true })
    .click();
  await page
    .getByLabel("Collection name", { exact: true })
    .fill("Everyday keepers");
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await page.waitForFunction(
    () => window.AnnaKitchen.list("collection").length === 1,
  );
  const memberships = await page.evaluate(
    () =>
      window.AnnaKitchen.get("entry", "korean-beef-fried-rice").collection_ids,
  );
  assert.equal(memberships.length, 1);
  await page
    .getByRole("button", { name: "Start cooking", exact: false })
    .click();
  assert.match(
    await page.locator(".cook-step-text").innerText(),
    /Heat the beef/,
  );
  await page.getByRole("button", { name: "Next step", exact: false }).click();
  assert.match(
    await page.locator(".cook-step-text").innerText(),
    /Whisk together/,
  );
  await page.getByRole("button", { name: "Previous", exact: false }).click();
  assert.match(
    await page.locator(".cook-step-text").innerText(),
    /Heat the beef/,
  );
  await page
    .getByRole("button", { name: "Exit cooking mode", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit recipe", exact: true }).click();
  await page
    .locator("#custom-recipe-form [name=description]")
    .fill("Our favourite rice, with extra spring onion.");
  await page
    .locator("#custom-recipe-form [name=ingredients]")
    .fill(
      "680 g extra-lean beef mince\n2 garlic cloves, minced\n480 g cooked rice",
    );
  await page.getByRole("button", { name: "Save recipe", exact: false }).click();
  await page.waitForFunction(() =>
    window.AnnaKitchen.get(
      "entry",
      "korean-beef-fried-rice",
    )?.recipeEdit?.description?.startsWith("Our favourite"),
  );
  await page.reload();
  await ready();
  assert.equal(
    await page.evaluate(() => recipes.filter((r) => !r.isCustom).length),
    72,
  );
  assert.match(
    await page.locator(".recipe-card").first().innerText(),
    /Our favourite rice/,
  );
  await page.locator("#recipe-search").fill("zzznothing");
  assert.ok(await page.locator("#empty-message").isVisible());
  await page.locator("#empty-reset").click();
  assert.equal(await page.locator(".recipe-card").count(), 72);
  await page.locator("#advanced-filters summary").click();
  await page.locator("#time-filter").selectOption("15");
  assert.ok((await page.locator(".recipe-card").count()) > 0);
  const titles = await page.locator(".recipe-card h3").allTextContents();
  assert.ok(
    await page.evaluate(
      (titles) =>
        titles.every((t) => recipes.find((r) => r.title === t).time <= 15),
      titles,
    ),
  );
  await page.locator("#clear-filters").click();
  await page.locator("#pantry-filter").fill("tofu, soy");
  assert.ok((await page.locator(".recipe-card").count()) > 0);
  await page.locator("#clear-filters").click();
  await page.locator("#collection-filter").selectOption("Everyday keepers");
  assert.equal(await page.locator(".recipe-card").count(), 1);
  await page.locator("#clear-filters").click();
  await page.locator("[data-nutrition-toggle]").click();
  await page.locator("#protein-filter").fill("30");
  await page.locator("#calorie-filter").fill("600");
  const results = await page.locator(".recipe-card h3").allTextContents();
  assert.ok(results.length > 0);
  assert.ok(
    await page.evaluate(
      (titles) =>
        titles.every((t) => {
          const r = recipes.find((r) => r.title === t);
          return r.protein >= 30 && r.calories <= 600;
        }),
      results,
    ),
  );
  await page.locator("#save-targets").click();
  await page.waitForFunction(
    () =>
      window.AnnaKitchen.get("profile", "cookbook-tools")?.annaNutritionTargets
        ?.protein === "30",
  );
  await page.locator("#clear-filters").click();
  await page.getByRole("button", { name: "+ Add recipe", exact: true }).click();
  const form = page.locator("#custom-recipe-form");
  await form.locator("[name=title]").fill("Weekend lemon pasta");
  await form.locator("[name=description]").fill("A bright little keeper.");
  await form.locator("[name=servings]").fill("2");
  await form.locator("[name=time]").fill("15");
  await form
    .locator("[name=ingredients]")
    .fill("200 g pasta\n2 garlic cloves, minced\n1/2 lemon");
  await form
    .locator("[name=steps]")
    .fill("Boil pasta, salt the water.\nToss with lemon and serve.");
  await form.locator("[name=tags]").fill("vegetarian, meal prep");
  await form
    .locator("[name=photo]")
    .setInputFiles(path.join(__dirname, "../assets/pasta.jpg"));
  await page.locator("#photo-preview").waitFor({ state: "visible" });
  await form.getByRole("button", { name: "Save recipe", exact: false }).click();
  await page.waitForFunction(
    () => window.AnnaKitchen.list("recipe").length === 1,
  );
  const original = await page.evaluate(
    () => window.AnnaKitchen.list("recipe")[0].data,
  );
  assert.equal(original.servings, 2);
  assert.equal(original.ingredients.length, 3);
  assert.equal(original.steps.length, 2);
  assert.ok(original.image.startsWith("data:image/jpeg"));
  await page.locator(".recipe-card").first().click();
  await page.locator("#plan-recipe").click();
  await ready();
  await page.locator(".meal-choice").first().click();
  await page.waitForFunction(
    () => window.AnnaKitchen.list("meal").length === 1,
  );
  assert.match(await page.locator("#shopping-list").innerText(), /200 g pasta/);
  const serving = page.locator(".slot-servings input").first();
  await serving.fill("4");
  await serving.press("Tab");
  await page.waitForFunction(
    () => window.AnnaKitchen.list("meal")[0].data.servings === 4,
  );
  assert.match(await page.locator("#shopping-list").innerText(), /400 g pasta/);
  assert.match(
    await page.locator("#shopping-list").innerText(),
    /4 garlic cloves, minced/,
  );
  await page
    .getByRole("button", { name: "Save this week", exact: true })
    .click();
  await page
    .getByLabel("Give your plan a name", { exact: true })
    .fill("The easy week");
  await page.getByRole("button", { name: "Save week", exact: true }).click();
  await page.waitForFunction(
    () =>
      window.AnnaKitchen.get("profile", "meal-templates")?.plans?.[
        "The easy week"
      ],
  );
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await page.locator("#plan-template").selectOption("The easy week");
  await page.locator("#reuse-template").click();
  await page.waitForFunction(
    () => window.AnnaKitchen.list("meal").length === 2,
  );
  assert.equal(await page.locator(".has-meal").count(), 1);
  await page.locator("#clear-week").click();
  await page.waitForFunction(
    () => window.AnnaKitchen.list("meal").length === 1,
  );
  await page.locator("#undo-plan").click();
  await page.waitForFunction(
    () => window.AnnaKitchen.list("meal").length === 2,
  );
  await page.locator("#shopping-list input").first().check();
  await page.reload();
  await ready();
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  assert.equal(await page.locator("#shopping-list input:checked").count(), 1);
  // Quantity parser regression cases: retain all unknown/ranged measures and compatible unit sums.
  const arithmetic = await page.evaluate(() => {
    const K = window.AnnaKitchen;
    const recipe = {
      servings: 2,
      ingredients: [
        "1 kg potatoes",
        "250 g potatoes",
        "1 tbsp oil",
        "1 tsp oil",
        "Salt to taste",
        "2 garlic cloves, minced",
      ],
    };
    return {
      scaled: K.scaleIngredient("Sauce: 1 1/2 tbsp soy sauce (22.5 ml)", 2),
      entries: K.groceryEntries([
        { recipe, servings: 2 },
        { recipe, servings: 2 },
      ]),
    };
  });
  assert.equal(arithmetic.scaled, "Sauce: 3 tbsp soy sauce (45 ml)");
  assert.ok(arithmetic.entries.some((e) => e.text === "2500 g potatoes"));
  assert.ok(
    arithmetic.entries.some((e) => e.text === "4 garlic cloves, minced"),
  );
  assert.ok(
    arithmetic.entries.some((e) => e.text === "Salt to taste × 2 uses"),
  );
  // Backups import through the UI into a second isolated guest kitchen.
  await page.goto(base+'index.html?view=recipes');await ready();
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#export-kitchen').click();
  const backupDownload=await downloadPromise,backupPath=await backupDownload.path();
  const backup=JSON.parse(require('node:fs').readFileSync(backupPath,'utf8'));
  assert.equal(backup.format,'annas-kitchen');assert.equal(backup.version,3);
  assert.ok(backup.records.some(r=>r.kind==='recipe'));
  const restoredContext=await browser.newContext(),restored=await restoredContext.newPage();
  restored.on('pageerror',e=>errors.push(e.message));
  await restored.goto(base+'index.html?view=recipes');await restored.waitForFunction(()=>window.AnnaKitchen?.ready);
  await restored.locator('#import-kitchen').setInputFiles(backupPath);
  await restored.waitForFunction(()=>window.AnnaKitchen.list('recipe').length===1);
  assert.equal(await restored.evaluate(()=>window.AnnaKitchen.list('meal').length),2);
  assert.match(await restored.evaluate(()=>window.AnnaKitchen.get('entry','korean-beef-fried-rice').notes),/spring onions/);
  await restored.reload();await restored.waitForFunction(()=>window.AnnaKitchen?.ready);
  assert.equal(await restored.evaluate(()=>window.AnnaKitchen.list('recipe')[0].data.title),'Weekend lemon pasta');
  await restoredContext.close();
  // Verify every surface at deliberate device widths, including tablet navigation.
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "index.html",
      "index.html?view=recipes",
      "planner.html",
      "cookbook.html",
      "profile.html",
      "about.html",
    ]) {
      await page.goto(base + route);
      if (!route.startsWith("about")) await ready();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `Horizontal overflow: ${route} at ${width}`,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "index.html");
  await ready();
  await page.screenshot({ path: "tests/redesign-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "Open featured recipe", exact: true })
    .click();
  assert.ok(await page.locator(".ingredients-pane").isVisible());
  assert.ok(!(await page.locator(".method-pane").isVisible()));
  await page
    .getByRole("button", { name: "Method & notes", exact: true })
    .click();
  assert.ok(await page.locator(".method-pane").isVisible());
  await page.locator("#start-cooking").click();
  await page.screenshot({ path: "tests/redesign-cooking-mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: serving math, ingredients, notes, collections, cooking mode, non-destructive edits, search/filters, nutrition targets, original recipe/photo, planner servings, grocery consolidation, reusable weeks, undo, reloads, 5 responsive widths, no browser exceptions.",
  );
})().catch(async (e) => {
  console.error(e);
  if (global.testPage) {
    console.error(
      "Toast:",
      await global.testPage.locator("#toast").innerText(),
    );
    await global.testPage.screenshot({ path: "tests/redesign-failure.png" });
  }
  process.exit(1);
});
