import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

async function clean(page: Page, route = "/imports") {
  await page.goto(route);
  await page.evaluate(() => {
    localStorage.removeItem("customerpulse-demo-v2");
    localStorage.removeItem("customerpulse-imported-projects-v1");
    indexedDB.deleteDatabase("customerpulse-import-files");
  });
  await page.reload();
}

test("user-created imported projects isolate the complete operational view", async ({ page }) => {
  await clean(page);
  await page.getByLabel("Active workspace").selectOption("imported");
  await expect(page.getByRole("heading", { name: "Create your first imported project" })).toBeVisible();

  await page.getByLabel("Project name").fill("Original Mixed-Risk Project");
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  await page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][multiple]').setInputFiles([
    path.join(process.cwd(), "mock-data/scenarios/01-customers-mixed-risk.csv"),
    path.join(process.cwd(), "mock-data/scenarios/02-transactions-mixed-risk.csv"),
    path.join(process.cwd(), "mock-data/scenarios/03-conversations-mixed-risk.csv"),
  ]);
  await expect(page.getByText(/3 files .* added/)).toBeVisible();
  await page.goto("/customers");
  await expect(page.getByRole("link", { name: "Alicia Severe", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "New Project" }).click();
  await page.getByLabel("New project name").fill("Alternate Healthcare Project");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.goto("/imports");
  await page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][multiple]').setInputFiles([
    path.join(process.cwd(), "mock-data/scenarios/alternate-pack/01-customers-alternate.csv"),
    path.join(process.cwd(), "mock-data/scenarios/alternate-pack/02-transactions-alternate.csv"),
    path.join(process.cwd(), "mock-data/scenarios/alternate-pack/03-conversations-alternate.csv"),
    path.join(process.cwd(), "mock-data/scenarios/alternate-pack/04-products-alternate.csv"),
    path.join(process.cwd(), "mock-data/scenarios/alternate-pack/alternate-product-catalogue.pdf"),
    path.join(process.cwd(), "mock-data/scenarios/alternate-pack/alternate-customer-service-policy.pdf"),
    path.join(process.cwd(), "mock-data/scenarios/alternate-pack/alternate-marketing-guidelines.pdf"),
  ]);
  await expect(page.getByText(/7 files .* added/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Project Data Library" })).toBeVisible();
  await page.getByRole("button", { name: "Documents", exact: true }).click();
  await expect(page.getByText("alternate-product-catalogue.pdf", { exact: true })).toBeVisible();
  await expect(page.getByText("alternate-customer-service-policy.pdf", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .locator(".evidence")
    .filter({ hasText: "alternate-product-catalogue.pdf" })
    .getByRole("button", { name: "Download original PDF" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("alternate-product-catalogue.pdf");
  await page.goto("/customers");
  await expect(page.getByRole("link", { name: "Nadia Escalation", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alicia Severe", exact: true })).toHaveCount(0);

  await page.getByLabel("Active imported project").selectOption({ label: "Original Mixed-Risk Project" });
  await expect(page.getByRole("link", { name: "Alicia Severe", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nadia Escalation", exact: true })).toHaveCount(0);
});

test("provider configuration uses the neutral UI label in both workspaces", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect((await health.json()).avoProvider).toBe("AI-API-configured");
  await clean(page, "/overview");
  await expect(page.getByText("AVO: AI-API-configured", { exact: true })).toBeVisible();
  await page.getByLabel("Active workspace").selectOption("imported");
  await expect(page.getByText("AVO: AI-API-configured", { exact: true })).toBeVisible();
});

test("AVO plan requires execution evidence and outcome before risk-aware completion", async ({ page }) => {
  await clean(page, "/conversations");
  await page.getByRole("button", { name: "Run AVO Analysis" }).click();
  await expect(page.getByRole("heading", { name: "Choose one of three AVO action plans" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Choose this plan" })).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "4. Customer message draft" })).toBeVisible();
  const beforeScore = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("customerpulse-demo-v2") ?? "{}");
    return state.datasets.demo.churnCalculations["CUS-1001"].score as number;
  });

  const firstPlan = page.locator(".evidence").filter({ has: page.getByRole("button", { name: "Choose this plan" }) }).first();
  const selectedPlanTitle = (await firstPlan.locator("strong").first().innerText()).replace(/^1\.\s*/, "");
  await firstPlan.getByRole("button", { name: "Choose this plan" }).click();
  await page.getByRole("button", { name: "Assign and track action plan" }).click();
  await page.goto("/action-plans");
  await expect(page.getByRole("heading", { name: selectedPlanTitle })).toBeVisible();
  await expect(page.getByText("Approved and Ready", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open execution workflow" }).click();
  await page.getByRole("button", { name: "Start Action" }).click();
  await page.getByRole("button", { name: "Confirm Execution" }).click();
  await page.getByLabel("Customer response").fill("The recovery work solved the issue and we will continue.");
  await page.getByLabel("Response classification").selectOption("Positive");
  await page.getByRole("button", { name: "Record Response" }).click();
  await page.getByLabel("Action outcome").selectOption("Complaint resolved");
  await page.getByLabel("Outcome notes").fill("Administrator verified the resolved complaint with the customer.");
  await page.getByRole("button", { name: "Record Outcome and Recalculate Risk" }).click();
  await expect(page.getByText(/Outcome recorded and risk recalculated/)).toBeVisible();
  await expect(page.locator(".action-detail .badge.completed")).toBeVisible();
  const afterScore = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("customerpulse-demo-v2") ?? "{}");
    return state.datasets.demo.churnCalculations["CUS-1001"].score as number;
  });
  expect(afterScore).toBeLessThan(beforeScore);

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("customerpulse-demo-v2") ?? "{}");
    const completed = state.actions.find((item: { sourceType: string }) => item.sourceType === "AVO Action Plan");
    state.actions.unshift({
      ...completed,
      id: "PLAN-ACT-OVERDUE-TEST",
      selectedPlanId: "PLAN-OVERDUE-TEST",
      recommendation: "Overdue verification plan",
      status: "Approved and Ready",
      executionStatus: "Not started",
      deadline: "2000-01-01",
      completedAt: undefined,
      completionNotes: undefined,
    });
    localStorage.setItem("customerpulse-demo-v2", JSON.stringify(state));
  });
  await page.reload();
  await page.goto("/action-plans");
  await expect(page.getByRole("heading", { name: "Overdue verification plan" })).toBeVisible();
  await expect(page.getByText(/due date passed before a verified customer or business outcome/)).toBeVisible();
  const storedStatus = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("customerpulse-demo-v2") ?? "{}");
    return state.actions.find((item: { id: string }) => item.id === "PLAN-ACT-OVERDUE-TEST")?.status;
  });
  expect(storedStatus).toBe("Not Completed");
});

test("customer-level campaign evidence recalculates identified customers in both directions", async ({ page }) => {
  await clean(page);
  await page.getByLabel("Active workspace").selectOption("imported");
  await page.getByLabel("Project name").fill("Campaign Evidence Project");
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  await page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][multiple]').setInputFiles([
    path.join(process.cwd(), "mock-data/scenarios/01-customers-mixed-risk.csv"),
    path.join(process.cwd(), "mock-data/scenarios/02-transactions-mixed-risk.csv"),
    path.join(process.cwd(), "mock-data/scenarios/03-conversations-mixed-risk.csv"),
  ]);
  await expect(page.getByText(/3 files .* added/)).toBeVisible();
  const before = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("customerpulse-demo-v2") ?? "{}");
    return {
      recover: state.datasets.imported.churnCalculations["IMP-RISK-001"].score as number,
      decline: state.datasets.imported.churnCalculations["IMP-PRICE-003"].score as number,
    };
  });
  await page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][multiple]').setInputFiles(
    path.join(process.cwd(), "mock-data/scenarios/04-campaign-customer-results.csv"),
  );
  await expect(page.getByText(/1 files .* added/)).toBeVisible();
  const after = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("customerpulse-demo-v2") ?? "{}");
    return {
      recover: state.datasets.imported.churnCalculations["IMP-RISK-001"],
      decline: state.datasets.imported.churnCalculations["IMP-PRICE-003"],
    };
  });
  expect(after.recover.score).toBeLessThan(before.recover);
  expect(after.decline.score).toBeGreaterThan(before.decline);
  expect(after.recover.triggerType).toBe("Customer-level campaign evidence imported");
  await page.goto("/audit");
  await expect(page.getByText("Customer-level campaign evidence imported and risk recalculated").first()).toBeVisible();
});
