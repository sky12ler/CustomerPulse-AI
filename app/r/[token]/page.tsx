import Link from "next/link";

export default async function RecoveryLanding({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#16324f",
      }}
    >
      <section className="card" style={{ maxWidth: 680, padding: 36 }}>
        <span className="demo-label">Synthetic Demo Landing Page</span>
        <h1 style={{ fontFamily: "Georgia,serif", color: "#183044" }}>
          Your service recovery update
        </h1>
        <p>
          Thank you for giving our team the opportunity to review your support
          experience. An authorised employee will confirm any next step
          directly. This page does not promise a discount, delivery date or
          outcome.
        </p>
        <div className="notice">
          Tracked demo token: {token}. In a connected deployment, opening this
          page creates a consent-safe link event.
        </div>
        <Link
          className="btn btn-primary"
          style={{ marginTop: 18 }}
          href="/overview"
        >
          Return to CustomerPulse demo
        </Link>
      </section>
    </main>
  );
}
