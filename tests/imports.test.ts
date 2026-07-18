import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { validateImportFile } from "@/lib/imports";

const root = path.join(process.cwd(), "mock-data");
const cases = [
  ["customers.csv", "customers", 30],
  ["transactions.csv", "transactions", 30],
  ["conversations.csv", "conversations", 10],
  ["conversations.json", "conversations", 3],
  ["products.csv", "products", 6],
  ["campaign-results.csv", "campaign_results", 3],
  ["retention-playbook.pdf", "retention_playbook", 1],
  ["customer-service-policy.pdf", "customer_service_policy", 1],
  ["product-catalogue.pdf", "product_catalogue", 1],
  ["marketing-guidelines.pdf", "marketing_guidelines", 1],
  ["existing-campaign.png", "campaign_asset", 1],
] as const;
describe("all permanent mock imports", () => {
  for (const [file, kind, min] of cases)
    it(`parses and validates ${file}`, async () => {
      const data = await readFile(path.join(root, file));
      const result = await validateImportFile(
        file,
        "application/octet-stream",
        data,
      );
      expect(result.valid, result.errors.map((e) => e.message).join("; ")).toBe(
        true,
      );
      expect(result.kind).toBe(kind);
      expect(result.validCount).toBeGreaterThanOrEqual(min);
      if (file.endsWith(".pdf")) {
        expect(result.extractedText?.length).toBeGreaterThan(100);
        expect(result.pages).toBeGreaterThanOrEqual(1);
        expect(result.chunks?.length).toBeGreaterThan(0);
      }
    });
  it("parses XLSX customer templates", async () => {
    const wb = new ExcelJS.Workbook(),
      ws = wb.addWorksheet("customers");
    ws.addRow([
      "customer_external_id",
      "customer_name",
      "company_name",
      "industry",
      "region",
      "assigned_staff_email",
      "email",
      "phone",
      "preferred_channel",
      "consent_status",
      "customer_since",
    ]);
    ws.addRow([
      "X-1",
      "XLSX Demo",
      "Workbook Co (Demo)",
      "Testing",
      "Central",
      "account.executive@customerpulse.demo",
      "xlsx@synthetic.example",
      "601100000000",
      "Email",
      "granted",
      "2026-01-01",
    ]);
    const data = await wb.xlsx.writeBuffer();
    const result = await validateImportFile(
      "customers.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      Buffer.from(data),
    );
    expect(result.valid).toBe(true);
    expect(result.kind).toBe("customers");
    expect(result.validCount).toBe(1);
  });
  it("extracts TXT policy content", async () => {
    const result = await validateImportFile(
      "retention-playbook.txt",
      "text/plain",
      Buffer.from(
        "Approved synthetic recovery policy. Manager approval is required.",
      ),
    );
    expect(result.valid).toBe(true);
    expect(result.extractedText).toContain("Manager approval");
  });
  it("extracts DOCX policy content", async () => {
    const data = await readFile(
      path.join(
        process.cwd(),
        "node_modules/mammoth/test/test-data/single-paragraph.docx",
      ),
    );
    const result = await validateImportFile(
      "retention-playbook.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      data,
    );
    expect(result.valid).toBe(true);
    expect(result.extractedText?.length).toBeGreaterThan(0);
    expect(result.chunks?.length).toBeGreaterThan(0);
  });
  it("reports required fields and duplicates", async () => {
    const csv =
      "customer_external_id,customer_name,assigned_staff_email,email,consent_status,customer_since\nDUP,Demo One,a@demo.example,one@synthetic.example,granted,2026-01-01\nDUP,,a@demo.example,two@synthetic.example,granted,2026-01-01\n";
    const result = await validateImportFile(
      "customers.csv",
      "text/csv",
      Buffer.from(csv),
    );
    expect(result.valid).toBe(false);
    expect(result.duplicateCount).toBe(1);
    expect(result.errors.some((e) => e.field === "customer_name")).toBe(true);
  });
  it("rejects disguised and oversized files", async () => {
    const disguised = await validateImportFile(
      "fake.pdf",
      "application/pdf",
      Buffer.from("not a pdf"),
    );
    expect(disguised.valid).toBe(false);
    const huge = await validateImportFile(
      "huge.txt",
      "text/plain",
      Buffer.alloc(10 * 1024 * 1024 + 1),
    );
    expect(huge.errors[0].code).toBe("size_limit");
  });
});
