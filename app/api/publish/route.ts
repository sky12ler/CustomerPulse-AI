import { NextRequest,NextResponse } from "next/server";
import { getPublisher } from "@/lib/publisher";
export async function POST(req:NextRequest){try{const input=await req.json();return NextResponse.json(await getPublisher().schedule(input))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Publishing failed"},{status:422})}}
