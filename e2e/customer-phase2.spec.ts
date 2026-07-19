import { expect, test, type Page } from "@playwright/test";

async function reset(page: Page, route = "/customers", role = "Administrator") {
  await page.goto(route);
  await page.evaluate(() => localStorage.removeItem("customerpulse-demo-v2"));
  await page.reload();
  await page.getByLabel("Demo account").selectOption(role);
}

test("Phase 2 navigation: semantic links, action, mouse and keyboard", async ({
  page,
}) => {
  await reset(page);
  const maya = page.getByRole("link", { name: "Maya Tan", exact: true });
  await expect(maya).toHaveAttribute("href", /customers\/CUS-1001/);
  await expect(
    page.getByRole("link", { name: "View Customer" }).first(),
  ).toBeVisible();
  await maya.click();
  await expect(page).toHaveURL(/\/customers\/CUS-1001\?tab=overview/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Maya Tan" })).toBeVisible();

  await reset(page);
  const firstRow = page.locator("tr.customer-operational-row").first();
  await firstRow.click({ position: { x: 500, y: 20 } });
  await expect(page).toHaveURL(/\/customers\/CUS-/);
  await reset(page);
  await page.locator("tr.customer-operational-row").first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/customers\/CUS-/);
  await reset(page);
  await page.locator("tr.customer-operational-row").first().focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/\/customers\/CUS-/);
});

test("Phase 2 route states: not found, tabs, breadcrumb and previous-next", async ({
  page,
}) => {
  await reset(page, "/customers/CUS-NOT-REAL");
  await expect(
    page.getByRole("heading", { name: "Customer Not Found" }),
  ).toBeVisible();
  await page.goto("/customers/CUS-1001?tab=conversations&from=%2Fcustomers");
  await expect(
    page.getByRole("tab", { name: "Conversations" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }),
  ).toContainText("Maya Tan");
  await expect(
    page.getByRole("button", { name: "Next Customer" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Conversations" }),
  ).toHaveAttribute("aria-selected", "true");
});

test("Phase 2 filters, sorting and list state survive Customer 360", async ({
  page,
}) => {
  await reset(page);
  await page.getByLabel("Search customer or company").fill("Maya");
  await page.getByLabel("Risk filter").selectOption("Medium");
  await page.getByRole("button", { name: /Estimated revenue at risk/ }).click();
  await expect(page).toHaveURL(/q=Maya/);
  await expect(page).toHaveURL(/risk=Medium/);
  await expect(page).toHaveURL(/sort=revenue/);
  await page.getByRole("link", { name: "Maya Tan", exact: true }).click();
  await page.getByRole("tab", { name: "AVO Insights" }).click();
  await page.getByRole("button", { name: "Back to Customers" }).click();
  await expect(page.getByLabel("Search customer or company")).toHaveValue(
    "Maya",
  );
  await expect(page.getByLabel("Risk filter")).toHaveValue("Medium");
  await expect(page).toHaveURL(/sort=revenue/);
});

test("Phase 2 search, all filters, chips and empty state are accessible", async ({
  page,
}) => {
  await reset(page);
  const search = page.getByLabel("Search customer or company");
  await expect(search).toHaveAttribute("placeholder", "Search 30 customers");
  for (const label of [
    "Tier",
    "Risk",
    "Owner",
    "Region",
    "Industry",
    "Consent",
    "Active alert",
    "Pending action",
    "Overdue action",
    "Sentiment",
    "Customer status",
  ])
    await expect(page.getByLabel(label + " filter")).toBeVisible();
  await page.getByLabel("Tier filter").selectOption({ index: 1 });
  await page.getByLabel("Sentiment filter").selectOption("Negative");
  await expect(page.getByLabel("Active filters")).toContainText("Tier:");
  await expect(page.getByLabel("Active filters")).toContainText(
    "Sentiment: Negative",
  );
  await search.fill("no-customer-can-match-this");
  await expect(
    page.getByRole("heading", {
      name: "No customers match the current search and filters.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear All Filters" }).click();
  await expect(page.locator("tr.customer-operational-row")).toHaveCount(10);
  await search.fill("Maya");
  await expect(
    page.getByRole("button", { name: "Clear customer search" }),
  ).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveValue("");
});

test("Phase 2 summary and pagination update operational results", async ({
  page,
}) => {
  await reset(page);
  await expect(page.getByText("Showing 1-10 of 30 customers")).toBeVisible();
  await page.getByLabel("Rows per page").selectOption("25");
  await expect(page.locator("tr.customer-operational-row")).toHaveCount(25);
  await page.getByRole("button", { name: "Next customer page" }).click();
  await expect(page.getByText("Showing 26-30 of 30 customers")).toBeVisible();
  await page.getByRole("button", { name: "High/Critical Risk" }).click();
  await expect(page).toHaveURL(/risk=High%2CCritical/);
  await expect(
    page.getByText(/Showing \d+ of 30 customers/).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous customer page" }),
  ).toBeDisabled();
});

test("Phase 2 sorting exposes aria-sort and default risk priority", async ({
  page,
}) => {
  await reset(page);
  const risks = await page
    .locator("tr.customer-operational-row td:nth-child(3) .badge")
    .allTextContents();
  const rank: Record<string, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  };
  expect(
    risks.every(
      (value, index) => index === 0 || rank[risks[index - 1]] <= rank[value],
    ),
  ).toBe(true);
  const customerHeader = page
    .locator("table.operational-customer-table th")
    .first();
  await customerHeader.getByRole("button").click();
  await expect(customerHeader).toHaveAttribute("aria-sort", "ascending");
  await customerHeader.getByRole("button").click();
  await expect(customerHeader).toHaveAttribute("aria-sort", "descending");
});

test("Phase 2 ERAR tooltip and Customer 360 calculation details", async ({
  page,
}) => {
  await reset(page);
  const estimate = page
    .getByLabel("Estimated revenue at risk explanation")
    .first();
  await estimate.hover();
  await expect(estimate.getByRole("tooltip")).toContainText(
    "eligible forecast revenue",
  );
  await page.getByRole("link", { name: "Maya Tan", exact: true }).click();
  await expect(
    page.getByText("Eligible revenue base", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Churn probability", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("ERAR-v1", { exact: true })).toBeVisible();
  await expect(page.getByText("Next 90 days", { exact: true })).toBeVisible();
});

test("Phase 2 Account Executive is scoped in list, URL, filter options and AVO API", async ({
  page,
  request,
}) => {
  await reset(page, "/customers", "Account Executive");
  await expect(page.getByLabel("Search customer or company")).toHaveAttribute(
    "placeholder",
    /assigned customers/,
  );
  await expect(
    page.getByRole("link", { name: "Ethan Lim", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Owner filter").locator("option")).toHaveCount(
    2,
  );
  await page.goto("/customers/CUS-1002");
  await expect(
    page.getByRole("heading", { name: "Access Denied" }),
  ).toBeVisible();
  await expect(page.getByText("Ethan Lim", { exact: true })).toHaveCount(0);
  const response = await request.post("/api/avo/analyze", {
    data: { customerId: "CUS-1002", role: "Account Executive" },
  });
  expect(response.status()).toBe(403);
});

test("Phase 2 scoped export excludes inaccessible customers and includes metadata", async ({
  page,
}) => {
  await reset(page, "/customers", "Account Executive");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export View" }).click();
  const stream = await (await downloadPromise).createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain("# Exported:");
  expect(csv).toContain("synthetic=true");
  expect(csv).toContain("ERAR-v1");
  expect(csv).toContain("Maya Tan");
  expect(csv).not.toContain("Ethan Lim");
});

test("Phase 2 Administrator and Sales Manager retain permitted scope", async ({
  page,
}) => {
  for (const selectedRole of ["Administrator", "Sales Manager"]) {
    await reset(page, "/customers", selectedRole);
    await expect(page.getByText("Showing 1-10 of 30 customers")).toBeVisible();
    await page.goto("/customers/CUS-1002");
    await expect(
      page.getByRole("heading", { name: "Ethan Lim" }),
    ).toBeVisible();
  }
});

test("Phase 2 Auditor stays read-only", async ({ page, request }) => {
  await reset(page, "/customers/CUS-1001?tab=avo-insights", "Auditor");
  await expect(
    page.getByRole("button", { name: "Run AVO Analysis" }).first(),
  ).toBeDisabled();
  const response = await request.post("/api/avo/analyze", {
    data: { customerId: "CUS-1001", role: "Auditor" },
  });
  expect(response.status()).toBe(403);
});

test("Phase 2 Overview links to the shared Maya Customer 360 route", async ({
  page,
}) => {
  await reset(page, "/overview");
  await page.getByRole("link", { name: "Maya Tan", exact: true }).click();
  await expect(page).toHaveURL(/\/customers\/CUS-1001/);
  await expect(page.getByRole("heading", { name: "Maya Tan" })).toBeVisible();
});

test("Phase 2 mobile cards replace the table without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reset(page);
  await expect(page.locator(".customer-table-card")).toBeHidden();
  await expect(page.getByLabel("Customer cards")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View Customer Maya Tan" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
