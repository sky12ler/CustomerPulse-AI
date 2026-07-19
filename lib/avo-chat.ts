export interface AvoChatContext {
  workspace: "demo" | "imported";
  role: string;
  customers: Array<{
    id: string;
    name: string;
    company: string;
    tier: string;
    risk: string;
    riskScore: number;
    revenueAtRisk: number;
    staff: string;
    sentiment: string;
  }>;
  alerts: Array<{
    id: string;
    customerId: string;
    status: string;
    trigger: string;
    currentRisk: string;
  }>;
  actions: Array<{
    id: string;
    customerId: string;
    customer: string;
    status: string;
    owner: string;
    action: string;
  }>;
  campaigns: Array<{ id: string; name: string; status: string }>;
  opportunities: Array<{
    id: string;
    title: string;
    affectedPercentage: number;
    confidence: string;
  }>;
}

const money = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);

export function deterministicChatAnswer(
  question: string,
  context: AvoChatContext,
): string {
  const q = question.trim().toLowerCase();
  if (/^(hi|hello|hey|good (morning|afternoon|evening))[!. ]*$/.test(q))
    return `Hello! I can answer questions about the ${context.workspace === "demo" ? "Synthetic Demo" : "Imported"} Workspace records you can access. Try asking for the highest-risk customer, pending approvals, a customer summary, or the strongest segment opportunity.`;

  if (/highest|greatest|top/.test(q) && /risk|churn/.test(q)) {
    const customer = [...context.customers].sort(
      (a, b) => b.riskScore - a.riskScore || b.revenueAtRisk - a.revenueAtRisk,
    )[0];
    return customer
      ? `${customer.name} (${customer.id}) is the highest-risk accessible customer: ${customer.risk}, ${customer.riskScore}/100, with estimated revenue at risk of ${money(customer.revenueAtRisk)}. This is the current deterministic score, not a prediction of certain churn.`
      : "There are no accessible customers in the active workspace. Import customer data first.";
  }

  if (/strategic/.test(q) && /risk|churn/.test(q)) {
    const matches = context.customers.filter(
      (customer) =>
        customer.tier === "Strategic" &&
        ["High", "Critical"].includes(customer.risk),
    );
    return matches.length
      ? `${matches.length} Strategic customer${matches.length === 1 ? " is" : "s are"} High/Critical risk: ${matches.map((customer) => `${customer.name} (${customer.id}, ${customer.risk} ${customer.riskScore}/100)`).join("; ")}.`
      : "No accessible Strategic customer is currently High or Critical risk.";
  }

  if (/approval|awaiting review|pending/.test(q)) {
    const actions = context.actions.filter((item) => item.status === "Pending Approval");
    const campaigns = context.campaigns.filter(
      (item) => item.status === "Pending Approval",
    );
    return `${actions.length} retention action${actions.length === 1 ? "" : "s"} and ${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} await approval.${actions.length ? ` Actions: ${actions.map((item) => `${item.id} for ${item.customer}`).join(", ")}.` : ""} I can summarize them, but only an authorised reviewer can decide.`;
  }

  if (/segment|marketing|decline|opportunity/.test(q)) {
    const opportunity = [...context.opportunities].sort(
      (a, b) => b.affectedPercentage - a.affectedPercentage,
    )[0];
    return opportunity
      ? `${opportunity.title} (${opportunity.id}) is the strongest calculated opportunity: ${opportunity.affectedPercentage}% affected with ${opportunity.confidence} confidence. Review its evidence and consent-safe audience before creating a campaign.`
      : "No calculated marketing opportunity currently crosses the configured thresholds.";
  }

  const named = context.customers.find((customer) =>
    q.includes(customer.name.toLowerCase()),
  );
  if (named)
    return `${named.name} (${named.id}) is ${named.tier} tier and ${named.risk} risk at ${named.riskScore}/100. Sentiment is ${named.sentiment}; owner is ${named.staff}; estimated revenue at risk is ${money(named.revenueAtRisk)}. Open Customer 360 for source evidence and calculation details.`;

  return "I can have a normal conversation and answer grounded operational questions. Ask me about the highest-risk customer, a named customer, pending approvals, segment opportunities, alerts, or what to do next. I will not approve or execute actions.";
}
