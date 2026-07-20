import { describe, expect, it } from "vitest";
import { createInitialDemoState } from "@/lib/demo-workflow";
import { commitOperationalImport } from "@/lib/operational";
import type { ImportResult } from "@/lib/imports";
import {
  mergeImportedWorkspace,
  snapshotImportedWorkspace,
} from "@/lib/workspace-persistence";

const customerImport = (id: string, name: string): ImportResult => ({
  kind: "customers",
  filename: `${name}.csv`,
  fileType: "csv",
  size: 100,
  valid: true,
  rowCount: 1,
  validCount: 1,
  invalidCount: 0,
  duplicateCount: 0,
  headers: [
    "customer_external_id",
    "customer_name",
    "assigned_staff_email",
    "email",
    "consent_status",
    "customer_since",
  ],
  preview: [],
  records: [
    {
      customer_external_id: id,
      customer_name: name,
      company_name: `${name} Company`,
      industry: "Healthcare",
      region: "South",
      assigned_staff_email: "Aisha Rahman",
      email: `${id.toLowerCase()}@example.test`,
      phone: "601100000000",
      preferred_channel: "Email",
      consent_status: "granted",
      customer_since: "2024-01-01",
    },
  ],
  errors: [],
  audit: { action: "validated", result: "success", at: new Date().toISOString() },
});

const stateFor = (id: string, name: string) => {
  const state = { ...createInitialDemoState([]), activeWorkspace: "imported" as const };
  const committed = commitOperationalImport(
    state.datasets.imported,
    customerImport(id, name),
    "customers",
    "Administrator",
  );
  return {
    ...state,
    datasets: { ...state.datasets, imported: committed.dataset },
    imports: [
      {
        id: `IMPORT-${id}`,
        type: "customers",
        filename: `${name}.csv`,
        validCount: 1,
        invalidCount: 0,
        duplicateCount: 0,
        recordsAdded: 1,
        recordsUpdated: 0,
        recordsRejected: 0,
        chunksCreated: 0,
        uploader: "Administrator",
        at: new Date().toISOString(),
        result: customerImport(id, name),
      },
    ],
  };
};

describe("Imported Workspace project isolation", () => {
  it("switches complete project snapshots without mixing customer or import records", () => {
    const original = stateFor("PROJECT-A-001", "Original Customer");
    const alternate = stateFor("PROJECT-B-001", "Alternate Customer");
    const originalSnapshot = snapshotImportedWorkspace(original);
    const alternateSnapshot = snapshotImportedWorkspace(alternate);

    const viewingOriginal = mergeImportedWorkspace(alternate, originalSnapshot);
    expect(viewingOriginal.datasets.imported.customers.map((item) => item.id)).toEqual([
      "PROJECT-A-001",
    ]);
    expect(viewingOriginal.imports.map((item) => item.filename)).toEqual([
      "Original Customer.csv",
    ]);

    const viewingAlternate = mergeImportedWorkspace(viewingOriginal, alternateSnapshot);
    expect(viewingAlternate.datasets.imported.customers.map((item) => item.id)).toEqual([
      "PROJECT-B-001",
    ]);
    expect(viewingAlternate.imports.map((item) => item.filename)).toEqual([
      "Alternate Customer.csv",
    ]);
  });
});
