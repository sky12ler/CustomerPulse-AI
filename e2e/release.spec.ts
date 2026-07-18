import { test, expect } from "@playwright/test";
import path from "node:path";

const mock = (name: string) => path.join(process.cwd(), "mock-data", name);
const signInAs = async (page: import("@playwright/test").Page, role: string) =>
  page.getByLabel("Demo account").selectOption(role);

test("all navigation routes render and RBAC restricts unauthorised settings", async ({
  page,
}) => {
  await page.goto("/overview");
  await signInAs(page, "Administrator");
  const routes: [[string, string], ...Array<[string, string]>] = [
    ["Overview", "Retention intelligence at a glance"],
    ["Alert Centre", "Alert Centre"],
    ["Customers", "Customers"],
    ["Conversations", "Conversations"],
    ["Data Imports", "Data Import Centre"],
    ["AVO", "Ask AVO"],
    ["Recommendations", "AVO Recommendations"],
    ["Retention Actions", "Retention Actions"],
    ["Marketing Intelligence", "Marketing Intelligence"],
    ["Campaign Studio", "Campaign Studio"],
    ["Campaign Calendar", "Campaign Calendar"],
    ["Analytics", "Analytics"],
    ["Data Governance", "Data Governance"],
    ["Audit Reports", "Audit Reports"],
    ["Settings", "Settings"],
  ];
  for (const [link, heading] of routes) {
    await page.getByRole("link", { name: link, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();
  }
  await signInAs(page, "Auditor");
  await expect(page.getByText("Access restricted")).toBeVisible();
});

test("AVO Chat answers with evidence and abstains when unsupported", async ({
  page,
}) => {
  await page.goto("/avo");
  await signInAs(page, "Account Executive");
  await page
    .getByRole("button", { name: "Why is Maya Tan Critical Risk?" })
    .click();
  await expect(
    page.getByText("MSG-A-101", { exact: false }).last(),
  ).toBeVisible();
  await expect(
    page.getByText("does not confirm future churn", { exact: false }),
  ).toBeVisible();
  const input = page.getByPlaceholder(
    "Ask AVO about accessible customers, evidence or approvals",
  );
  await input.fill("Make an unsupported prediction");
  await input.press("Enter");
  await expect(
    page.getByText("insufficient evidence", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("cannot approve or execute actions", { exact: false }),
  ).toBeVisible();
});
test("every permanent mock file passes the manual import workflow", async ({
  page,
}) => {
  await page.goto("/imports");
  await signInAs(page, "Administrator");
  const files = [
    "customers.csv",
    "transactions.csv",
    "conversations.csv",
    "conversations.json",
    "products.csv",
    "campaign-results.csv",
    "retention-playbook.pdf",
    "customer-service-policy.pdf",
    "product-catalogue.pdf",
    "marketing-guidelines.pdf",
    "existing-campaign.png",
  ];
  for (const file of files) {
    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/api/imports/validate") &&
        r.request().method() === "POST",
    );
    await page.getByLabel("Import file").setInputFiles(mock(file));
    expect((await response).status(), file).toBe(200);
    await expect(page.getByText(file, { exact: false }).first()).toBeVisible();
    await page
      .getByRole("button", { name: "Review validation result" })
      .click();
    await expect(
      page.getByText(/valid · 0 duplicates · 0 invalid/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Continue to confirmation" })
      .click();
    await page.getByRole("button", { name: "Confirm import" }).click();
    await expect(page.getByText(file, { exact: false }).last()).toBeVisible();
  }
  await expect(page.getByText("Confirmed session imports")).toBeVisible();
});

test("Scenario A completes analysis, recommendation, approval and guarded outreach", async ({
  page,
}) => {
  await page.goto("/conversations");
  await signInAs(page, "Sales Manager");
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/avo/analyze") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run AVO Analysis" }).click();
  expect((await response).ok()).toBe(true);
  await expect(
    page.getByText("AVO Demo Analysis", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByText("MSG-A-104", { exact: false }).last(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate AVO Recommendation" })
    .click();
  await page.getByText("Recommendations", { exact: true }).first().click();
  await expect(
    page
      .getByText("Resolve both delivery complaints before any promotion", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(
    page.getByText("Pending Approval", { exact: true }).first(),
  ).toBeVisible();
  await page.getByText("Retention Actions", { exact: true }).click();
  await page
    .getByPlaceholder("Record the basis for the decision")
    .fill("Evidence and service policy checked");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(
    page.getByText("Approved", { exact: true }).first(),
  ).toBeVisible();
  const wa = page.getByRole("link", { name: "Open approved WhatsApp" });
  await expect(wa).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/601155501001\?text=/,
  );
  await page.getByRole("button", { name: "Create internal task" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Internal follow-up task created",
  );
  await expect(
    page.getByRole("link", { name: "Trackable recovery page" }),
  ).toHaveAttribute("href", "/r/demo-recovery-cus1001");
  await page.getByText("Audit Reports", { exact: true }).click();
  await expect(
    page.getByText("Retention action approved", { exact: false }).first(),
  ).toBeVisible();
});

test("approval and consent controls cannot be bypassed", async ({
  page,
  request,
}) => {
  await page.goto("/actions");
  await signInAs(page, "Account Executive");
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
  const unapproved = await request.post("/api/publish", {
    data: {
      campaignId: "CAM-X",
      channelId: "demo",
      text: "x",
      dueAt: new Date().toISOString(),
      approved: false,
      idempotencyKey: "blocked",
    },
  });
  expect(unapproved.status()).toBe(422);
  expect((await unapproved.json()).error).toContain("approval");
  await page.getByText("Customers", { exact: true }).first().click();
  await page
    .getByPlaceholder("Search 30 synthetic customers")
    .fill("Noah Demo");
  await page.getByText("Noah Demo", { exact: true }).click();
  await expect(
    page.getByText("Not granted · WhatsApp", { exact: true }),
  ).toBeVisible();
});

test("Scenario B generates a grounded Growth outreach draft", async ({
  page,
}) => {
  await page.goto("/customers");
  await signInAs(page, "Account Executive");
  await page
    .getByPlaceholder("Search 30 synthetic customers")
    .fill("Ethan Lim");
  await page.getByText("Ethan Lim", { exact: true }).click();
  await expect(page.getByText("Product gap:", { exact: false })).toContainText(
    "Analytics Suite",
  );
  const response = page.waitForResponse((r) =>
    r.url().includes("/api/avo/analyze"),
  );
  await page.getByRole("button", { name: "Run AVO Analysis" }).click();
  expect((await response).ok()).toBe(true);
  await expect(
    page.getByText("Product discovery", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate AVO Recommendation" })
    .click();
  await page.getByText("Recommendations", { exact: true }).first().click();
  await page.getByText("REC-002 · Ethan Lim", { exact: true }).click();
  await expect(page.locator("textarea").last()).toHaveValue(/Hi Ethan/);
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(
    page.getByText("Pending Approval", { exact: true }).first(),
  ).toBeVisible();
});

test("Scenario C enforces grounded campaign approval and Demo Publisher scheduling", async ({
  page,
}) => {
  await page.goto("/marketing");
  await signInAs(page, "Marketing Manager");
  await expect(page.getByText("MKT-003", { exact: false })).toBeVisible();
  await expect(page.getByText("Affected customers")).toBeVisible();
  await page.getByRole("button", { name: "Create campaign with AVO" }).click();
  await page.getByRole("button", { name: "Generate with AVO" }).click();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page
    .getByPlaceholder("Record factual and audience review")
    .fill("Sources, consented audience and claims verified");
  await page.getByRole("button", { name: "Approve as manager" }).click();
  await expect(
    page.getByText("Approved", { exact: true }).first(),
  ).toBeVisible();
  const scheduled = page.waitForResponse((r) =>
    r.url().includes("/api/publish"),
  );
  await page
    .getByRole("button", { name: "Schedule approved campaign" })
    .click();
  expect((await scheduled).ok()).toBe(true);
  await expect(
    page.getByText("Scheduled", { exact: true }).first(),
  ).toBeVisible();
  await page.getByText("Campaign Calendar", { exact: true }).click();
  await expect(
    page.getByText("Scheduled", { exact: true }).first(),
  ).toBeVisible();
  await page.getByText("Audit Reports", { exact: true }).click();
  await expect(
    page.getByText("Campaign scheduled", { exact: false }).first(),
  ).toBeVisible();
});

test("Scenario D shows successful recovery and recovered revenue", async ({
  page,
}) => {
  await page.goto("/analytics");
  await signInAs(page, "Auditor");
  await expect(page.getByText("Successful recovery · Omar Aziz")).toBeVisible();
  await expect(
    page.getByText("Risk recalculated to Medium · 42"),
  ).toBeVisible();
  await expect(page.getByText(/Estimated recovered revenue:/)).toBeVisible();
});

test("downloads, filters, governance requests and settings controls perform work", async ({
  page,
}) => {
  await page.goto("/customers");
  await signInAs(page, "Administrator");
  const customerDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export view/ }).click();
  expect((await customerDownload).suggestedFilename()).toBe(
    "customerpulse-customers.csv",
  );
  await page.getByText("Alert Centre", { exact: true }).click();
  await page.getByLabel("Alert risk filter").selectOption("Critical");
  await expect(page.getByText("1 matching alerts")).toBeVisible();
  await page.getByText("Data Governance", { exact: true }).click();
  await page.getByRole("button", { name: "Start request" }).first().click();
  await expect(page.getByText(/Pending authorised review/)).toBeVisible();
  await page.getByText("Settings", { exact: true }).click();
  const high = page.locator('input[type="number"]').first();
  await high.fill("62");
  await page.getByRole("button", { name: "Save thresholds" }).click();
  await expect(page.getByRole("status")).toContainText("saved and audited");
  await page.getByText("Audit Reports", { exact: true }).click();
  const auditDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV" }).click();
  expect((await auditDownload).suggestedFilename()).toBe(
    "customerpulse-audit.csv",
  );
});
