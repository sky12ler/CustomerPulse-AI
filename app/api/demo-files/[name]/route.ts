import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const allowed=new Set(["customers.csv","transactions.csv","conversations.csv","conversations.json","products.csv","campaign-results.csv","retention-playbook.pdf","customer-service-policy.pdf","product-catalogue.pdf","marketing-guidelines.pdf","existing-campaign.png","README.md"]);
export async function GET(_request:Request,{params}:{params:Promise<{name:string}>}){const {name}=await params;if(!allowed.has(name))return NextResponse.json({error:"File not found"},{status:404});const data=await readFile(path.join(process.cwd(),"mock-data",name));const ext=path.extname(name);const types:Record<string,string>={".csv":"text/csv",".json":"application/json",".pdf":"application/pdf",".png":"image/png",".md":"text/markdown"};return new NextResponse(data,{headers:{"Content-Type":types[ext]||"application/octet-stream","Content-Disposition":`attachment; filename=\"${name}\"`}})}
