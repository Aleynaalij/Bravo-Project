"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface TotpFactor {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
}

// Supabase Auth has supported TOTP MFA at the platform level all along
// (docs/PRD.md never mentioned it because nothing in the app surfaced it) —
// this is the audit's SEC-04 finding closed: enroll/verify/unenroll all run
// client-side against the user's own session, which is how every Supabase
// MFA reference flow works (not a Server Action — there's no service-role
// step here to hide behind one).
type EnrollState =
  | { step: "idle" }
  | { step: "enrolling"; factorId: string; qrCode: string; secret: string }
  | { step: "error"; message: string };

export function MfaSection() {
  const supabase = createClient();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<EnrollState>({ step: "idle" });
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function refreshFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors(
        data.totp.map((f) => ({
          id: f.id,
          friendlyName: f.friendly_name ?? null,
          status: f.status as "verified" | "unverified",
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    // Fetching on mount — refreshFactors sets state only after its own
    // await resolves, not synchronously in this effect body, but the lint
    // rule can't see through that; same call the rest of this codebase
    // makes for this exact rule (theme-toggle.tsx) when the pattern is the
    // correct, standard one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setMessage(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) {
      setEnroll({ step: "error", message: error?.message ?? "Couldn't start enrollment" });
      return;
    }
    setEnroll({
      step: "enrolling",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function verifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enroll.step !== "enrolling") return;

    setVerifying(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.factorId,
      code,
    });
    setVerifying(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setCode("");
    setEnroll({ step: "idle" });
    setMessage({ type: "success", text: "Two-factor authentication is on." });
    await refreshFactors();
  }

  async function cancelEnroll() {
    if (enroll.step === "enrolling") {
      // Best-effort cleanup of the unverified factor — the user is
      // abandoning enrollment, not reporting an error, so a failure here
      // isn't worth surfacing; they can just start over.
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId }).catch(() => {});
    }
    setEnroll({ step: "idle" });
    setCode("");
  }

  async function removeFactor(factorId: string) {
    if (
      !confirm("Remove two-factor authentication? You'll be able to sign in with just your password again.")
    ) {
      return;
    }
    setMessage(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: "Two-factor authentication removed." });
    await refreshFactors();
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const verifiedFactor = factors.find((f) => f.status === "verified");

  return (
    <div className="flex flex-col gap-3">
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      {verifiedFactor ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Two-factor authentication is on</p>
            <p className="text-sm text-muted">{verifiedFactor.friendlyName || "Authenticator app"}</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => removeFactor(verifiedFactor.id)}>
            Remove
          </Button>
        </div>
      ) : enroll.step === "enrolling" ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Scan this code with an authenticator app (Google Authenticator, 1Password, Authy, etc.), then
            enter the 6-digit code it shows.
          </p>
          {/* Supabase returns this as a data: URI SVG — a plain <img> is the
              right tag here, not next/image, since it's neither a static
              asset nor a remote URL Next needs to optimize. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enroll.qrCode}
            alt="Scan with your authenticator app"
            className="h-40 w-40 self-start rounded-md border border-border bg-white p-2"
          />
          <details className="text-sm text-muted">
            <summary className="cursor-pointer">Can&apos;t scan it?</summary>
            <code className="mt-1 block break-all rounded bg-surface-hover px-2 py-1 text-xs">
              {enroll.secret}
            </code>
          </details>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="mfa-code">
              6-digit code
            </label>
            <input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-32 rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" size="sm" disabled={verifying || code.length !== 6}>
              {verifying ? "Verifying…" : "Verify and turn on"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelEnroll}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <p className="mb-2 text-sm text-muted">
            Add an authenticator app as a second sign-in step, on top of your password.
          </p>
          {enroll.step === "error" && (
            <Alert variant="error" className="mb-2">
              {enroll.message}
            </Alert>
          )}
          <Button variant="secondary" size="sm" onClick={startEnroll}>
            Set up two-factor authentication
          </Button>
        </div>
      )}
    </div>
  );
}
