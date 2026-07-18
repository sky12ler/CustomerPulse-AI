import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({status:"ok",service:"customerpulse-ai",avoProvider:process.env.OPENAI_API_KEY?"openai":"demo",publisher:process.env.BUFFER_API_KEY?"buffer":"demo",timestamp:new Date().toISOString()})}
