import { NextRequest,NextResponse } from "next/server";
import { customers } from "@/lib/demo-data";
import { getAIProvider } from "@/lib/avo";
export async function POST(req:NextRequest){const {customerId}=await req.json();const customer=customers.find(c=>c.id===customerId);if(!customer)return NextResponse.json({error:"Customer not found"},{status:404});try{return NextResponse.json(await getAIProvider().analyze(customer))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Analysis failed"},{status:422})}}
