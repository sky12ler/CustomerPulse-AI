import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "mock-data", "scenarios", "alternate-pack");
const previews = path.join(root, "tmp", "pdfs", "alternate-pack");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(previews, { recursive: true });

const navy = rgb(18 / 255, 50 / 255, 74 / 255);
const teal = rgb(15 / 255, 118 / 255, 110 / 255);
const muted = rgb(91 / 255, 104 / 255, 117 / 255);
const pale = rgb(232 / 255, 243 / 255, 241 / 255);
const line = rgb(216 / 255, 225 / 255, 231 / 255);

const documents = {
  "alternate-product-catalogue.pdf": {
    title: "Alternate Product Catalogue",
    subtitle: "Northstar Care Systems | Test edition | Effective 20 July 2026",
    callout: "Use only verified products and claims. Staff approval remains required.",
    sections: [
      ["ALT-PRD-101 - Care Operations Platform", "MYR 4,800. Available. Best fit: workflow consolidation and operational hand-off issues."],
      ["ALT-PRD-102 - Clinical Analytics Review", "MYR 1,250. Available. Best fit: reporting gaps and analytics adoption review."],
      ["ALT-PRD-103 - Compliance Archive", "MYR 780. Limited. Verify availability before mentioning it to a customer."],
      ["ALT-PRD-104 - CareConnect Portal", "MYR 2,400. Available. Best fit: customer portal or self-service requirements."],
      ["ALT-PRD-105 - Priority Recovery Support", "MYR 950. Available. Use only after a verified service failure and manager approval."],
      ["Grounding test", "Nadia may support ALT-PRD-105 recovery. Talia may support discovery for ALT-PRD-102 or ALT-PRD-104. Never invent discounts, guarantees, or stock."],
    ],
  },
  "alternate-customer-service-policy.pdf": {
    title: "Alternate Service Recovery Policy",
    subtitle: "Customer service and retention governance | Version 2.1",
    callout: "Manager approval is required before execution.",
    sections: [
      ["First verified complaint", "Acknowledge the issue, capture evidence, and assign an owner within one business day."],
      ["Repeated complaint", "Create a retention alert and escalate to a manager on the same business day."],
      ["Missed staff commitment", "Record the promised date and actual state, then propose recovery within four working hours."],
      ["Cancellation language", "Create a critical review immediately. Do not pressure the customer or invent a refund."],
      ["Controlled lifecycle", "Draft, Pending Approval, Approved and Ready, In Progress, Waiting for Customer when needed, then Completed. Changes Requested returns to an editable draft."],
      ["Outcome test", "Recovered requires a recorded customer response and completed remedy. Issue unresolved must escalate and must not lower risk automatically."],
    ],
  },
  "alternate-marketing-guidelines.pdf": {
    title: "Alternate Marketing Guidelines",
    subtitle: "Consent-safe campaign rules | South Healthcare decline test",
    callout: "Audience eligibility is recalculated at preview and execution; withdrawn consent is always excluded.",
    sections: [
      ["Calculated opportunity", "Group current customers by region and industry. Require at least four customers and preserve the evidence behind the current-versus-baseline comparison."],
      ["Decline thresholds", "Trigger when affected share is at least 20 percent and spend decline is at least 15 percent. Engagement decline may provide supporting evidence."],
      ["Channel eligibility", "Email requires active consent and an email address. WhatsApp requires active consent and a mobile number."],
      ["Alternate audience test", "South Healthcare has six customers. Priya Restricted is excluded because consent is withdrawn. Quentin No Phone is excluded from WhatsApp because no mobile is available."],
      ["Campaign provenance", "Main navigation opens a blank campaign or list. Starting from an opportunity may prefill only that selected opportunity. Each campaign retains its own approval history."],
      ["Publisher truthfulness", "Demo Publisher must be labelled. Buffer must be disabled when credentials are absent. Cancelled and published states must remain distinct."],
    ],
  },
};

function wrap(text, max = 91) {
  const lines = [];
  let current = "";
  for (const word of text.split(" ")) {
    const candidate = `${current} ${word}`.trim();
    if (candidate.length > max && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

for (const [filename, data] of Object.entries(documents)) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("ALTERNATE IMPORT TEST SOURCE", { x: 52, y: 790, size: 9, font: bold, color: teal });
  page.drawText(data.title, { x: 52, y: 748, size: 24, font: bold, color: navy });
  page.drawText(data.subtitle, { x: 52, y: 724, size: 9.5, font: regular, color: muted });
  page.drawRectangle({ x: 52, y: 657, width: 491, height: 42, color: pale });
  for (const [index, calloutLine] of wrap(data.callout, 88).entries()) {
    page.drawText(calloutLine, { x: 64, y: 680 - index * 13, size: 9.2, font: bold, color: navy });
  }

  let y = 625;
  for (const [heading, body] of data.sections) {
    page.drawText(heading, { x: 52, y, size: 12.5, font: bold, color: teal });
    y -= 19;
    for (const bodyLine of wrap(body)) {
      page.drawText(bodyLine, { x: 52, y, size: 9, font: regular, color: navy });
      y -= 13;
    }
    y -= 10;
  }
  page.drawLine({ start: { x: 52, y: 42 }, end: { x: 543, y: 42 }, thickness: 1, color: line });
  page.drawText("CustomerPulse AI | Synthetic alternate scenario", { x: 52, y: 26, size: 8, font: regular, color: muted });
  page.drawText("Page 1", { x: 505, y: 26, size: 8, font: regular, color: muted });
  await fs.writeFile(path.join(out, filename), await pdf.save());

  let previewY = 218;
  const sectionSvg = data.sections.map(([heading, body]) => {
    const block = `<text x="52" y="${previewY}" font-family="Arial" font-size="13" font-weight="700" fill="#0f766e">${escapeXml(heading)}</text>${wrap(body).map((text, i) => `<text x="52" y="${previewY + 20 + i * 14}" font-family="Arial" font-size="9" fill="#12324a">${escapeXml(text)}</text>`).join("")}`;
    previewY += 54 + (wrap(body).length - 1) * 14;
    return block;
  }).join("");
  const svg = `<svg width="595" height="842" xmlns="http://www.w3.org/2000/svg"><rect width="595" height="842" fill="#fff"/><text x="52" y="52" font-family="Arial" font-size="9" font-weight="700" fill="#0f766e">ALTERNATE IMPORT TEST SOURCE</text><text x="52" y="95" font-family="Arial" font-size="24" font-weight="700" fill="#12324a">${escapeXml(data.title)}</text><text x="52" y="120" font-family="Arial" font-size="9.5" fill="#5b6875">${escapeXml(data.subtitle)}</text><rect x="52" y="143" width="491" height="42" fill="#e8f3f1"/>${wrap(data.callout, 88).map((text, i) => `<text x="64" y="${167 + i * 13}" font-family="Arial" font-size="9.2" font-weight="700" fill="#12324a">${escapeXml(text)}</text>`).join("")}${sectionSvg}<line x1="52" y1="800" x2="543" y2="800" stroke="#d8e1e7"/><text x="52" y="820" font-family="Arial" font-size="8" fill="#5b6875">CustomerPulse AI | Synthetic alternate scenario</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(previews, filename.replace(".pdf", "-preview.png")));
}

console.log(`Created ${Object.keys(documents).length} PDFs in ${out}`);
