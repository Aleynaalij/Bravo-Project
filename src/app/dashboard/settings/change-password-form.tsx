"use client";

import { useActionState } from "react";
import { changePasswordAction, type SettingsActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: SettingsActionState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="confirmPassword">
          Confirm new password
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
      {state.success && <Alert variant="success">Password updated.</Alert>}

      <Button type="submit" variant="secondary" disabled={isPending} className="w-fit">
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
