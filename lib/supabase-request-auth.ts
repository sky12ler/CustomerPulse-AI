import { createClient } from "@supabase/supabase-js";
import type { Customer, Role } from "./types";

const roleMap: Record<string, Role> = {
  administrator: "Administrator",
  sales_manager: "Sales Manager",
  marketing_manager: "Marketing Manager",
  account_executive: "Account Executive",
  auditor: "Auditor",
};

export async function authenticatedOperationalCustomer(
  authorization: string | null,
  customerId: string,
): Promise<{ customer: Customer; role: Role } | null> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return null;
  const [{ data: roles }, { data: record }] = await Promise.all([
    client.from("user_roles").select("role").eq("profile_id", userData.user.id),
    client
      .from("operational_entity_records")
      .select("data")
      .eq("workspace", "imported")
      .eq("entity_type", "customer")
      .eq("entity_key", customerId)
      .maybeSingle(),
  ]);
  if (!record?.data) return null;
  const names = new Set((roles ?? []).map((item) => item.role));
  const databaseRole = [
    "administrator",
    "sales_manager",
    "marketing_manager",
    "account_executive",
    "auditor",
  ].find((name) => names.has(name));
  if (!databaseRole) return null;
  return { customer: record.data as Customer, role: roleMap[databaseRole] };
}
