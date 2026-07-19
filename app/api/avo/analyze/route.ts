import { NextRequest, NextResponse } from "next/server";
import { customers } from "@/lib/demo-data";
import { getAIProvider } from "@/lib/avo";
import { DEMO_ROLE_OWNER, isReadOnlyRole } from "@/lib/customer-access";
import type { Role } from "@/lib/types";
export async function POST(req: NextRequest) {
  const {
    customerId,
    customer: suppliedCustomer,
    role = "Administrator",
  } = (await req.json()) as {
    customerId: string;
    customer?: (typeof customers)[number];
    role?: Role;
  };
  const customer =
    suppliedCustomer ?? customers.find((c) => c.id === customerId);
  if (!customer)
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const assignedOwner = DEMO_ROLE_OWNER[role];
  if (
    isReadOnlyRole(role) ||
    (assignedOwner && customer.staff !== assignedOwner)
  )
    return NextResponse.json(
      { error: "Customer access denied" },
      { status: 403 },
    );
  try {
    return NextResponse.json(await getAIProvider().analyze(customer));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 422 },
    );
  }
}
