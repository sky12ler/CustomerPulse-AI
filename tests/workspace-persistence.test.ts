import { describe, expect, it } from "vitest";
import { audits } from "@/lib/demo-data";
import { createInitialDemoState } from "@/lib/demo-workflow";
import { createDataset } from "@/lib/operational";
import {
  mergeImportedWorkspace,
  snapshotImportedWorkspace,
} from "@/lib/workspace-persistence";

describe("Imported Workspace persistence", () => {
  it("stores imported operational records without copying demo entities", () => {
    const state = createInitialDemoState(audits);
    state.datasets.imported = createDataset("imported", [
      { ...state.datasets.demo.customers[0], id: "IMPORTED-1", datasetId: "imported" },
    ]);
    const snapshot = snapshotImportedWorkspace(state);
    expect(snapshot.dataset.customers[0].id).toBe("IMPORTED-1");
    expect(snapshot.actions.every((item) => item.datasetId === "imported")).toBe(true);
    expect(snapshot.recommendations.every((item) => item.datasetId === "imported")).toBe(true);
  });

  it("merges shared imported records while preserving the demo dataset", () => {
    const local = createInitialDemoState(audits);
    const remote = createInitialDemoState(audits);
    remote.datasets.imported = createDataset("imported", [
      { ...remote.datasets.demo.customers[1], id: "REMOTE-1", datasetId: "imported" },
    ]);
    const merged = mergeImportedWorkspace(local, snapshotImportedWorkspace(remote));
    expect(merged.datasets.imported.customers[0].id).toBe("REMOTE-1");
    expect(merged.datasets.demo.customers).toHaveLength(local.datasets.demo.customers.length);
  });
});
