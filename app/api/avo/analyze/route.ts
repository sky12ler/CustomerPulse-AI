import { NextRequest, NextResponse } from "next/server";
import { customers } from "@/lib/demo-data";
import { DemoAVOProvider, getAIProvider } from "@/lib/avo";
import { DEMO_ROLE_OWNER, isReadOnlyRole } from "@/lib/customer-access";
import type { Role } from "@/lib/types";
import { authenticatedOperationalCustomer } from "@/lib/supabase-request-auth";
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
  const authenticated = await authenticatedOperationalCustomer(
    req.headers.get("authorization"),
    customerId,
  );
  // A browser-local imported customer is supplied by the same user who
  // uploaded it. This path never reads or mutates Supabase. When a bearer
  // token exists, the RLS-protected database record remains authoritative.
  const effectiveRole = authenticated?.role ?? role;
  const customer = authenticated?.customer ??
    suppliedCustomer ?? customers.find((c) => c.id === customerId);
  if (!customer)
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const assignedOwner = authenticated ? undefined : DEMO_ROLE_OWNER[effectiveRole];
  if (
    isReadOnlyRole(effectiveRole) ||
    effectiveRole === "Marketing Manager" ||
    (assignedOwner && customer.staff !== assignedOwner)
  )
    return NextResponse.json(
      { error: "Customer access denied" },
      { status: 403 },
    );
  try {
    const provider = getAIProvider();
    try {
      return NextResponse.json({
        ...(await provider.analyze(customer)),
        provider: provider.name,
      });
    } catch (liveError) {
      if (provider instanceof DemoAVOProvider) throw liveError;
      const fallback = await new DemoAVOProvider().analyze(customer);
      return NextResponse.json({
        ...fallback,
        provider: "AVO Demo Provider",
        attemptedProvider: provider.name,
        fallbackReason:
          liveError instanceof Error
            ? liveError.message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
            : "Live provider unavailable",
      });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 422 },
    );
  }
}
