import { NextResponse } from "next/server";
import { getMiMoConfig } from "@/lib/mimo-config";
export function GET() {
  const mimo = getMiMoConfig();
  return NextResponse.json({
    status: "ok",
    service: "customerpulse-ai",
    release: "workflow-v2",
    avoProvider: mimo.apiKey
      ? "xiaomi-mimo-configured"
      : process.env.OPENAI_API_KEY
        ? "openai"
        : "demo",
    avoModel: mimo.apiKey ? mimo.model : null,
    publisher: process.env.BUFFER_API_KEY ? "buffer" : "demo",
    timestamp: new Date().toISOString(),
  });
}
