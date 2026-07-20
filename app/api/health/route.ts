import { NextResponse } from "next/server";
import { getMiMoConfig } from "@/lib/mimo-config";
export function GET() {
  const mimo = getMiMoConfig();
  return NextResponse.json({
    status: "ok",
    service: "customerpulse-ai",
    release: "workflow-v2",
    avoProvider: mimo.apiKey
      ? "AI-API-configured"
      : process.env.OPENAI_API_KEY
        ? "AI-API-configured"
        : "demo",
    avoModel: mimo.apiKey ? mimo.model : null,
    publisher: process.env.BUFFER_API_KEY ? "buffer" : "demo",
    timestamp: new Date().toISOString(),
  });
}
