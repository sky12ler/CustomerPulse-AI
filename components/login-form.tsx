"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const client = getSupabaseBrowserClient();

  async function authenticate(create: boolean) {
    setMessage("");
    if (!client) return setMessage("Supabase browser configuration is missing.");
    setLoading(true);
    const result = create
      ? await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        })
      : await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) return setMessage(result.error.message);
    if (create && !result.data.session)
      return setMessage("Account created. Confirm the email, then sign in.");
    window.location.assign("/overview");
  }

  return (
    <main className="login-shell">
      <section className="card login-card">
        <span className="eyebrow">CustomerPulse AI</span>
        <h1>Operational workspace sign in</h1>
        <p>
          Authentication is required for the shared Supabase-backed Imported
          Workspace. Demo Workspace remains available without an account.
        </p>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); void authenticate(false); }}>
          <label className="field">
            Display name (new accounts)
            <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
          </label>
          <label className="field">
            Email
            <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label className="field">
            Password
            <input className="input" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          {message && <div className="notice" role="status">{message}</div>}
          <div className="top-actions">
            <button className="btn btn-primary" disabled={loading} type="submit">{loading ? "Signing in…" : "Sign in"}</button>
            <button className="btn btn-outline" disabled={loading} type="button" onClick={() => void authenticate(true)}>Create account</button>
            <Link className="btn btn-outline" href="/overview">Open Demo Workspace</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
