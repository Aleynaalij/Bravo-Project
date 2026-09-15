"use client";

import { useState } from "react";
import { deleteAccountAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteAccountForm({ email }: { email: string }) {
  const [confirmation, setConfirmation] = useState("");
  const armed = confirmation === email;

  return (
    <form action={deleteAccountAction} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        This permanently deletes your account, all projects, generated deliverables, and branding —
        and cancels any active subscription. This can&apos;t be undone. Type <strong>{email}</strong>{" "}
        to confirm.
      </p>
      <input
        name="confirmation"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder={email}
        autoComplete="off"
        className="rounded-md border border-border px-3 py-2 text-sm focus:border-error-text focus:outline-none"
      />
      <Button type="submit" variant="danger" disabled={!armed} className="w-fit">
        Delete my account
      </Button>
    </form>
  );
}
