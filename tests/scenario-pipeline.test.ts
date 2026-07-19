import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { ImportKind, ImportResult } from "@/lib/imports";
import { DemoAVOProvider } from "@/lib/avo";
import {
  commitOperationalImport,
  createDataset,
  signalsFromAnalysis,
} from "@/lib/operational";

const scenario = (file: string, kind: ImportKind): ImportResult => {
  const rows = Papa.parse<Record<string, string>>(
    readFileSync(path.join(process.cwd(), "mock-data/scenarios", file), "utf8"),
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

describe("mixed-risk Imported Workspace pipeline", () => {
  it("requires customers first and produces differentiated risk plus validated Alicia AVO signals", async () => {
    const empty = createDataset("imported");
    const premature = commitOperationalImport(
      empty,
      scenario("02-transactions-mixed-risk.csv", "transactions"),
      "transactions",
      "Administrator",
    );
    expect(premature.summary.rejected).toBe(32);

    const customers = commitOperationalImport(
      empty,
      scenario("01-customers-mixed-risk.csv", "customers"),
      "customers",
      "Administrator",
    );
    expect(customers.summary.added).toBe(8);
    const transactions = commitOperationalImport(
      customers.dataset,
      scenario("02-transactions-mixed-risk.csv", "transactions"),
      "transactions",
      "Administrator",
    );
    expect(transactions.summary.rejected).toBe(0);
    const conversations = commitOperationalImport(
      transactions.dataset,
      scenario("03-conversations-mixed-risk.csv", "conversations"),
      "conversations",
      "Administrator",
    );
    expect(conversations.summary.rejected).toBe(0);
    expect(new Set(conversations.dataset.customers.map((item) => item.risk)).size).toBeGreaterThan(1);
    expect(conversations.dataset.customers.some((item) => item.risk !== "Low")).toBe(true);
    expect(
      Object.fromEntries(
        conversations.dataset.customers.map((item) => [
          item.id,
          `${item.risk}:${item.riskScore}`,
        ]),
      ),
    ).toEqual({
      "IMP-RISK-001": "Medium:56",
      "IMP-GROW-002": "Low:12",
      "IMP-PRICE-003": "Medium:46",
      "IMP-NOCONSENT-004": "Medium:45",
      "IMP-QUIET-005": "Medium:41",
      "IMP-STABLE-006": "Low:10",
      "IMP-RECOVER-007": "Low:10",
      "IMP-NOCONTACT-008": "Medium:46",
    });
    expect(
      conversations.dataset.customers.find((item) => item.id === "IMP-RISK-001")?.messages,
    ).toHaveLength(3);
    expect(
      conversations.dataset.customers
        .find((item) => item.id === "IMP-RISK-001")
        ?.messages.every((message) => message.evidence),
    ).toBe(true);
    const alicia = conversations.dataset.customers.find(
      (item) => item.id === "IMP-RISK-001",
    )!;
    const analysis = await new DemoAVOProvider().analyze(alicia);
    expect(analysis.analysis.analysis_confidence).toBe(0.85);
    const analysed = signalsFromAnalysis(
      conversations.dataset,
      alicia.id,
      analysis.analysis,
    );
    expect(analysed.rejectedEvidence).toEqual([]);
    expect(
      analysed.dataset.signals
        .filter((signal) => signal.customerId === alicia.id)
        .every((signal) => signal.validationStatus === "Validated"),
    ).toBe(true);
    expect(
      analysed.dataset.customers.find((item) => item.id === alicia.id),
    ).toMatchObject({ risk: "Critical", riskScore: 100 });
    const emil = conversations.dataset.customers.find(
      (item) => item.id === "IMP-QUIET-005",
    )!;
    const quietAnalysis = await new DemoAVOProvider().analyze(emil);
    expect(quietAnalysis.analysis.analysis_confidence).toBe(0.45);
    expect(quietAnalysis.analysis.complaints).toEqual([]);
    expect(quietAnalysis.analysis.cancellation_signals).toEqual([]);
  });
});
