import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import {
  cleanChatText,
  deterministicChatAnswer,
  type AvoChatContext,
} from "@/lib/avo-chat";
import { getMiMoConfig } from "@/lib/mimo-config";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    question?: string;
    history?: Array<{ from: string; text: string }>;
    context?: AvoChatContext;
  };
  const question = body.question?.trim();
  if (!question || !body.context)
    return NextResponse.json(
      { error: "A question and workspace context are required" },
      { status: 400 },
    );

  const fallback = () =>
    NextResponse.json({
      answer: deterministicChatAnswer(question, body.context!),
      provider: "AVO Operational Fallback",
      demo: true,
    });
  const config = getMiMoConfig();
  if (!config.apiKey) return fallback();

  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    const response = await client.responses.create({
      model: config.model,
      instructions:
        "You are AVO, a friendly operational customer assistant. Converse naturally. For operational claims, use only the supplied authorised workspace context, cite customer or record IDs, distinguish observed records from inference, and state uncertainty when relevant. Never approve, execute, invent records, or claim certain future churn. Keep answers concise.",
      input: JSON.stringify({
        recentConversation: (body.history ?? []).slice(-8),
        question,
        authorisedWorkspaceContext: body.context,
      }),
      max_output_tokens: 500,
    });
    if (!response.output_text)
      throw new Error("Live chat provider returned no answer");
    return NextResponse.json({
      answer: cleanChatText(response.output_text),
      provider: "Xiaomi MiMo live provider",
      demo: false,
    });
  } catch (error) {
    const result = await fallback().json();
    return NextResponse.json({
      ...result,
      attemptedProvider: "Xiaomi MiMo live provider",
      fallbackReason:
        error instanceof Error
          ? error.message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
          : "Live chat provider unavailable",
    });
  }
}
