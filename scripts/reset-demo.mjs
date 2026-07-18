import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import Papa from "papaparse";
if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY){console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. No data changed.");process.exit(1)}
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const org="00000000-0000-4000-8000-000000000001";
const csv=await fs.readFile(new URL("../mock-data/customers.csv",import.meta.url),"utf8");const rows=Papa.parse(csv,{header:true,skipEmptyLines:true}).data;
const payload=rows.map(r=>({organization_id:org,external_id:r.customer_external_id,customer_name:r.customer_name,company_name:r.company_name,industry:r.industry,region:r.region,email:r.email,phone:r.phone,preferred_channel:r.preferred_channel,customer_since:r.customer_since,deleted_at:null}));
const {error}=await supabase.from("customers").upsert(payload,{onConflict:"organization_id,external_id"});if(error)throw error;console.log(`Reloaded ${payload.length} permanent synthetic customers. Mock files were not removed.`);
