import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const mock = (name: string) => path.join(process.cwd(), "mock-data", name);
const fixture = (name: string) =>
  path.join(process.cwd(), "e2e", "fixtures", name);
const signInAs = (page: Page, role: string) =>
  page.getByLabel("Demo account").selectOption(role);
async function clean(page: Page, route = "/overview", role = "Administrator") {
  await page.goto(route);
  await page.evaluate(() => {
    localStorage.removeItem("customerpulse-demo-v2");
    localStorage.removeItem("customerpulse-imported-projects-v1");
  });
  await page.reload();
  await signInAs(page, role);
}
async function upload(
  page: Page,
  kind: string,
  filename: string,
  source = mock(filename),
) {
  if (await page.getByLabel("Active workspace").isVisible()) {
    await page.getByLabel("Active workspace").selectOption("imported");
    if (!(await page.getByLabel("Active imported project").inputValue())) {
      await page.getByLabel("Project name").fill("Release Test Project");
      await page.getByRole("button", { name: "Create Project", exact: true }).click();
    }
  }
  await page.getByLabel("Import type").selectOption(kind);
  await page.getByRole("button", { name: "Continue" }).click();
  const response = page.waitForResponse(
    (result) =>
      result.url().includes("/api/imports/validate") &&
      result.request().method() === "POST",
  );
  await page.getByLabel("Import file").setInputFiles(source);
  expect([200, 422]).toContain((await response).status());
}
async function confirmImport(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/I confirm/).check();
  await page.getByRole("button", { name: "Confirm Import" }).click();
}
async function submitMaya(page: Page, requester = "Account Executive") {
  await clean(page, "/recommendations?recommendationId=REC-001", requester);
  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(page.locator(".success-panel")).toContainText(
    "Recommendation submitted to Sales Manager",
  );
  await page.getByRole("button", { name: "View Retention Action" }).click();
}
async function completeCampaign(page: Page) {
  await clean(
    page,
    "/campaign-studio?triggerId=MKT-003&step=1",
    "Administrator",
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Generate content with AVO" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (const label of [
    "Audience reviewed",
    "Consent reviewed",
    "Sources reviewed",
    "Content reviewed",
    "Claims reviewed",
    "Schedule reviewed",
  ])
    await page.getByLabel(label).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Campaign reviewer comment")
    .fill("Audience, sources, consent and claims verified");
  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".notice.success")).toContainText(
    "approved and ready to schedule",
  );
  await page.getByRole("button", { name: "Continue" }).click();
}

test("1 role persists between routes and refresh", async ({ page }) => {
  await clean(page, "/overview", "Marketing Manager");
  await page.getByRole("link", { name: "Campaign Studio" }).click();
  await expect(page.getByLabel("Demo account")).toHaveValue(
    "Marketing Manager",
  );
  await page.reload();
  await expect(page.getByLabel("Demo account")).toHaveValue(
    "Marketing Manager",
  );
  await expect(page.getByText("Access restricted")).toHaveCount(0);
});

test("2 Administrator uploads customers.csv", async ({ page }) => {
  await clean(page, "/imports");
  await upload(page, "customers", "customers.csv");
  await expect(page.getByText(/30 valid/)).toBeVisible();
});

test("3 Sales Manager uploads conversations.csv", async ({ page }) => {
  await clean(page, "/imports", "Sales Manager");
  await upload(page, "conversations", "conversations.csv");
  await expect(page.getByText(/valid/).first()).toBeVisible();
});

test("4 Marketing Manager uploads product-catalogue.pdf", async ({ page }) => {
  await clean(page, "/imports", "Marketing Manager");
  await upload(page, "product_catalogue", "product-catalogue.pdf");
  await expect(page.getByText("Document metadata")).toBeVisible();
  await expect(page.getByText(/Classification: Internal/)).toBeVisible();
});

test("5 invalid uploads show understandable errors", async ({ page }) => {
  await clean(page, "/imports");
  await upload(
    page,
    "customers",
    "invalid-customers.csv",
    fixture("invalid-customers.csv"),
  );
  await expect(page.getByText(/invalid/).first()).toBeVisible();
  await expect(
    page.getByText(
      "Continue is unavailable because the file contains validation errors.",
    ),
  ).toBeVisible();
});

test("6 successful import shows result and next step", async ({ page }) => {
  await clean(page, "/imports");
  await upload(page, "customers", "customers.csv");
  await confirmImport(page);
  await expect(page.locator(".success-panel")).toContainText(
    "Import completed successfully",
  );
  await expect(
    page.getByRole("link", { name: "View Customers" }),
  ).toBeVisible();
  await expect(page.getByText(/IMP-/).first()).toBeVisible();
});

test("7 recommendation creates Pending Approval action", async ({ page }) => {
  await submitMaya(page);
  await expect(page.locator("#ACT-021")).toContainText("Pending Approval");
});

test("8 recommendation navigates to and highlights exact action", async ({
  page,
}) => {
  await submitMaya(page);
  await expect(page).toHaveURL(/actions\?actionId=ACT-021/);
  await expect(page.locator("#ACT-021")).toHaveClass(/record-highlight/);
});

test("9 self-approval is blocked", async ({ page }) => {
  await submitMaya(page, "Administrator");
  await page.getByLabel("Reviewer comment").fill("Checked");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".notice.danger")).toContainText(
    "cannot approve their own action",
  );
});

test("10 approved action becomes Approved and Ready", async ({ page }) => {
  await submitMaya(page);
  await signInAs(page, "Sales Manager");
  await page.getByLabel("Reviewer comment").fill("Evidence and policy checked");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".notice.success")).toContainText(
    "approved and ready for execution",
  );
  await expect(page.locator("#ACT-021")).toContainText("Ready");
});

test("11 action cannot execute before approval", async ({ page }) => {
  await submitMaya(page);
  await expect(
    page.getByRole("button", { name: /Execute Approved/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Approval is required|manager-reviewed action/).first(),
  ).toBeVisible();
});

test("12 marketing trigger prefills campaign", async ({ page }) => {
  await clean(page, "/marketing", "Marketing Manager");
  await page.getByRole("button", { name: "Create campaign with AVO" }).click();
  await expect(page).toHaveURL(/triggerId=MKT-003/);
  await expect(page.getByLabel("Campaign name")).toHaveValue(
    "North value clarity",
  );
  await expect(page.getByLabel("Objective")).toHaveValue(/Re-engage North/);
});

test("13 wizard blocks incomplete steps with explanation", async ({ page }) => {
  await clean(page, "/campaign-studio?step=1");
  await page.getByLabel("Campaign name").fill("");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await expect(page.getByText(/Continue is unavailable because/)).toBeVisible();
});

test("14 campaign draft persists after refresh", async ({ page }) => {
  await clean(page, "/campaign-studio?step=1");
  await page.getByLabel("Campaign name").fill("Persistent North campaign");
  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.reload();
  await expect(page.getByLabel("Campaign name")).toHaveValue(
    "Persistent North campaign",
  );
});

test("15 campaign requires approval before scheduling", async ({ page }) => {
  await clean(page, "/campaign-studio?step=7");
  await expect(
    page.getByRole("button", { name: "Schedule Campaign" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Schedule is unavailable because campaign approval is pending.",
    ),
  ).toBeVisible();
});

test("16 scheduled campaign creates one ScheduledPost per channel", async ({
  page,
}) => {
  await completeCampaign(page);
  const responses: Promise<unknown>[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/publish"))
      responses.push(Promise.resolve(response));
  });
  await page.getByRole("button", { name: "Schedule Campaign" }).click();
  await expect(page).toHaveURL(/campaign-calendar\?campaignId=CAM-003/);
  await expect(page.getByText("POST-CAM-003-LINKEDIN")).toBeVisible();
  await expect(page.getByText("POST-CAM-003-EMAIL")).toBeVisible();
});

test("17 scheduled campaign appears in shared calendar", async ({ page }) => {
  await completeCampaign(page);
  await page.getByRole("button", { name: "Schedule Campaign" }).click();
  await expect(page.getByText("North value clarity").first()).toBeVisible();
  await expect(page.getByText(/Demo Publisher/).first()).toBeVisible();
});

test("18 calendar highlights query-parameter campaign", async ({ page }) => {
  await clean(
    page,
    "/campaign-calendar?campaignId=CAM-001",
    "Marketing Manager",
  );
  await expect(page.locator(".calendar-record.record-highlight")).toContainText(
    "Product planning guide",
  );
});

test("19 marketing insight shows evidence and uncertainty", async ({
  page,
}) => {
  await clean(page, "/marketing", "Marketing Manager");
  await expect(page.getByText("5. Supporting evidence")).toBeVisible();
  await expect(page.getByText("10. Uncertainty")).toBeVisible();
  await expect(page.getByText(/correlation is not causation/i)).toBeVisible();
});

test("20 analytics insights and KPIs update with filters", async ({ page }) => {
  await clean(page, "/analytics", "Sales Manager");
  const before = await page
    .locator(".metric-mini", { hasText: "Filtered customers" })
    .innerText();
  await page.getByLabel("Analytics tier").selectOption("Strategic");
  const after = await page
    .locator(".metric-mini", { hasText: "Filtered customers" })
    .innerText();
  expect(after).not.toBe(before);
  await expect(page.getByText("Management Insights")).toBeVisible();
});

test("21 audit captures requester approver executor chain", async ({
  page,
}) => {
  await submitMaya(page);
  await signInAs(page, "Sales Manager");
  await page.getByLabel("Reviewer comment").fill("Verified");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await signInAs(page, "Account Executive");
  await page.getByRole("button", { name: "Start Action" }).click();
  await page.getByRole("button", { name: "Confirm Execution" }).click();
  await page.getByRole("link", { name: "Audit Reports" }).click();
  await expect(
    page
      .getByText("Recommendation submitted for approval", { exact: false })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText("Retention action approved", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Retention execution confirmed", { exact: false }).first(),
  ).toBeVisible();
});

test("22 Scenario A walkthrough completes", async ({ page }) => {
  await clean(page);
  await page.getByRole("button", { name: /Scenario A/ }).click();
  for (let i = 0; i < 9; i++)
    await page
      .getByRole("button", {
        name: i === 8 ? "Complete walkthrough" : "Next Step",
      })
      .click();
  await expect(page.locator(".walkthrough-panel")).toHaveCount(0);
});

test("23 Scenario C walkthrough completes", async ({ page }) => {
  await clean(page);
  await page.getByRole("button", { name: /Scenario C/ }).click();
  for (let i = 0; i < 12; i++)
    await page
      .getByRole("button", {
        name: i === 11 ? "Complete walkthrough" : "Next Step",
      })
      .click();
  await expect(page.locator(".walkthrough-panel")).toHaveCount(0);
});

test("24 mobile workflow remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await clean(page);
  await page.getByLabel("Toggle navigation").click();
  await page.getByRole("link", { name: "Data Imports" }).click();
  await expect(
    page.getByRole("heading", { name: "Data Import Centre" }),
  ).toBeVisible();
  await expect(page.locator(".workflow-steps")).toBeVisible();
});

test("25 Scenario B keeps a grounded Growth draft", async ({ page }) => {
  await clean(
    page,
    "/recommendations?recommendationId=REC-002",
    "Account Executive",
  );
  await expect(page.getByLabel("Recommendation message draft")).toHaveValue(
    /Hi Ethan/,
  );
  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(page.locator(".success-panel")).toContainText(
    "submitted to Sales Manager",
  );
});

test("26 Scenario D reports observed successful recovery", async ({ page }) => {
  await clean(page, "/analytics", "Auditor");
  await expect(
    page.getByRole("heading", { name: "Recovery monitoring · Omar Aziz" }),
  ).toBeVisible();
  await expect(page.getByText(/Risk recalculated to High · 68/)).toBeVisible();
  await expect(
    page.getByText(/No new outcome recorded in this session/),
  ).toBeVisible();
});
