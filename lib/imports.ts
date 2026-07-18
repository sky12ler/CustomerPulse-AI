import Papa from "papaparse";

export type ImportKind =
  | "customers"
  | "transactions"
  | "conversations"
  | "products"
  | "campaign_results"
  | "retention_playbook"
  | "customer_service_policy"
  | "marketing_guidelines"
  | "product_catalogue"
  | "campaign_asset"
  | "document";
export interface ImportError {
  row: number;
  field: string;
  code: string;
  message: string;
  value?: unknown;
}
export interface ImportResult {
  kind: ImportKind;
  filename: string;
  fileType: string;
  size: number;
  valid: boolean;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  headers: string[];
  preview: Record<string, unknown>[];
  errors: ImportError[];
  extractedText?: string;
  pages?: number;
  chunks?: { page: number; chunk: number; location: string; text: string }[];
  audit: { action: string; result: string; at: string };
}

export const templates = {
  customers: [
    "customer_external_id",
    "customer_name",
    "company_name",
    "industry",
    "region",
    "assigned_staff_email",
    "email",
    "phone",
    "preferred_channel",
    "consent_status",
    "customer_since",
  ],
  transactions: [
    "transaction_id",
    "customer_external_id",
    "transaction_date",
    "product_sku",
    "product_name",
    "category",
    "quantity",
    "unit_price",
    "total_amount",
  ],
  conversations: [
    "conversation_id",
    "message_id",
    "customer_external_id",
    "channel",
    "sender_type",
    "sender_name",
    "message_text",
    "sent_at",
  ],
  products: [
    "product_sku",
    "product_name",
    "category",
    "description",
    "standard_price",
    "promotion_price",
    "promotion_start",
    "promotion_end",
    "inventory_status",
    "product_url",
  ],
  campaign_results: [
    "campaign_id",
    "campaign_name",
    "channel",
    "status",
    "audience_size",
    "impressions",
    "clicks",
    "responses",
    "conversions",
    "revenue",
    "recorded_at",
  ],
} as const;
const required: Record<string, string[]> = {
  customers: [
    "customer_external_id",
    "customer_name",
    "assigned_staff_email",
    "email",
    "consent_status",
    "customer_since",
  ],
  transactions: [
    "transaction_id",
    "customer_external_id",
    "transaction_date",
    "product_sku",
    "quantity",
    "unit_price",
    "total_amount",
  ],
  conversations: [
    "conversation_id",
    "message_id",
    "customer_external_id",
    "channel",
    "sender_type",
    "message_text",
    "sent_at",
  ],
  products: [
    "product_sku",
    "product_name",
    "category",
    "description",
    "standard_price",
    "inventory_status",
  ],
  campaign_results: [
    "campaign_id",
    "campaign_name",
    "channel",
    "status",
    "audience_size",
    "recorded_at",
  ],
};
const uniqueKey: Record<string, string> = {
  customers: "customer_external_id",
  transactions: "transaction_id",
  conversations: "message_id",
  products: "product_sku",
  campaign_results: "campaign_id",
};
const maxSize = 10 * 1024 * 1024;

export function inferImportKind(
  filename: string,
  headers: string[] = [],
): ImportKind {
  const n = filename.toLowerCase();
  if (n.includes("customer-service")) return "customer_service_policy";
  if (n.includes("retention-playbook")) return "retention_playbook";
  if (n.includes("marketing-guideline")) return "marketing_guidelines";
  if (n.includes("product-catalogue") || n.includes("product-catalog"))
    return "product_catalogue";
  if (/\.(png|jpe?g)$/i.test(n)) return "campaign_asset";
  if (/^customers?\b/.test(n)) return "customers";
  if (/^transactions?\b/.test(n)) return "transactions";
  if (/^conversations?\b/.test(n)) return "conversations";
  if (/^products?\b/.test(n)) return "products";
  if (/^campaign-results?\b/.test(n)) return "campaign_results";
  if (
    headers.includes("customer_external_id") &&
    headers.includes("customer_name")
  )
    return "customers";
  if (headers.includes("transaction_id")) return "transactions";
  if (headers.includes("message_id")) return "conversations";
  if (headers.includes("product_sku")) return "products";
  if (headers.includes("campaign_id")) return "campaign_results";
  return "document";
}
function magicValid(ext: string, b: Buffer) {
  if (ext === "pdf") return b.subarray(0, 5).toString() === "%PDF-";
  if (ext === "png")
    return b
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (ext === "jpg" || ext === "jpeg") return b[0] === 0xff && b[1] === 0xd8;
  if (ext === "xlsx" || ext === "docx") return b[0] === 0x50 && b[1] === 0x4b;
  return true;
}
function normalizeJson(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.conversations)) {
    return (o.conversations as Record<string, unknown>[]).flatMap((c) =>
      Array.isArray(c.messages)
        ? (c.messages as Record<string, unknown>[]).map((m) => ({
            ...m,
            conversation_id: c.conversation_id,
            customer_external_id: c.customer_external_id,
            channel: c.channel,
          }))
        : [],
    );
  }
  for (const v of Object.values(o))
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  return [o];
}
async function parseRows(ext: string, b: Buffer) {
  if (ext === "csv") {
    const p = Papa.parse<Record<string, unknown>>(b.toString("utf8"), {
      header: true,
      skipEmptyLines: "greedy",
    });
    return {
      rows: p.data,
      headers: p.meta.fields || [],
      parseErrors: p.errors.map((e) => ({
        row: (e.row || 0) + 2,
        field: "file",
        code: e.code,
        message: e.message,
      })),
    };
  }
  if (ext === "json") {
    const rows = normalizeJson(JSON.parse(b.toString("utf8")));
    return {
      rows,
      headers: Object.keys(rows[0] || {}),
      parseErrors: [] as ImportError[],
    };
  }
  if (ext === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(b as unknown as Parameters<typeof wb.xlsx.load>[0]);
    const ws = wb.worksheets[0];
    if (!ws)
      return {
        rows: [],
        headers: [],
        parseErrors: [
          {
            row: 0,
            field: "file",
            code: "empty_workbook",
            message: "Workbook contains no worksheet",
          },
        ],
      };
    const headers = (ws.getRow(1).values as unknown[]).slice(1).map(String);
    const rows: Record<string, unknown>[] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const record: Record<string, unknown> = {};
      headers.forEach((h, i) => (record[h] = row.getCell(i + 1).value));
      rows.push(record);
    });
    return { rows, headers, parseErrors: [] as ImportError[] };
  }
  return { rows: [], headers: [], parseErrors: [] as ImportError[] };
}
function chunkPages(pages: { num: number; text: string }[]) {
  return pages.flatMap((p) => {
    const clean = p.text.replace(/\s+/g, " ").trim();
    const chunks = [];
    for (let i = 0; i < clean.length; i += 800)
      chunks.push({
        page: p.num,
        chunk: chunks.length,
        location: `page:${p.num};chars:${i}-${Math.min(i + 800, clean.length)}`,
        text: clean.slice(i, i + 800),
      });
    return chunks;
  });
}

export async function validateImportFile(
  filename: string,
  mime: string,
  data: ArrayBuffer | Buffer,
  mapping: Record<string, string> = {},
): Promise<ImportResult> {
  const b = Buffer.isBuffer(data) ? data : Buffer.from(data),
    ext = filename.toLowerCase().split(".").pop() || "";
  const base = {
    filename,
    fileType: ext,
    size: b.length,
    audit: {
      action: "data_import_validation",
      result: "validated",
      at: new Date().toISOString(),
    },
  };
  if (b.length === 0)
    return {
      ...base,
      kind: "document",
      valid: false,
      rowCount: 0,
      validCount: 0,
      invalidCount: 1,
      duplicateCount: 0,
      headers: [],
      preview: [],
      errors: [
        { row: 0, field: "file", code: "empty_file", message: "File is empty" },
      ],
    };
  if (b.length > maxSize)
    return {
      ...base,
      kind: "document",
      valid: false,
      rowCount: 0,
      validCount: 0,
      invalidCount: 1,
      duplicateCount: 0,
      headers: [],
      preview: [],
      errors: [
        {
          row: 0,
          field: "file",
          code: "size_limit",
          message: "File exceeds the 10 MB limit",
        },
      ],
    };
  const allowed = [
    "csv",
    "xlsx",
    "json",
    "txt",
    "pdf",
    "docx",
    "png",
    "jpg",
    "jpeg",
  ];
  if (!allowed.includes(ext) || !magicValid(ext, b))
    return {
      ...base,
      kind: "document",
      valid: false,
      rowCount: 0,
      validCount: 0,
      invalidCount: 1,
      duplicateCount: 0,
      headers: [],
      preview: [],
      errors: [
        {
          row: 0,
          field: "file",
          code: "file_type",
          message: "File extension or signature is not allowed",
        },
      ],
    };
  if (["csv", "xlsx", "json"].includes(ext)) {
    try {
      const parsed = await parseRows(ext, b);
      const mappedHeaders = parsed.headers
          .map((h) => mapping[h] ?? h)
          .filter((h) => h !== "__ignore__"),
        mappedRows = parsed.rows.map((row) =>
          Object.fromEntries(
            parsed.headers
              .filter((h) => (mapping[h] ?? h) !== "__ignore__")
              .map((h) => [mapping[h] ?? h, row[h]]),
          ),
        );
      const kind = inferImportKind(filename, mappedHeaders);
      if (!required[kind])
        return {
          ...base,
          kind,
          valid: false,
          rowCount: mappedRows.length,
          validCount: 0,
          invalidCount: mappedRows.length || 1,
          duplicateCount: 0,
          headers: parsed.headers,
          preview: mappedRows.slice(0, 5),
          errors: [
            {
              row: 1,
              field: "headers",
              code: "unknown_schema",
              message: "Columns do not match a supported import template",
            },
          ],
        };
      const errors: ImportError[] = [...parsed.parseErrors];
      if (new Set(mappedHeaders).size !== mappedHeaders.length)
        errors.push({
          row: 1,
          field: "headers",
          code: "duplicate_mapping",
          message: "Two source columns cannot map to the same target field",
        });
      for (const h of required[kind])
        if (!mappedHeaders.includes(h))
          errors.push({
            row: 1,
            field: h,
            code: "missing_column",
            message: `Required column ${h} is missing`,
          });
      const key = uniqueKey[kind],
        seen = new Set<string>();
      let duplicates = 0;
      mappedRows.forEach((row, i) => {
        for (const h of required[kind])
          if (
            row[h] === undefined ||
            row[h] === null ||
            String(row[h]).trim() === ""
          )
            errors.push({
              row: i + 2,
              field: h,
              code: "required",
              message: `${h} is required`,
              value: row[h],
            });
        const k = String(row[key] ?? "");
        if (k && seen.has(k)) {
          duplicates++;
          errors.push({
            row: i + 2,
            field: key,
            code: "duplicate",
            message: `Duplicate ${key}: ${k}`,
            value: k,
          });
        }
        seen.add(k);
      });
      const invalidRows =
        new Set(errors.filter((e) => e.row > 1).map((e) => e.row)).size +
        (errors.some((e) => e.row === 1) ? mappedRows.length : 0);
      return {
        ...base,
        kind,
        valid: errors.length === 0,
        rowCount: mappedRows.length,
        validCount: Math.max(0, mappedRows.length - invalidRows),
        invalidCount: invalidRows,
        duplicateCount: duplicates,
        headers: parsed.headers,
        preview: mappedRows.slice(0, 5),
        errors,
      };
    } catch (e) {
      return {
        ...base,
        kind: inferImportKind(filename),
        valid: false,
        rowCount: 0,
        validCount: 0,
        invalidCount: 1,
        duplicateCount: 0,
        headers: [],
        preview: [],
        errors: [
          {
            row: 0,
            field: "file",
            code: "parse_error",
            message: e instanceof Error ? e.message : "Unable to parse file",
          },
        ],
      };
    }
  }
  if (ext === "pdf") {
    try {
      // pdf.js needs browser geometry primitives when its module is evaluated.
      // This explicit native import makes Vercel trace the platform binary.
      const canvas = await import("@napi-rs/canvas");
      Object.assign(globalThis, {
        DOMMatrix: globalThis.DOMMatrix ?? canvas.DOMMatrix,
        ImageData: globalThis.ImageData ?? canvas.ImageData,
        Path2D: globalThis.Path2D ?? canvas.Path2D,
      });
      const [{ PDFParse }, { getData }] = await Promise.all([
        import("pdf-parse"),
        import("pdf-parse/worker"),
      ]);
      PDFParse.setWorker(getData());
      const parser = new PDFParse({ data: new Uint8Array(b) });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text.trim(),
        kind = inferImportKind(filename);
      return {
        ...base,
        kind,
        valid: text.length > 0,
        rowCount: result.total,
        validCount: text.length ? result.total : 0,
        invalidCount: text.length ? 0 : 1,
        duplicateCount: 0,
        headers: [],
        preview: [
          {
            document_type: kind,
            pages: result.total,
            characters: text.length,
            classification: "Internal",
            retention_category: "approved_source",
          },
        ],
        errors: text.length
          ? []
          : [
              {
                row: 0,
                field: "content",
                code: "no_text",
                message: "No extractable text found",
              },
            ],
        extractedText: text.slice(0, 2000),
        pages: result.total,
        chunks: chunkPages(result.pages),
      };
    } catch (e) {
      return {
        ...base,
        kind: inferImportKind(filename),
        valid: false,
        rowCount: 0,
        validCount: 0,
        invalidCount: 1,
        duplicateCount: 0,
        headers: [],
        preview: [],
        errors: [
          {
            row: 0,
            field: "file",
            code: "pdf_parse",
            message: e instanceof Error ? e.message : "PDF extraction failed",
          },
        ],
      };
    }
  }
  if (ext === "docx") {
    try {
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: b });
      const text = result.value.trim();
      return {
        ...base,
        kind: inferImportKind(filename),
        valid: text.length > 0,
        rowCount: 1,
        validCount: text.length ? 1 : 0,
        invalidCount: text.length ? 0 : 1,
        duplicateCount: 0,
        headers: [],
        preview: [
          {
            characters: text.length,
            classification: "Internal",
            retention_category: "approved_source",
          },
        ],
        errors: text.length
          ? []
          : [
              {
                row: 0,
                field: "content",
                code: "no_text",
                message: "No extractable text found",
              },
            ],
        extractedText: text.slice(0, 2000),
        chunks: chunkPages([{ num: 1, text }]),
      };
    } catch (e) {
      return {
        ...base,
        kind: "document",
        valid: false,
        rowCount: 0,
        validCount: 0,
        invalidCount: 1,
        duplicateCount: 0,
        headers: [],
        preview: [],
        errors: [
          {
            row: 0,
            field: "file",
            code: "docx_parse",
            message: e instanceof Error ? e.message : "DOCX extraction failed",
          },
        ],
      };
    }
  }
  if (ext === "txt") {
    const text = b.toString("utf8").trim();
    return {
      ...base,
      kind: inferImportKind(filename),
      valid: Boolean(text),
      rowCount: 1,
      validCount: text ? 1 : 0,
      invalidCount: text ? 0 : 1,
      duplicateCount: 0,
      headers: [],
      preview: [
        {
          characters: text.length,
          classification: "Internal",
          retention_category: "approved_source",
        },
      ],
      errors: text
        ? []
        : [
            {
              row: 0,
              field: "content",
              code: "no_text",
              message: "Text file is empty",
            },
          ],
      extractedText: text.slice(0, 2000),
      chunks: chunkPages([{ num: 1, text }]),
    };
  }
  return {
    ...base,
    kind: "campaign_asset",
    valid: true,
    rowCount: 1,
    validCount: 1,
    invalidCount: 0,
    duplicateCount: 0,
    headers: [],
    preview: [
      {
        mime,
        bytes: b.length,
        classification: "Internal",
        retention_category: "campaign_asset",
      },
    ],
    errors: [],
  };
}

export function blankTemplate(kind: keyof typeof templates) {
  return `${templates[kind].join(",")}\n`;
}
