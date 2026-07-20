import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { DemoAVOProvider } from "@/lib/avo";
import type { ImportKind, ImportResult } from "@/lib/imports";
import { validateImportFile } from "@/lib/imports";
import {
  calculateCampaignAudience,
  calculateMarketingOpportunities,
} from "@/lib/marketing-operational";
import {
  commitOperationalImport,
  createDataset,
  signalsFromAnalysis,
} from "@/lib/operational";

const folder = path.join(process.cwd(), "mock-data/scenarios/alternate-pack");
const csvResult = (file: string, kind: ImportKind): ImportResult => {
  const rows = Papa.parse<Record<string, string>>(
    readFileSync(path.join(folder, file), "utf8"),
    { header: true, skipEmptyLines: true },
  ).data;
  return {
    kind,
    filename: file,
    fileType: "csv",
    size: 1,
    valid: true,
    rowCount: rows.length,
    validCount: rows.length,
    invalidCount: 0,
    duplicateCount: 0,
    headers: Object.keys(rows[0]),
    preview: rows.slice(0, 5),
    records: rows,
    errors: [],
    audit: { action: "validated", result: "success", at: new Date().toISOString() },
  };
};

describe("alternate self-test import pack", () => {
  it("imports all CSV records and produces differentiated operational results", async () => {
    let dataset = createDataset("imported");
    const steps: Array<[string, ImportKind, number]> = [
      ["01-customers-alternate.csv", "customers", 9],
      ["02-transactions-alternate.csv", "transactions", 36],
      ["03-conversations-alternate.csv", "conversations", 11],
      ["04-products-alternate.csv", "products", 5],
    ];
    for (const [file, kind, expected] of steps) {
      const validation = await validateImportFile(
        file,
        "text/csv",
        readFileSync(path.join(folder, file)),
      );
      expect(validation.valid).toBe(true);
      expect(validation.validCount).toBe(expected);
      const committed = commitOperationalImport(dataset, csvResult(file, kind), kind, "Administrator");
      expect(committed.summary).toMatchObject({ added: expected, rejected: 0 });
      dataset = committed.dataset;
    }

    const risks = Object.fromEntries(
      dataset.customers.map((customer) => [customer.id, `${customer.risk}:${customer.riskScore}`]),
    );
    expect(risks).toEqual({
      "ALT-CRISIS-101": "Medium:55",
      "ALT-PRICE-102": "Medium:41",
      "ALT-PRIVATE-103": "Medium:44",
      "ALT-NOPHONE-104": "Medium:44",
      "ALT-DORMANT-105": "High:67",
      "ALT-RECOVER-106": "Low:9",
      "ALT-GROW-107": "Low:9",
      "ALT-QUIET-108": "Low:14",
      "ALT-STABLE-109": "Low:9",
    });

    const opportunities = calculateMarketingOpportunities(dataset, {
      riskSegment: 20,
      revenue: 15,
      frequency: 20,
      engagement: 25,
    });
    const south = opportunities.find((item) => item.segmentKey === "South::Healthcare");
    expect(south).toMatchObject({
      title: "South Healthcare decline",
      totalCustomers: 6,
      affectedPercentage: 83,
      baselineRevenue: 258833,
      currentRevenue: 77842,
      revenueDecline: 70,
      frequencyDecline: 0,
      engagementDecline: 13,
      confidence: "Medium",
    });
    const whatsapp = calculateCampaignAudience(dataset, south!, ["WhatsApp"]);
    expect(whatsapp.total).toBe(6);
    expect(whatsapp.includedCustomerIds).toHaveLength(4);
    expect(whatsapp.exclusions.map((item) => item.customerId).sort()).toEqual([
      "ALT-NOPHONE-104",
      "ALT-PRIVATE-103",
    ]);

    const nadia = dataset.customers.find((item) => item.id === "ALT-CRISIS-101")!;
    const analysis = await new DemoAVOProvider().analyze(nadia);
    expect(analysis.analysis.analysis_confidence).toBe(0.85);
    const analysed = signalsFromAnalysis(dataset, nadia.id, analysis.analysis);
    expect(analysed.rejectedEvidence).toEqual([]);
    expect(analysed.dataset.customers.find((item) => item.id === nadia.id)).toMatchObject({
      risk: "Critical",
      riskScore: 100,
    });

    const umar = dataset.customers.find((item) => item.id === "ALT-QUIET-108")!;
    const weak = await new DemoAVOProvider().analyze(umar);
    expect(weak.analysis.analysis_confidence).toBe(0.45);
    expect(weak.analysis.complaints).toEqual([]);
    expect(weak.analysis.cancellation_signals).toEqual([]);
  });

  it("accepts each PDF as a distinct searchable knowledge source", async () => {
    const expected: Array<[string, ImportKind, string]> = [
      ["alternate-product-catalogue.pdf", "product_catalogue", "Alternate Product Catalogue"],
      ["alternate-customer-service-policy.pdf", "customer_service_policy", "Alternate Service Recovery Policy"],
      ["alternate-marketing-guidelines.pdf", "marketing_guidelines", "Alternate Marketing Guidelines"],
    ];
    for (const [file, kind, title] of expected) {
      const result = await validateImportFile(
        file,
        "application/pdf",
        readFileSync(path.join(folder, file)),
      );
      expect(result.valid).toBe(true);
      expect(result.kind).toBe(kind);
      expect(result.validCount).toBeGreaterThan(0);
      expect(result.extractedText).toContain(title);
    }
  });
});
