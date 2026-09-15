"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  if (state.submitted) {
    return <Alert variant="success">If that email has a BravoPilot account, a reset link is on its way.</Alert>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        autoFocus
        className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
