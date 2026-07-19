import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
describe("permanent mock imports", () => {
  const required = [
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
    "README.md",
  ];
  it("contains every permanent file", () =>
    required.forEach((f) =>
      expect(existsSync(path.join(process.cwd(), "mock-data", f)), f).toBe(
        true,
      ),
    ));
  it("contains at least 30 valid synthetic customers", () => {
    const rows = Papa.parse(
      readFileSync(path.join(process.cwd(), "mock-data/customers.csv"), "utf8"),
      { header: true, skipEmptyLines: true },
    ).data as Record<string, string>[];
    expect(rows.length).toBeGreaterThanOrEqual(30);
    expect(
      rows.every((r) => r.customer_external_id && r.customer_name && r.email),
    ).toBe(true);
    expect(rows.every((r) => r.email.endsWith(".example"))).toBe(true);
  });
  it("covers at least twelve months of transaction dates", () => {
    const rows = Papa.parse(
      readFileSync(
        path.join(process.cwd(), "mock-data/transactions.csv"),
        "utf8",
      ),
      { header: true, skipEmptyLines: true },
    ).data as Record<string, string>[];
    const dates = rows.map((r) => new Date(r.transaction_date));
    const months =
      (Math.max(...dates.map(Number)) - Math.min(...dates.map(Number))) /
      2629800000;
    expect(months).toBeGreaterThanOrEqual(12);
  });
  it("contains a connected Imported Workspace multi-scenario pack", () => {
    const root = path.join(process.cwd(), "mock-data/scenarios");
    const files = [
      "01-customers-mixed-risk.csv",
      "02-transactions-mixed-risk.csv",
      "03-conversations-mixed-risk.csv",
      "UPLOAD_MANIFEST.md",
    ];
    files.forEach((file) => expect(existsSync(path.join(root, file)), file).toBe(true));
    const customerRows = Papa.parse(
      readFileSync(path.join(root, files[0]), "utf8"),
      { header: true, skipEmptyLines: true },
    ).data as Record<string, string>[];
    const ids = new Set(customerRows.map((row) => row.customer_external_id));
    const transactionRows = Papa.parse(
      readFileSync(path.join(root, files[1]), "utf8"),
      { header: true, skipEmptyLines: true },
    ).data as Record<string, string>[];
    const conversationRows = Papa.parse(
      readFileSync(path.join(root, files[2]), "utf8"),
      { header: true, skipEmptyLines: true },
    ).data as Record<string, string>[];
    expect(transactionRows.every((row) => ids.has(row.customer_external_id))).toBe(true);
    expect(conversationRows.every((row) => ids.has(row.customer_external_id))).toBe(true);
    expect(customerRows.some((row) => row.consent_status === "withdrawn")).toBe(true);
    expect(customerRows.some((row) => !row.email && !row.phone)).toBe(true);
  });
});
