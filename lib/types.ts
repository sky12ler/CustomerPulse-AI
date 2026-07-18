export type Tier = "Strategic" | "Core" | "Growth" | "Standard";
export type Risk = "Critical" | "High" | "Medium" | "Low";
export type Sentiment = "Positive" | "Neutral" | "Negative";
export type Role =
  | "Administrator"
  | "Sales Manager"
  | "Marketing Manager"
  | "Account Executive"
  | "Auditor";

export interface Message {
  id: string;
  sender: "customer" | "staff";
  senderName: string;
  text: string;
  sentAt: string;
  channel: "WhatsApp" | "Email" | "Support chat";
  evidence?: boolean;
}
export interface Customer {
  id: string;
  datasetId?: "demo" | "imported";
  sourceType?: string;
  sourceFileName?: string;
  importBatchId?: string;
  importedBy?: string;
  importedAt?: string;
  originalExternalId?: string;
  name: string;
  company: string;
  industry: string;
  region: string;
  staff: string;
  email: string;
  phone: string;
  tier: Tier;
  tierScore: number;
  risk: Risk;
  riskScore: number;
  confidence: number;
  ltv: number;
  revenueAtRisk: number;
  sentiment: Sentiment;
  consent: boolean;
  preferredChannel: string;
  lastPurchase: string;
  frequencyTrend: number;
  spendTrend: number;
  products: string[];
  productGap?: string;
  alerts: number;
  status: string;
  scenario?: "A" | "B" | "C" | "D";
  messages: Message[];
}
export interface AuditEvent {
  id: string;
  actor: string;
  role: Role;
  action: string;
  entity: string;
  result: string;
  at: string;
  correlationId: string;
}
export interface Recommendation {
  id: string;
  customerId: string;
  action: string;
  explanation: string;
  priority: string;
  status: string;
  channel: string;
  confidence: string;
  owner: string;
  deadline: string;
}
