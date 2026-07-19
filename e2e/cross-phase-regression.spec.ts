import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const mock = (name: string) => path.join(process.cwd(), "mock-data", name);

async function reset(page: Page, route = "/imports") {
  const productionBase = process.env.PLAYWRIGHT_BASE_URL ?? "";
  const email = process.env.E2E_SUPABASE_ADMIN_EMAIL;
  const password = process.env.E2E_SUPABASE_ADMIN_PASSWORD;
  if (productionBase.startsWith("https://") && email && password) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/overview/);
  }
  await page.goto(route);
  await page.evaluate(() => localStorage.removeItem("customerpulse-demo-v2"));
  await page.reload();
  const role = page.getByLabel("Demo account");
  if (await role.isEnabled()) await role.selectOption("Administrator");
}

async function importFile(page: Page, kind: string, filename: string) {
  await page.getByLabel("Import type").selectOption(kind);
  await page.getByRole("button", { name: "Continue" }).click();
  const validation = page.waitForResponse(
    (response) =>
      response.url().includes("/api/imports/validate") &&
      response.request().method() === "POST",
  );
  await page.getByLabel("Import file").setInputFiles(mock(filename));
  expect((await validation).status()).toBe(200);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/I confirm/).check();
  await page.getByRole("button", { name: "Confirm Import" }).click();
  await expect(page.locator(".success-panel")).toContainText(
    "Import completed successfully",
  );
}

async function openImportedMaya(page: Page) {
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await page.getByLabel("Search customer or company").fill("Maya Tan");
  await page.getByRole("link", { name: "Maya Tan", exact: true }).click();
  await expect(page).toHaveURL(/\/customers\/CUS-1001/);
  await expect(page.getByRole("heading", { name: "Maya Tan" })).toBeVisible();
}

const score = (page: Page) =>
  page.locator(".kpi", { hasText: "hybrid churn risk" }).locator("strong");
const revenue = (page: Page) =>
  page
    .locator(".kpi", { hasText: "estimated revenue at risk" })
    .locator("strong");

test("Cross-phase imported operational pipeline changes customer state and audit", async ({
  page,
}) => {
  await reset(page);
  await importFile(page, "customers", "customers.csv");
  await expect(page.getByLabel("Active workspace")).toHaveValue("imported");
  await openImportedMaya(page);
  const customerOnlyScore = await score(page).innerText();
  const customerOnlyRevenue = await revenue(page).innerText();

  await page.getByRole("link", { name: "Data Imports" }).click();
  await importFile(page, "transactions", "transactions.csv");
  await openImportedMaya(page);
  const transactionScore = await score(page).innerText();
  const transactionRevenue = await revenue(page).innerText();
  expect(
    transactionScore !== customerOnlyScore ||
      transactionRevenue !== customerOnlyRevenue,
  ).toBe(true);
  await page.getByRole("tab", { name: "Transactions" }).click();
  await expect(page.getByText("TXN-000", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Data Imports" }).click();
  await importFile(page, "conversations", "conversations.csv");
  await page.getByRole("link", { name: "Conversations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Maya Tan" })).toBeVisible();
  await expect(page.getByText("MSG-A-104", { exact: false })).toBeVisible();
  const analysed = page.waitForResponse((response) =>
    response.url().includes("/api/avo/analyze"),
  );
  await page.getByRole("button", { name: "Run AVO Analysis" }).click();
  expect((await analysed).ok()).toBe(true);
  await expect(page.getByText("Uncertainty", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View Customer" }).click();
  const analysedScore = await score(page).innerText();
  expect(analysedScore).toMatch(/\d+\/100/);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("customerpulse-demo-v2") ?? "{}"),
  );
  const mayaSignals = stored.datasets.imported.signals.filter(
    (signal: { customerId: string; sourceType: string }) =>
      signal.customerId === "CUS-1001" && signal.sourceType === "AVO Analysis",
  );
  expect(mayaSignals.length).toBeGreaterThan(0);
  await page.getByRole("tab", { name: "AVO Insights" }).click();
  await expect(page.getByText("Stored validated AVO analysis")).toBeVisible();

  await page.getByRole("link", { name: "Audit Reports" }).click();
  await expect(
    page.getByText("Operational import committed", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByText("AVO signals validated and churn recalculated", {
        exact: false,
      })
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/Score \d+ -> \d+/).first()).toBeVisible();
});
