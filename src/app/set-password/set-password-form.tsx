"use client";

import { useActionState } from "react";
import Link from "next/link";
import { changePasswordAction, type SettingsActionState } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: SettingsActionState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function SetPasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">Password set. You&apos;re all set.</Alert>
        <Link href="/dashboard" className="w-fit">
          <Button type="button">Go to your dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="newPassword">
          Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
