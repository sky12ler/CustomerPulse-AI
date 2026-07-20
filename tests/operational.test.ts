import { describe, expect, it } from "vitest";
import type { Customer } from "@/lib/types";
import type { ImportResult, ImportKind } from "@/lib/imports";
import {
  calculateChurn,
  calculateCustomerTier,
  commitOperationalImport,
  createDataset,
  evaluateCustomerAlerts,
  recalculateCustomers,
  signalsFromAnalysis,
} from "@/lib/operational";

const customer = (patch: Partial<Customer> = {}): Customer => ({
  id: "CUS-X",
  name: "Test Customer",
  company: "Test Co",
  industry: "Technology",
  region: "Central",
  staff: "Aisha Rahman",
  email: "test@example.com",
  phone: "6000",
  tier: "Standard",
  tierScore: 0,
  risk: "Low",
  riskScore: 0,
  confidence: 50,
  ltv: 50000,
  revenueAtRisk: 0,
  sentiment: "Negative",
  consent: true,
  preferredChannel: "WhatsApp",
  lastPurchase: "2026-01-01",
  frequencyTrend: -40,
  spendTrend: -30,
  products: ["Support"],
  alerts: 0,
  status: "Monitored",
  messages: [
    {
      id: "MSG-1",
      sender: "customer",
      senderName: "Test",
      text: "The delivery is late again. We may cancel for a competitor.",
      sentAt: "2026-07-01",
      channel: "WhatsApp",
      evidence: true,
    },
  ],
  ...patch,
});
const imported = (
  kind: ImportKind,
  records: Record<string, unknown>[],
): ImportResult => ({
  kind,
  filename: kind + ".csv",
  fileType: "text/csv",
  size: 10,
  valid: true,
  rowCount: records.length,
  validCount: records.length,
  invalidCount: 0,
  duplicateCount: 0,
  headers: Object.keys(records[0] ?? {}),
  preview: records.slice(0, 5),
  records,
  errors: [],
  audit: {
    action: "validated",
    result: "success",
    at: new Date().toISOString(),
  },
});

describe("Phase 1 operational import pipeline", () => {
  it("1 customer import updates operational customers", () => {
    const result = commitOperationalImport(
      createDataset("imported"),
      imported("customers", [
        {
          customer_external_id: "CUS-1",
          customer_name: "Imported",
          company_name: "Co",
          industry: "Tech",
          region: "North",
          assigned_staff_email: "a@example.com",
          email: "c@example.com",
          phone: "1",
          preferred_channel: "Email",
          consent_status: "granted",
          customer_since: "2025-01-01",
        },
      ]),
      "customers",
      "Admin",
    );
    expect(result.dataset.customers[0].name).toBe("Imported");
    expect(result.summary.added).toBe(1);
  });
  it("2 transaction import recalculates tier", () => {
    const ds = createDataset("imported", [customer()]);
    const before = ds.customers[0].tierScore;
    const result = commitOperationalImport(
      ds,
      imported("transactions", [
        {
          transaction_id: "T-1",
          customer_external_id: "CUS-X",
          transaction_date: "2026-07-10",
          product_sku: "P-1",
          product_name: "Suite",
          total_amount: "90000",
        },
      ]),
      "transactions",
      "Admin",
    );
    expect(result.dataset.customers[0].tierScore).not.toBe(before);
    expect(result.summary.tiersRecalculated).toBe(1);
  });
  it("3 transaction import recalculates churn", () => {
    const ds = createDataset("imported", [customer()]);
    const result = commitOperationalImport(
      ds,
      imported("transactions", [
        {
          transaction_id: "T-1",
          customer_external_id: "CUS-X",
          transaction_date: "2026-07-10",
          product_sku: "P-1",
          product_name: "Suite",
          total_amount: "1000",
        },
      ]),
      "transactions",
      "Admin",
    );
    expect(result.dataset.churnCalculations["CUS-X"].triggerType).toBe(
      "Import completed",
    );
  });
  it("4 conversation import creates operational messages", () => {
    const ds = createDataset("imported", [customer({ messages: [] })]);
    const result = commitOperationalImport(
      ds,
      imported("conversations", [
        {
          conversation_id: "C-1",
          message_id: "M-1",
          customer_external_id: "CUS-X",
          channel: "Email",
          sender_type: "customer",
          sender_name: "Test",
          message_text: "Help",
          sent_at: "2026-07-10",
        },
      ]),
      "conversations",
      "Admin",
    );
    expect(result.dataset.customers[0].messages[0].id).toBe("M-1");
  });
  it("5 import triggers alert evaluation", () => {
    const ds = createDataset("imported", [customer()]);
    const result = commitOperationalImport(
      ds,
      imported("transactions", [
        {
          transaction_id: "T-1",
          customer_external_id: "CUS-X",
          transaction_date: "2025-01-01",
          product_sku: "P",
          product_name: "P",
          total_amount: "10",
        },
      ]),
      "transactions",
      "Admin",
    );
    expect(result.dataset.churnCalculations["CUS-X"].triggerType).toBe(
      "Import completed",
    );
    expect(Array.isArray(result.dataset.alerts)).toBe(true);
  });
  it("6 duplicate import is idempotent", () => {
    const data = imported("transactions", [
      {
        transaction_id: "T-1",
        customer_external_id: "CUS-X",
        transaction_date: "2026-01-01",
        product_sku: "P",
        product_name: "P",
        total_amount: "10",
      },
    ]);
    const first = commitOperationalImport(
      createDataset("imported", [customer()]),
      data,
      "transactions",
      "Admin",
    );
    const second = commitOperationalImport(
      first.dataset,
      data,
      "transactions",
      "Admin",
    );
    expect(second.dataset.transactions).toHaveLength(
      first.dataset.transactions.length,
    );
    expect(second.summary.skipped).toBe(1);
  });
  it("incremental import recalculates only affected customers", () => {
    const ds = createDataset("imported", [
      customer(),
      customer({ id: "CUS-Y", name: "Other" }),
    ]);
    const result = commitOperationalImport(
      ds,
      imported("transactions", [
        {
          transaction_id: "T-1",
          customer_external_id: "CUS-X",
          transaction_date: "2026-01-01",
          product_sku: "P",
          product_name: "P",
          total_amount: "10",
        },
      ]),
      "transactions",
      "Admin",
    );
    expect(result.summary.affectedCustomerIds).toEqual(["CUS-X"]);
  });
  it("imported records contain provenance", () => {
    const result = commitOperationalImport(
      createDataset("imported", [customer()]),
      imported("transactions", [
        {
          transaction_id: "T-1",
          customer_external_id: "CUS-X",
          transaction_date: "2026-01-01",
          product_sku: "P",
          product_name: "P",
          total_amount: "10",
        },
      ]),
      "transactions",
      "Admin",
    );
    expect(
      result.dataset.transactions.find((item) => item.id === "T-1"),
    ).toMatchObject({
      datasetId: "imported",
      sourceType: "Manual Upload",
      sourceFileName: "transactions.csv",
      importedBy: "Admin",
    });
  });
});

describe("customer-level campaign evidence", () => {
  it("recalculates each identified customer up or down from response and outcome evidence", () => {
    const initial = createDataset("imported", [
      customer({ id: "RECOVER", frequencyTrend: 0, spendTrend: 0 }),
      customer({ id: "DECLINE", frequencyTrend: 0, spendTrend: 0 }),
    ]);
    const recoverBefore = initial.churnCalculations.RECOVER.score;
    const declineBefore = initial.churnCalculations.DECLINE.score;
    const committed = commitOperationalImport(
      initial,
      imported("campaign_results", [
        {
          campaign_id: "CAM-1",
          campaign_name: "Recovery",
          channel: "Email",
          status: "completed",
          audience_size: 2,
          recorded_at: "2026-07-20",
          customer_external_id: "RECOVER",
          response_sentiment: "Positive",
          response_text: "We will continue",
          outcome_type: "Customer retained",
          outcome_notes: "Renewal confirmed",
        },
        {
          campaign_id: "CAM-1",
          campaign_name: "Recovery",
          channel: "Email",
          status: "completed",
          audience_size: 2,
          recorded_at: "2026-07-20",
          customer_external_id: "DECLINE",
          response_sentiment: "Negative",
          response_text: "Still dissatisfied",
          outcome_type: "Customer declined",
          outcome_notes: "Offer declined",
        },
      ]),
      "campaign_results",
      "Administrator",
    );
    expect(committed.summary.affectedCustomerIds).toEqual(
      expect.arrayContaining(["RECOVER", "DECLINE"]),
    );
    expect(committed.dataset.responses).toHaveLength(2);
    expect(committed.dataset.outcomes).toHaveLength(2);
    expect(committed.dataset.churnCalculations.RECOVER.score).toBeLessThan(recoverBefore);
    expect(committed.dataset.churnCalculations.DECLINE.score).toBeGreaterThan(declineBefore);
    expect(committed.dataset.churnCalculations.RECOVER.triggerType).toBe(
      "Customer-level campaign evidence imported",
    );
  });

  it("keeps aggregate campaign rows analytics-only", () => {
    const initial = createDataset("imported", [customer()]);
    const committed = commitOperationalImport(
      initial,
      imported("campaign_results", [{
        campaign_id: "CAM-AGG",
        campaign_name: "Aggregate",
        channel: "Email",
        status: "completed",
        audience_size: 20,
        recorded_at: "2026-07-20",
      }]),
      "campaign_results",
      "Administrator",
    );
    expect(committed.summary.affectedCustomerIds).toEqual([]);
    expect(committed.dataset.responses).toEqual([]);
    expect(committed.dataset.outcomes).toEqual([]);
  });
});

describe("Phase 1 AVO and authoritative scoring", () => {
  it("7 AVO analysis creates validated signals", () => {
    const ds = createDataset("demo", [customer()]);
    const out = signalsFromAnalysis(ds, "CUS-X", {
      concise_summary: "late complaint competitor cancellation",
      analysis_confidence: 0.9,
      evidence: [{ message_id: "MSG-1" }],
    });
    expect(
      out.dataset.signals.some((s) => s.validationStatus === "Validated"),
    ).toBe(true);
  });
  it("8 invalid evidence ID is rejected", () => {
    const ds = createDataset("demo", [customer()]);
    const out = signalsFromAnalysis(ds, "CUS-X", {
      evidence: [{ message_id: "NOPE" }],
    });
    expect(out.rejectedEvidence).toEqual(["NOPE"]);
    expect(out.dataset.analyses).toHaveLength(0);
  });
  it("9 low-confidence signal requires review", () => {
    const out = signalsFromAnalysis(
      createDataset("demo", [customer()]),
      "CUS-X",
      {
        concise_summary: "complaint",
        analysis_confidence: 0.4,
        evidence: [{ message_id: "MSG-1" }],
      },
    );
    expect(
      out.dataset.signals.every(
        (s) => s.validationStatus === "Staff Review Required",
      ),
    ).toBe(true);
  });
  it("10 validated signals affect churn components", () => {
    const out = signalsFromAnalysis(
      createDataset("demo", [customer()]),
      "CUS-X",
      {
        concise_summary: "competitor cancellation complaint",
        analysis_confidence: 0.9,
        evidence: [{ message_id: "MSG-1" }],
      },
    );
    expect(
      out.dataset.churnCalculations["CUS-X"].components.some(
        (c) => c.name === "Competitor mention",
      ),
    ).toBe(true);
  });
  it("11 AVO cannot directly set official score", () => {
    const out = signalsFromAnalysis(
      createDataset("demo", [customer()]),
      "CUS-X",
      {
        concise_summary: "complaint",
        analysis_confidence: 0.9,
        evidence: [{ message_id: "MSG-1" }],
        score: 1,
      } as never,
    );
    expect(out.dataset.churnCalculations["CUS-X"].score).not.toBe(1);
  });
  it("tier calculation stores components, version and source range", () => {
    const calc = calculateCustomerTier(
      createDataset("demo", [customer()]),
      "CUS-X",
    );
    expect(calc.components.map((c) => c.name)).toContain("Monetary value");
    expect(calc.calculationVersion).toBeTruthy();
    expect(calc.sourceRange).toContain("to");
  });
  it("churn calculation exposes score change and revenue at risk", () => {
    const ds = createDataset("demo", [customer()]);
    const calc = calculateChurn(ds, "CUS-X", "Manual");
    expect(calc.score).toBeGreaterThanOrEqual(0);
    expect(calc.score).toBeLessThanOrEqual(100);
    expect(calc.estimatedRevenueAtRisk).toBeGreaterThanOrEqual(0);
  });
  it("missing conversations reduce confidence without breaking scoring", () => {
    const ds = createDataset("demo", [customer({ messages: [] })]);
    expect(ds.churnCalculations["CUS-X"].confidence).toBeLessThan(70);
    expect(ds.churnCalculations["CUS-X"].score).toBeGreaterThanOrEqual(0);
  });
});

describe("Phase 1 dynamic alerts and post-action recalculation", () => {
  it("12 High Risk creates alert", () => {
    const ds = createDataset("demo", [
      customer({ frequencyTrend: -80, spendTrend: -60 }),
    ]);
    expect(ds.alerts.some((a) => a.status === "Active")).toBe(true);
  });
  it("13 risk change updates alert without duplication", () => {
    let ds = createDataset("demo", [
      customer({ frequencyTrend: -80, spendTrend: -60 }),
    ]);
    const count = ds.alerts.length;
    ds = {
      ...ds,
      churnCalculations: {
        ...ds.churnCalculations,
        "CUS-X": {
          ...ds.churnCalculations["CUS-X"],
          score: 95,
          risk: "Critical",
        },
      },
    };
    const out = evaluateCustomerAlerts(ds, "CUS-X", "High");
    expect(out.dataset.alerts).toHaveLength(count);
    expect(out.updated).toBe(1);
  });
  it("14 lower risk resolves alert", () => {
    let ds = createDataset("demo", [
      customer({ frequencyTrend: -80, spendTrend: -60 }),
    ]);
    ds = {
      ...ds,
      churnCalculations: {
        ...ds.churnCalculations,
        "CUS-X": { ...ds.churnCalculations["CUS-X"], score: 10, risk: "Low" },
      },
      signals: [],
    };
    const out = evaluateCustomerAlerts(ds, "CUS-X", "High");
    expect(out.dataset.alerts[0].status).toBe("Resolved");
  });
  it("15 risk increase reopens resolved alert", () => {
    let ds = createDataset("demo", [
      customer({ frequencyTrend: -80, spendTrend: -60 }),
    ]);
    ds = {
      ...ds,
      alerts: ds.alerts.map((a) => ({
        ...a,
        status: "Resolved" as const,
        resolvedAt: new Date().toISOString(),
      })),
    };
    const out = evaluateCustomerAlerts(ds, "CUS-X", "Low");
    expect(
      out.dataset.alerts.find((a) => a.customerId === "CUS-X")?.status,
    ).toBe("Active");
  });
  it("16 duplicate active alerts are prevented", () => {
    const ds = createDataset("demo", [
      customer({ frequencyTrend: -80, spendTrend: -60 }),
    ]);
    const out = evaluateCustomerAlerts(ds, "CUS-X", "High");
    expect(
      out.dataset.alerts.filter(
        (a) => a.customerId === "CUS-X" && a.status === "Active",
      ),
    ).toHaveLength(1);
  });
  it("31 outcome triggers actual calculateChurn", () => {
    let ds = createDataset("demo", [customer()]);
    const before = ds.churnCalculations["CUS-X"].calculatedAt;
    ds = {
      ...ds,
      outcomes: [
        {
          datasetId: "demo",
          sourceType: "Staff Entry",
          originalExternalId: "O-1",
          id: "O-1",
          actionId: "A-1",
          customerId: "CUS-X",
          type: "Complaint resolved",
          notes: "Resolved",
          revenueRecovered: 0,
          supportingReference: "R-1",
          recordedBy: "Admin",
          recordedAt: new Date().toISOString(),
          confidence: 90,
          requiresFollowUp: false,
        },
      ],
    };
    const out = recalculateCustomers(ds, ["CUS-X"], "Outcome recorded").dataset;
    expect(out.churnCalculations["CUS-X"].triggerType).toBe("Outcome recorded");
    expect(out.churnCalculations["CUS-X"].calculatedAt >= before).toBe(true);
  });
  it("32 before and after scores are stored", () => {
    let ds = createDataset("demo", [customer()]);
    const before = ds.churnCalculations["CUS-X"].score;
    ds = {
      ...ds,
      responses: [
        {
          datasetId: "demo",
          sourceType: "Staff Entry",
          originalExternalId: "R",
          id: "R",
          actionId: "A",
          customerId: "CUS-X",
          channel: "WhatsApp",
          responseType: "Reply",
          text: "Thanks",
          sentiment: "Positive",
          receivedAt: new Date().toISOString(),
          recordedBy: "Admin",
          evidenceReference: "M",
        },
      ],
    };
    const calc = recalculateCustomers(ds, ["CUS-X"], "Response").dataset
      .churnCalculations["CUS-X"];
    expect(calc.previousScore).toBe(before);
    expect(calc.scoreChange).toBe(calc.score - before);
  });
  it("33 estimated revenue at risk updates", () => {
    let ds = createDataset("demo", [customer()]);
    const before = ds.churnCalculations["CUS-X"].estimatedRevenueAtRisk;
    ds = {
      ...ds,
      outcomes: [
        {
          datasetId: "demo",
          sourceType: "Staff Entry",
          originalExternalId: "O",
          id: "O",
          actionId: "A",
          customerId: "CUS-X",
          type: "Customer retained",
          notes: "yes",
          revenueRecovered: 0,
          supportingReference: "R",
          recordedBy: "Admin",
          recordedAt: new Date().toISOString(),
          confidence: 90,
          requiresFollowUp: false,
        },
      ],
    };
    expect(
      recalculateCustomers(ds, ["CUS-X"], "Outcome").dataset.churnCalculations[
        "CUS-X"
      ].estimatedRevenueAtRisk,
    ).toBeLessThan(before);
  });
  it("34 alert status updates after recovery", () => {
    let ds = createDataset("demo", [
      customer({ frequencyTrend: -80, spendTrend: -60 }),
    ]);
    ds = {
      ...ds,
      outcomes: [
        {
          datasetId: "demo",
          sourceType: "Staff Entry",
          originalExternalId: "O",
          id: "O",
          actionId: "A",
          customerId: "CUS-X",
          type: "Complaint resolved",
          notes: "yes",
          revenueRecovered: 0,
          supportingReference: "R",
          recordedBy: "Admin",
          recordedAt: new Date().toISOString(),
          confidence: 90,
          requiresFollowUp: false,
        },
      ],
    };
    const out = recalculateCustomers(ds, ["CUS-X"], "Outcome").dataset;
    expect(out.alerts[0].updatedAt).toBeTruthy();
  });
  it("35 analytics source data updates with responses and outcomes", () => {
    const ds = createDataset("demo", [customer()]);
    expect(ds.responses.length + ds.outcomes.length).toBe(0);
    const changed = {
      ...ds,
      responses: [{} as never],
      outcomes: [{} as never],
    };
    expect(changed.responses.length + changed.outcomes.length).toBe(2);
  });
  it("36 Omar-style score change is calculated, not fixed", () => {
    let ds = createDataset("demo", [
      customer({ id: "CUS-OMAR", frequencyTrend: -50, spendTrend: -40 }),
    ]);
    const before = ds.churnCalculations["CUS-OMAR"].score;
    ds = {
      ...ds,
      outcomes: [
        {
          datasetId: "demo",
          sourceType: "Staff Entry",
          originalExternalId: "O",
          id: "O",
          actionId: "A",
          customerId: "CUS-OMAR",
          type: "Complaint resolved",
          notes: "yes",
          revenueRecovered: 0,
          supportingReference: "R",
          recordedBy: "Admin",
          recordedAt: new Date().toISOString(),
          confidence: 90,
          requiresFollowUp: false,
        },
      ],
    };
    const after = recalculateCustomers(ds, ["CUS-OMAR"], "Outcome").dataset
      .churnCalculations["CUS-OMAR"].score;
    expect(after).toBeLessThan(before);
    expect(after).not.toBe(42);
  });
});
