import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const mock = (name: string) => path.join(process.cwd(), "mock-data", name);
const role = (page: Page, value: string) =>
  page.getByLabel("Demo account").selectOption(value);
async function reset(
  page: Page,
  route = "/overview",
  selectedRole = "Administrator",
) {
  await page.goto(route);
  await page.evaluate(() => localStorage.removeItem("customerpulse-demo-v2"));
  await page.reload();
  await role(page, selectedRole);
}
async function confirmedImport(page: Page, kind: string, file: string) {
  await page.getByLabel("Import type").selectOption(kind);
  await page.getByRole("button", { name: "Continue" }).click();
  const validation = page.waitForResponse(
    (response) =>
      response.url().includes("/api/imports/validate") &&
      response.request().method() === "POST",
  );
  await page.getByLabel("Import file").setInputFiles(mock(file));
  expect((await validation).status()).toBe(200);
  await expect(page.getByText(file, { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/I confirm/).check();
  await page.getByRole("button", { name: "Confirm Import" }).click();
  await expect(page.locator(".success-panel")).toContainText(
    "Import completed successfully",
  );
}
async function openAnotherImport(page: Page) {
  await page.getByRole("button", { name: "Start another import" }).click();
}

// These tests intentionally exercise the deployed UI as a user, not internal state APIs.
test("Production acceptance A — confirmed imports persist and audit", async ({
  page,
}) => {
  await reset(page, "/overview", "Administrator");
  await page.getByRole("link", { name: "Data Imports" }).click();
  await expect(page.getByLabel("Demo account")).toHaveValue("Administrator");
  await confirmedImport(page, "customers", "customers.csv");
  await expect(
    page.getByRole("link", { name: "View Customers" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Audit Reports" }).click();
  await expect(
    page.getByText("Data import confirmed", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Data Imports" }).click();
  await confirmedImport(page, "conversations", "conversations.csv");
  await openAnotherImport(page);
  await confirmedImport(page, "product_catalogue", "product-catalogue.pdf");
});

test("Production acceptance B — Maya analysis through recorded outcome and audit", async ({
  page,
}) => {
  await reset(page, "/conversations?customerId=CUS-1001", "Account Executive");
  await expect(page.getByRole("heading", { name: "Maya Tan" })).toBeVisible();
  const analysed = page.waitForResponse((response) =>
    response.url().includes("/api/avo/analyze"),
  );
  await page.getByRole("button", { name: "Run AVO Analysis" }).click();
  expect((await analysed).ok()).toBe(true);
  await expect(page.getByText(/confidence/).last()).toBeVisible();
  await expect(
    page.getByText("MSG-A-104", { exact: false }).last(),
  ).toBeVisible();
  await expect(page.getByText("Uncertainty", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Intent and future behaviour remain inferences/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Alert Centre" }).click();
  await expect(page.getByText("Maya Tan", { exact: true })).toBeVisible();
  await expect(page.getByText("92%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review evidence" }).first().click();
  await expect(
    page.getByText("MSG-A-101", { exact: false }).first(),
  ).toBeVisible();
  const reanalysis = page.waitForResponse((response) =>
    response.url().includes("/api/avo/analyze"),
  );
  await page.getByRole("button", { name: "Run AVO Analysis" }).click();
  expect((await reanalysis).ok()).toBe(true);
  await page
    .getByRole("button", { name: "Generate AVO Recommendation" })
    .click();
  await page.getByRole("link", { name: "Recommendations" }).click();
  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(page.locator(".success-panel")).toContainText(
    "submitted to Sales Manager",
  );
  await page.getByRole("button", { name: "View Retention Action" }).click();
  await expect(page.locator("#ACT-021")).toContainText("Pending Approval");
  await role(page, "Sales Manager");
  await page
    .getByLabel("Reviewer comment")
    .fill("Evidence, uncertainty and service policy reviewed");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".notice.success")).toContainText(
    "approved and ready for execution",
  );
  await role(page, "Account Executive");
  await page
    .getByRole("button", { name: /Execute Approved WhatsApp Action/ })
    .click();
  await expect(page.locator(".notice.success")).toContainText(
    "Record the customer response",
  );
  await page
    .getByLabel("Customer response")
    .fill("Maya confirmed the replacement arrived");
  await page
    .getByLabel("Action outcome")
    .fill("Service recovery completed; follow-up scheduled");
  await page.getByRole("button", { name: "Record Outcome" }).click();
  await expect(page.locator(".notice.success")).toContainText(
    "risk queued for recalculation",
  );
  await page.getByRole("link", { name: "Audit Reports" }).click();
  for (const event of [
    "Recommendation submitted for approval",
    "Retention action approved",
    "Retention action executed",
    "Retention outcome recorded",
  ])
    await expect(page.getByText(event, { exact: false }).first()).toBeVisible();
});

async function finishCampaign(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Audience preview")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Generate content with AVO" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (const item of [
    "Audience reviewed",
    "Consent reviewed",
    "Sources reviewed",
    "Content reviewed",
    "Claims reviewed",
    "Schedule reviewed",
  ])
    await page.getByLabel(item).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Campaign reviewer comment")
    .fill(
      "Different authorized reviewer verified audience, consent, sources and claims",
    );
  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".notice.success")).toContainText(
    "approved and ready to schedule",
  );
  await page.getByRole("button", { name: "Continue" }).click();
}

test("Production acceptance C — trigger through shared highlighted calendar and audit", async ({
  page,
}) => {
  await reset(page, "/marketing?triggerId=MKT-003", "Marketing Manager");
  await expect(page.getByText("1. What changed")).toBeVisible();
  await expect(page.getByText("10. Uncertainty")).toBeVisible();
  await page.getByRole("button", { name: "View affected customers" }).click();
  await page.getByRole("button", { name: "Create campaign with AVO" }).click();
  await expect(page.getByLabel("Campaign name")).toHaveValue(
    "North value clarity",
  );
  await expect(page.getByLabel("Objective")).toHaveValue(/Re-engage North/);
  await role(page, "Administrator");
  await finishCampaign(page);
  const scheduled = page.waitForResponse((response) =>
    response.url().includes("/api/publish"),
  );
  await page.getByRole("button", { name: "Schedule Campaign" }).click();
  expect((await scheduled).ok()).toBe(true);
  await expect(page).toHaveURL(
    /campaign-calendar\?campaignId=CAM-003&scheduled=1/,
  );
  await expect(
    page.locator(".calendar-record.record-highlight").first(),
  ).toContainText("North value clarity");
  await expect(page.getByText(/Demo Publisher/).first()).toBeVisible();
  await expect(
    page.getByText(/Approved · Demo Administrator/).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Audit Reports" }).click();
  for (const event of [
    "Campaign submitted for approval",
    "Campaign approved",
    "Campaign scheduled",
  ])
    await expect(page.getByText(event, { exact: false }).first()).toBeVisible();
  await page.getByRole("link", { name: "Marketing Intelligence" }).click();
  await expect(
    page.getByRole("heading", { name: /North Food & Beverage decline/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByText("Management Insights")).toBeVisible();
});

test("Production acceptance D — navigation explanations, next actions, mobile and guides", async ({
  page,
}) => {
  await reset(page, "/campaign-studio?step=1", "Administrator");
  await page.getByLabel("Campaign name").fill("");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await expect(page.getByText(/Continue is unavailable because/)).toBeVisible();
  await page.getByLabel("Campaign name").fill("Navigation acceptance campaign");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Campaign name")).toHaveValue(
    "Navigation acceptance campaign",
  );
  await page.goto("/overview");
  await expect(page.getByLabel("Demo account")).toHaveValue("Administrator");
  await page.getByRole("button", { name: /Scenario A/ }).click();
  for (let index = 0; index < 9; index++)
    await page
      .getByRole("button", {
        name: index === 8 ? "Complete walkthrough" : "Next Step",
      })
      .click();
  await page.goto("/overview");
  await page.getByRole("button", { name: /Scenario C/ }).click();
  for (let index = 0; index < 12; index++)
    await page
      .getByRole("button", {
        name: index === 11 ? "Complete walkthrough" : "Next Step",
      })
      .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await page.getByLabel("Toggle navigation").click();
  await expect(page.getByRole("link", { name: "Data Imports" })).toBeVisible();
  await page.getByRole("link", { name: "Data Imports" }).click();
  await expect(page.locator(".workflow-steps")).toBeVisible();
});
