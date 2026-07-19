import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "customerpulse-ai",
    release: "workflow-v2",
    avoProvider: process.env.XIAOMIMIMO_API_KEY
      ? "xiaomi-mimo-configured"
      : process.env.OPENAI_API_KEY
        ? "openai"
        : "demo",
    publisher: process.env.BUFFER_API_KEY ? "buffer" : "demo",
    timestamp: new Date().toISOString(),
  });
}
