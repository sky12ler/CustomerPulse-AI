import { describe, expect, it } from "vitest";
import { DemoSocialPublisher } from "@/lib/publisher";
describe("Demo Publisher", () => {
  it("enforces approval", async () => {
    const p = new DemoSocialPublisher();
    await expect(
      p.schedule({
        campaignId: "C",
        channelId: "L",
        text: "x",
        dueAt: new Date().toISOString(),
        approved: false,
        idempotencyKey: "not-approved",
      }),
    ).rejects.toThrow("approval");
  });
  it("prevents duplicate scheduling", async () => {
    const p = new DemoSocialPublisher(),
      input = {
        campaignId: "C",
        channelId: "L",
        text: "x",
        dueAt: new Date().toISOString(),
        approved: true,
        idempotencyKey: "unique-key",
      };
    const a = await p.schedule(input),
      b = await p.schedule(input);
    expect(a.id).toBe(b.id);
    expect(a.simulated).toBe(true);
  });
});
