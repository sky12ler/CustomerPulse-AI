import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const root = process.cwd(),
  out = path.join(root, "mock-data"),
  previews = path.join(root, "tmp", "pdfs");
await fs.mkdir(previews, { recursive: true });
const navy = rgb(22 / 255, 50 / 255, 79 / 255),
  teal = rgb(25 / 255, 118 / 255, 110 / 255),
  muted = rgb(85 / 255, 105 / 255, 118 / 255),
  line = rgb(0.88, 0.9, 0.88);
const docs = {
  "retention-playbook.pdf": [
    "Customer Retention Playbook",
    "Approved synthetic playbook for grounded AVO recommendations.",
    [
      [
        "1. Evidence before intervention",
        "Review transactions, valid message IDs, complaints, consent, and prior actions. If evidence is insufficient, say: Insufficient evidence - staff review required.",
      ],
      [
        "2. Service recovery first",
        "Resolve or clearly progress service and delivery complaints before suggesting a promotion. Promotional messages must not distract from a missed promise.",
      ],
      [
        "3. Escalation guide",
        "Critical risk, cancellation language, severe complaints, or two missed commitments require manager review within 24 hours. High risk requires review within 48 hours.",
      ],
      [
        "4. Cross-sell guide",
        "Cross-sell only when a customer expresses a relevant need, the approved catalogue supports it, availability is verified, and consent permits the selected channel.",
      ],
      [
        "5. Outcome recording",
        "Record executor, execution time, response, outcome, and later purchases. Recalculate risk deterministically; AVO cannot override a score.",
      ],
    ],
  ],
  "customer-service-policy.pdf": [
    "Customer Service Policy",
    "Approved synthetic service recovery and communication policy.",
    [
      [
        "1. Customer commitments",
        "Commitments need a realistic deadline. Missed deadlines are recorded and escalated; customer drafts must acknowledge them plainly.",
      ],
      [
        "2. Permitted recovery",
        "Staff may apologise, investigate, update status, arrange a policy-permitted replacement, or escalate. Discounts and compensation require manager approval.",
      ],
      [
        "3. Consent and channels",
        "Private outreach requires recorded consent. The platform may open approved WhatsApp or email links but must not send automatically.",
      ],
      [
        "4. Safe claims",
        "Do not guarantee delivery, availability, savings, or outcomes. Verify prices, promotion dates, consent and inventory before approval.",
      ],
      [
        "5. Human responsibility",
        "AVO gives evidence-linked assistance. An authorised employee remains responsible for every decision, approval, message and execution.",
      ],
    ],
  ],
  "product-catalogue.pdf": [
    "Approved Product Catalogue",
    "Synthetic catalogue for validating AVO product and campaign claims.",
    [
      [
        "Enterprise Support - PRD-001",
        "Priority support and governed service review. Standard price: MYR 24,000. Available. No active promotion.",
      ],
      [
        "Cloud Workspace - PRD-002",
        "Secure shared workspace for distributed teams. Standard price: MYR 12,000. Available.",
      ],
      [
        "Analytics Suite - PRD-003",
        "Campaign and customer performance dashboards. Standard price: MYR 18,000. Promotion: MYR 16,500 from 1 July through 31 July 2026 only. Available.",
      ],
      [
        "Retail Essentials - PRD-004",
        "Order and retail operations toolkit. Standard price: MYR 9,600. Available.",
      ],
      [
        "Inventory Optimizer - PRD-005",
        "Planning views for inventory demand and movement. Standard price: MYR 14,400. Limited; verify availability before making a claim.",
      ],
      [
        "Team Workspace - PRD-006",
        "Collaboration workspace for growing teams. Standard price: MYR 7,200. Available.",
      ],
    ],
  ],
  "marketing-guidelines.pdf": [
    "Marketing Guidelines",
    "Approved synthetic guidance for grounded campaign creation.",
    [
      [
        "1. Approved audiences",
        "Target only customers with active marketing consent. Exclude absent or withdrawn consent before scheduling.",
      ],
      [
        "2. Claims and sources",
        "Every product, price, promotion, date, inventory and outcome claim needs an approved source. Never invent scarcity, savings, quotations or guarantees.",
      ],
      [
        "3. Tone",
        "Use clear, helpful and non-pressuring language. Invite learning or staff contact. Do not say an uncertain customer will churn.",
      ],
      [
        "4. Channel adaptation",
        "LinkedIn is concise and professional; Instagram visual and accessible; email has a truthful subject; WhatsApp is brief and consented.",
      ],
      [
        "5. Approval and publishing",
        "AVO output remains Draft. A Marketing Manager reviews facts and approves the campaign and schedule before Buffer or Demo Publisher is called.",
      ],
    ],
  ],
};
function wrap(text, max = 92) {
  const words = text.split(" "),
    lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > max) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}
for (const [filename, [title, subtitle, sections]] of Object.entries(docs)) {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([595, 842]),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText("SYNTHETIC DEMO SOURCE", {
    x: 52,
    y: 790,
    size: 9,
    font: bold,
    color: teal,
  });
  page.drawText(title, { x: 52, y: 747, size: 26, font: bold, color: navy });
  page.drawText(subtitle, {
    x: 52,
    y: 722,
    size: 10,
    font: regular,
    color: muted,
  });
  let y = 675;
  for (const [heading, body] of sections) {
    page.drawText(heading, { x: 52, y, size: 14, font: bold, color: teal });
    y -= 22;
    for (const ln of wrap(body)) {
      page.drawText(ln, { x: 52, y, size: 9.4, font: regular, color: navy });
      y -= 15;
    }
    y -= 14;
  }
  page.drawLine({
    start: { x: 52, y: 42 },
    end: { x: 543, y: 42 },
    thickness: 1,
    color: line,
  });
  page.drawText("CustomerPulse AI - Synthetic Demo Data", {
    x: 52,
    y: 26,
    size: 8,
    font: regular,
    color: muted,
  });
  page.drawText("Page 1", {
    x: 505,
    y: 26,
    size: 8,
    font: regular,
    color: muted,
  });
  await fs.writeFile(path.join(out, filename), await pdf.save());
  const svg = `<svg width="595" height="842" xmlns="http://www.w3.org/2000/svg"><rect width="595" height="842" fill="#fff"/><text x="52" y="52" font-family="Arial" font-size="9" font-weight="700" fill="#19766e">SYNTHETIC DEMO SOURCE</text><text x="52" y="95" font-family="Arial" font-size="26" font-weight="700" fill="#16324f">${title}</text><text x="52" y="120" font-family="Arial" font-size="10" fill="#667085">${subtitle}</text>${sections
    .map(
      (s, i) =>
        `<text x="52" y="${170 + i * 112}" font-family="Arial" font-size="14" font-weight="700" fill="#19766e">${s[0]}</text>${wrap(
          s[1],
          88,
        )
          .map(
            (l, j) =>
              `<text x="52" y="${193 + i * 112 + j * 15}" font-family="Arial" font-size="9.4" fill="#16324f">${l.replaceAll("&", "&amp;")}</text>`,
          )
          .join("")}`,
    )
    .join(
      "",
    )}<line x1="52" y1="800" x2="543" y2="800" stroke="#dfe5e1"/><text x="52" y="820" font-family="Arial" font-size="8" fill="#667085">CustomerPulse AI - Synthetic Demo Data</text></svg>`;
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(previews, filename.replace(".pdf", "-preview.png")));
}
const campaign = `<svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="628" fill="#16324f"/><rect x="70" y="70" width="1060" height="488" rx="34" fill="#f8f9f5"/><rect x="105" y="108" width="230" height="42" rx="21" fill="#dff3ec"/><text x="128" y="136" font-family="Arial" font-size="20" font-weight="700" fill="#19766e">SYNTHETIC DEMO</text><text x="108" y="255" font-family="Arial" font-size="58" font-weight="700" fill="#16324f">Make every order</text><text x="108" y="327" font-family="Arial" font-size="58" font-weight="700" fill="#19766e">work harder.</text><text x="110" y="414" font-family="Arial" font-size="28" fill="#3c4e5b">Clearer inventory insight, grounded</text><text x="110" y="456" font-family="Arial" font-size="28" fill="#3c4e5b">in the approved product catalogue.</text><circle cx="995" cy="250" r="75" fill="#69d2bd"/><circle cx="925" cy="375" r="75" fill="#dd684d"/><circle cx="1020" cy="415" r="65" fill="#e3a12b"/></svg>`;
await sharp(Buffer.from(campaign))
  .png()
  .toFile(path.join(out, "existing-campaign.png"));
console.log("Generated 4 PDFs, 4 previews, and campaign PNG");
