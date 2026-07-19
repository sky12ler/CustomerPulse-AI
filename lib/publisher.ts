export interface PublishInput {
  campaignId: string;
  channelId: string;
  text: string;
  dueAt: string;
  approved: boolean;
  idempotencyKey: string;
}
export interface PublishResult {
  id: string;
  status: "scheduled" | "sent" | "simulated";
  simulated: boolean;
  dueAt: string;
}
export interface SocialPublisher {
  listChannels(): Promise<{ id: string; name: string; network: string }[]>;
  schedule(input: PublishInput): Promise<PublishResult>;
}
const demoKeys = new Map<string, PublishResult>();
export class DemoSocialPublisher implements SocialPublisher {
  async listChannels() {
    return [
      { id: "demo-linkedin", name: "CustomerPulse Demo", network: "LinkedIn" },
      {
        id: "demo-instagram",
        name: "@customerpulse_demo",
        network: "Instagram",
      },
    ];
  }
  async schedule(i: PublishInput) {
    if (!i.approved) throw new Error("Campaign approval is required");
    const old = demoKeys.get(i.idempotencyKey);
    if (old) return old;
    const result = {
      id: `demo-post-${i.campaignId}`,
      status: "simulated" as const,
      simulated: true,
      dueAt: i.dueAt,
    };
    demoKeys.set(i.idempotencyKey, result);
    return result;
  }
}
export class BufferPublisher implements SocialPublisher {
  private endpoint = "https://api.buffer.com";
  private async request(
    query: string,
    variables: Record<string, unknown> = {},
  ) {
    const r = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BUFFER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!r.ok) throw new Error(`Buffer API ${r.status}`);
    const data = await r.json();
    if (data.errors) throw new Error(data.errors[0]?.message || "Buffer error");
    return data.data;
  }
  async listChannels() {
    const data = await this.request(`query { channels { id name service } }`);
    return data.channels.map(
      (c: { id: string; name: string; service: string }) => ({
        id: c.id,
        name: c.name,
        network: c.service,
      }),
    );
  }
  async schedule(i: PublishInput): Promise<PublishResult> {
    if (!i.approved) throw new Error("Campaign approval is required");
    const data = await this.request(
      `mutation Schedule($input: CreatePostInput!) { createPost(input:$input) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`,
      {
        input: {
          text: i.text,
          channelId: i.channelId,
          schedulingType: "automatic",
          mode: "customScheduled",
          dueAt: i.dueAt,
        },
      },
    );
    if (data.createPost.message) throw new Error(data.createPost.message);
    return {
      id: data.createPost.post.id,
      status: "scheduled",
      simulated: false,
      dueAt: data.createPost.post.dueAt,
    };
  }
}
export function getPublisher(
  requested?: "Demo Publisher" | "Buffer",
): SocialPublisher {
  if (requested === "Buffer" && !process.env.BUFFER_API_KEY)
    throw new Error("Buffer connection required; select Demo Publisher or configure BUFFER_API_KEY");
  if (requested === "Demo Publisher") return new DemoSocialPublisher();
  return process.env.BUFFER_API_KEY ? new BufferPublisher() : new DemoSocialPublisher();
}
