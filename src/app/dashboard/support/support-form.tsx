"use client";

import { useActionState, useRef, useEffect } from "react";
import { submitSupportRequestAction, type SupportActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: SupportActionState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function SupportForm() {
  const [state, formAction, isPending] = useActionState(submitSupportRequestAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="subject">
          Subject
        </label>
        <input id="subject" name="subject" type="text" required maxLength={200} className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={4000}
          rows={5}
          className={fieldClass}
        />
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && (
        <Alert variant="success">Sent — we&apos;ll get back to you at your account email.</Alert>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
