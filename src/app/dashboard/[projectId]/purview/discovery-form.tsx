"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { importDiscoverySnapshot } from "./actions";

const input = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground";

export function DiscoveryForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(importDiscoverySnapshot, { message: "" });
  return <form action={action} className="mt-4 space-y-3">
    <input type="hidden" name="projectId" value={projectId} />
    <label className="block text-sm">Authorization or ticket reference<input className={input} name="permissionReference" minLength={5} maxLength={240} required placeholder="Approved change / assessment ticket" /></label>
    <label className="block text-sm">Inventory JSON<textarea className={`${input} min-h-40 font-mono`} name="inventory" maxLength={4000} required placeholder={'{"schemaVersion":1,"cloud":"gcc","tenantLabel":"Example","capturedAt":"2026-09-30T12:00:00Z","counts":{"sensitivityLabels":0,"dlpPolicies":0,"retentionPolicies":0,"ediscoveryCases":0}}'} /></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="authorized" value="yes" required />I have permission to use this sanitized inventory for this project.</label>
    <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Importing…" : "Import snapshot"}</Button>
    {state.message && <p role="status" className="text-sm text-muted">{state.message}</p>}
  </form>;
}
