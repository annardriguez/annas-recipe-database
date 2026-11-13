/* Live mobile regression journeys. Fresh guest contexts never share account cookies or records. */
const { chromium, webkit, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base =
  process.env.ANNA_TEST_BASE ||
  "https://annardriguez.github.io/annas-recipe-database/";
const engines = process.env.ANNA_TEST_ENGINES?.split(",") || [
  "chromium",
  "webkit",
];
const results = [];
async function run(engineName, deviceName) {
  const engine = { chromium, webkit }[engineName],
    browser = await engine.launch({ headless: true });
  const device = devices[deviceName];
  const context = await browser.newContext({
    ...device,
    timezoneId: "Europe/Amsterdam",
    locale: "en-GB",
  });
  const page = await context.newPage(),
    errors = [],
    failedAssets = [],
    checks = [];
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(base) && r.status() >= 400)
      failedAssets.push({ url: r.url(), status: r.status() });
  });
  const label = `${engineName}-${deviceName.replaceAll(" ", "-").toLowerCase()}`;
  const ready = async () => {
    await page.waitForFunction(() => window.AnnaKitchen?.ready);
    assert.equal(
      await page.evaluate(() => window.AnnaKitchen.user),
      null,
      "Tests must remain in a guest kitchen",
    );
  };
  const noOverflow = async () => {
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `${label}: page overflow at ${page.url()}`,
    );
    if (await page.locator("dialog[open]").count())
      assert.ok(
        await page
          .locator("dialog[open]")
          .last()
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${label}: dialog overflow`,
      );
  };
  const tap = (locator) => locator.tap();
  try {
    await page.goto(base);
    await ready();
    assert.equal(await page.locator(".recipe-card").count(), 72);
    await noOverflow();
    await tap(page.locator("#featured-card"));
    assert.equal(
      await page.locator("#recipe-dialog-title").innerText(),
      "Korean Beef Fried Rice",
    );
    assert.ok(await page.locator(".ingredients-pane").isVisible());
    assert.ok(!(await page.locator(".method-pane").isVisible()));
    await page.screenshot({ path: `tests/live-${label}-recipe.png` });
    await tap(page.locator("#less-servings"));
    assert.match(
      await page.locator(".ingredients-pane .ingredient-list").innerText(),
      /510 g extra-lean/,
    );
    assert.match(
      await page.locator(".ingredients-pane .ingredient-list").innerText(),
      /360 g cooked/,
    );
    await tap(page.locator('[data-ingredient="0"]'));
    assert.ok(await page.locator('[data-ingredient="0"]').isChecked());
    await tap(page.locator("#more-servings"));
    assert.ok(await page.locator('[data-ingredient="0"]').isChecked());
    await noOverflow();
    checks.push(
      "Recipe imagery, mobile tabs, serving arithmetic and ingredient checks",
    );
    await tap(page.locator(".recipe-tabs button[data-tab=method]"));
    assert.ok(await page.locator(".method-pane").isVisible());
    assert.ok(!(await page.locator(".ingredients-pane").isVisible()));
    await page
      .locator("#personal-note")
      .fill("Isolated live mobile test: extra spring onion.");
    await page.locator("#personal-subs").fill("Tamari instead of soy sauce.");
    await tap(page.locator("#save-note"));
    await page.waitForFunction(() =>
      window.AnnaKitchen.get(
        "entry",
        "korean-beef-fried-rice",
      )?.notes?.includes("mobile test"),
    );
    await tap(page.locator("#start-cooking"));
    assert.match(
      await page.locator(".cook-step-text").innerText(),
      /Heat the beef/,
    );
    assert.ok(!(await page.locator("#previous-step").isEnabled()));
    await tap(page.locator(".cook-ingredients summary"));
    assert.ok(await page.locator('[data-ingredient="0"]').isChecked());
    await tap(page.locator(".cook-ingredients summary"));
    await tap(page.locator("#next-step"));
    assert.match(
      await page.locator(".cook-step-text").innerText(),
      /Whisk together/,
    );
    await tap(page.locator("#previous-step"));
    assert.match(
      await page.locator(".cook-step-text").innerText(),
      /Heat the beef/,
    );
    const wake = await page.evaluate(() => ({
      supported: !!navigator.wakeLock,
      message: document.querySelector(".wake-status").textContent,
    }));
    await page.screenshot({ path: `tests/live-${label}-cooking.png` });
    for (let step = 1; step < 8; step++) {
      await tap(page.locator("#next-step"));
      assert.match(
        await page.locator(".cook-step .eyebrow").innerText(),
        new RegExp(`STEP ${step + 1} OF 8`),
      );
      await noOverflow();
    }
    assert.match(
      await page.locator("#next-step").innerText(),
      /Finish cooking/,
    );
    await tap(page.locator("#next-step"));
    assert.ok(await page.locator(".method-pane").isVisible());
    assert.match(
      await page.locator("#personal-note").inputValue(),
      /mobile test/,
    );
    await tap(page.locator("#start-cooking"));
    await tap(page.locator("#exit-cooking"));
    assert.ok(await page.locator("#start-cooking").isVisible());
    checks.push(
      "All cooking steps, back/next, finish, exit, ingredient access and retained notes",
    );
    await tap(page.locator("#dialog-close"));
    assert.ok(!(await page.locator("#recipe-dialog").isVisible()));
    assert.equal(
      await page.evaluate(() =>
        document.body.classList.contains("dialog-open"),
      ),
      false,
    );
    await page.goto(base + "index.html#recipe=korean-beef-fried-rice");
    await ready();
    await page.locator("#recipe-dialog[open]").waitFor();
    await tap(page.locator(".recipe-tabs button[data-tab=method]"));
    assert.match(
      await page.locator("#personal-note").inputValue(),
      /mobile test/,
    );
    await tap(page.locator(".recipe-tabs button[data-tab=ingredients]"));
    await tap(page.locator("#less-servings"));
    await tap(page.locator("#less-servings"));
    await tap(page.locator("#plan-recipe"));
    await ready();
    await page.locator("#incoming-meal").waitFor();
    assert.match(
      await page.locator("#incoming-meal").innerText(),
      /2 servings/,
    );
    await tap(page.locator(".meal-choice").first());
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 1,
    );
    assert.equal(await page.locator(".has-meal").count(), 1);
    assert.match(
      await page.locator("#shopping-list").innerText(),
      /340 g extra-lean/,
    );
    await noOverflow();
    const serving = page.locator(".slot-servings input").first();
    await tap(serving);
    await serving.fill("4");
    await tap(page.locator(".slot-servings-apply").first());
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal")[0].data.servings === 4,
    );
    assert.match(
      await page.locator("#shopping-list").innerText(),
      /680 g extra-lean/,
    );
    checks.push(
      "Deep links, saved note reload and recipe-to-planner handoff with servings",
    );
    await tap(page.locator(".meal-choice").nth(1));
    await page.locator("#planner-search").fill("honey chilli");
    assert.equal(await page.locator(".picker-recipe").count(), 1);
    await tap(page.locator(".picker-preview"));
    assert.equal(
      await page.locator("#recipe-dialog-title").innerText(),
      "Honey Chilli Crispy Tofu",
    );
    await noOverflow();
    await tap(page.locator("#dialog-close"));
    assert.ok(await page.locator("#recipe-picker-dialog").isVisible());
    assert.equal(
      await page.evaluate(() =>
        document.body.classList.contains("dialog-open"),
      ),
      true,
    );
    await tap(page.locator(".recipe-add-button"));
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 2,
    );
    await page.waitForFunction(
      () =>
        !document.querySelector("dialog[open]") &&
        !document.body.classList.contains("dialog-open"),
    );
    await page.locator("#grocery-extra").fill("Live mobile test limes");
    await tap(page.locator(".grocery-form button"));
    await page.waitForFunction(() =>
      window.AnnaKitchen.list("grocery").some((r) => r.data.manual),
    );
    await tap(page.locator("#shopping-list input").first());
    await page.waitForFunction(() =>
      window.AnnaKitchen.list("grocery").some((r) => r.data.checked),
    );
    await page.reload();
    await ready();
    assert.equal(await page.locator(".has-meal").count(), 2);
    assert.equal(await page.locator("#shopping-list input:checked").count(), 1);
    assert.match(
      await page.locator("#shopping-list").innerText(),
      /Live mobile test limes/,
    );
    checks.push(
      "Planner search, stacked recipe preview, placement, manual groceries and persisted checkmarks",
    );
    await tap(page.locator("#save-template"));
    await page.locator("#template-name").fill("Mobile test week");
    await tap(page.locator("#template-dialog .primary-button"));
    await page.waitForFunction(
      () =>
        window.AnnaKitchen.get("profile", "meal-templates")?.plans?.[
          "Mobile test week"
        ],
    );
    await tap(page.locator("#next-week"));
    await page.locator("#plan-template").selectOption("Mobile test week");
    await tap(page.locator("#reuse-template"));
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 4,
    );
    assert.equal(await page.locator(".has-meal").count(), 2);
    await tap(page.locator("#clear-week"));
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 2,
    );
    await tap(page.locator("#undo-plan"));
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 4,
    );
    await tap(page.locator(".slot-remove").first());
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 3,
    );
    await tap(page.locator("#undo-plan"));
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 4,
    );
    await page.screenshot({ path: `tests/live-${label}-planner.png` });
    checks.push("Week navigation, save/reuse, meal removal, clear and undo");
    // Portrait and landscape, including a short iPhone SE viewport.
    await context.setOffline(true);
    await tap(page.locator(".slot-remove").first());
    await page.waitForFunction(
      () => window.AnnaKitchen.list("meal").length === 3,
    );
    await context.setOffline(false);
    checks.push(
      "Guest meal changes remain available without a network connection",
    );
    for (const viewport of [
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await noOverflow();
      await page.goto(base + "index.html#recipe=hazelnut-date-caramel-slices");
      await ready();
      await page.locator("#recipe-dialog[open]").waitFor();
      await noOverflow();
      if (await page.locator(".recipe-tabs").isVisible())
        await tap(page.locator(".recipe-tabs button[data-tab=method]"));
      await tap(page.locator("#start-cooking"));
      await noOverflow();
      await tap(page.locator("#dialog-close"));
      await page.goto(base + "planner.html");
      await ready();
      await noOverflow();
    }
    checks.push(
      "Long recipe titles, dialog scrolling and landscape layouts have no horizontal overflow",
    );
    if (deviceName === "iPhone 13") {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base + "index.html");
      await ready();
      const library = await page.evaluate(() =>
        recipes
          .filter((r) => !r.isCustom)
          .map((r) => ({
            id: r.id,
            title: r.title,
            ingredients: r.ingredients.length,
            steps: r.steps.length,
          })),
      );
      for (const r of library) {
        await page.goto(base + "index.html#recipe=" + encodeURIComponent(r.id));
        await page
          .getByRole("heading", { name: r.title, exact: true })
          .last()
          .waitFor({ state: "visible" });
        assert.equal(
          await page.locator(".ingredients-pane .ingredient-item").count(),
          r.ingredients,
        );
        assert.equal(await page.locator(".dialog-steps li").count(), r.steps);
        await noOverflow();
      }
      checks.push(
        "All 72 recipe deep links render their complete ingredients and method at 390px",
      );
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failedAssets, []);
    const result = {
      engine: engineName,
      device: deviceName,
      viewport: device.viewport,
      checks,
      wakeLock: wake,
      errors,
      failedAssets,
      status: "passed",
    };
    results.push(result);
    console.log(JSON.stringify(result));
  } catch (error) {
    await page
      .screenshot({ path: `tests/live-${label}-failure.png` })
      .catch(() => {});
    const state = {
      engine: engineName,
      device: deviceName,
      status: "failed",
      error: error.message,
      checks,
      errors,
      failedAssets,
      url: page.url(),
    };
    results.push(state);
    console.error(JSON.stringify(state));
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}
(async () => {
  for (const engine of engines)
    for (const device of ["iPhone 13", "iPhone SE"]) await run(engine, device);
})()
  .catch((error) => {
    console.error(error.stack);
    process.exitCode = 1;
  })
  .finally(() =>
    fs.writeFileSync(
      `/tmp/anna-live-mobile-${engines.join("-")}-report.json`,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          base,
          scope:
            "Live production assets; isolated guest browser contexts; iPhone touch emulation, not physical hardware or authenticated cloud write testing.",
          results,
        },
        null,
        2,
      ),
    ),
  );
