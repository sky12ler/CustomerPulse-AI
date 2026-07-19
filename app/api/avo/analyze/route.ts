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
  const importedRequest = suppliedCustomer?.datasetId === "imported";
  const localRequest = ["localhost", "127.0.0.1"].includes(req.nextUrl.hostname);
  if (importedRequest && !authenticated && !localRequest)
    return NextResponse.json(
      { error: "Authenticated Supabase access is required for Imported Workspace AVO" },
      { status: 401 },
    );
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
