import { NextRequest, NextResponse } from "next/server";
import { validateImportFile } from "@/lib/imports";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData(),
      file = form.get("file"),
      rawMapping = form.get("mapping");
    if (!(file instanceof File))
      return NextResponse.json(
        { error: "A file is required" },
        { status: 400 },
      );
    const mapping =
      typeof rawMapping === "string" ? JSON.parse(rawMapping) : {};
    const result = await validateImportFile(
      file.name,
      file.type,
      await file.arrayBuffer(),
      mapping,
    );
    return NextResponse.json(result, { status: result.valid ? 200 : 422 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import validation failed" },
      { status: 500 },
    );
  }
}
