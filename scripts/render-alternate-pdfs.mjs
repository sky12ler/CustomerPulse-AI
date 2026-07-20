import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

const root = process.cwd();
const input = path.join(root, "mock-data", "scenarios", "alternate-pack");
const output = path.join(root, "tmp", "pdfs", "alternate-pack", "actual");
const standardFontDataUrl = decodeURI(
  pathToFileURL(`${path.join(root, "node_modules", "pdfjs-dist", "standard_fonts")}${path.sep}`).href,
);
await fs.mkdir(output, { recursive: true });

const files = [
  "alternate-product-catalogue.pdf",
  "alternate-customer-service-policy.pdf",
  "alternate-marketing-guidelines.pdf",
];
for (const file of files) {
  const bytes = new Uint8Array(await fs.readFile(path.join(input, file)));
  const pdf = await getDocument({ data: bytes, standardFontDataUrl }).promise;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    await fs.writeFile(
      path.join(output, `${file.replace(".pdf", "")}-page-${pageNumber}.png`),
      canvas.toBuffer("image/png"),
    );
  }
  console.log(`${file}: ${pdf.numPages} page(s) rendered`);
  await pdf.destroy();
}
