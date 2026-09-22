import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/session";
import { listAllSupportRequests } from "@/lib/support/service";
import { resolveSupportRequestAction } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  try {
    await requirePlatformAdmin(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login");
    if (err instanceof ForbiddenError) redirect("/dashboard");
    throw err;
  }

  const requests = await listAllSupportRequests(supabase);
  const openRequests = requests.filter((r) => r.status === "open");
  const resolvedRequests = requests.filter((r) => r.status === "resolved");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Support requests"
        description="Every in-app support request across every account — platform-wide, not scoped to one customer."
      />

      <h2 className="mb-3 text-sm font-semibold text-muted">
        Open ({openRequests.length})
      </h2>
      {openRequests.length === 0 ? (
        <p className="mb-8 text-sm text-muted">Nothing open.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-3">
          {openRequests.map((request) => (
            <li key={request.id}>
              <Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{request.subject}</span>
                  <Badge tone="brand">Open</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted">{request.message}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {request.submitter_email} · {new Date(request.created_at).toLocaleString()}
                  </span>
                  <form action={resolveSupportRequestAction}>
                    <input type="hidden" name="id" value={request.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      Mark resolved
                    </Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-sm font-semibold text-muted">
        Resolved ({resolvedRequests.length})
      </h2>
      {resolvedRequests.length === 0 ? (
        <p className="text-sm text-muted">Nothing resolved yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {resolvedRequests.map((request) => (
            <li key={request.id}>
              <Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{request.subject}</span>
                  <Badge tone="success">Resolved</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted">{request.message}</p>
                <span className="text-xs text-muted">
                  {request.submitter_email} · {new Date(request.created_at).toLocaleString()}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
