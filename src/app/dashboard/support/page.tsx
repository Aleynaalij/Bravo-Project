import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listMySupportRequests } from "@/lib/support/service";
import { SupportForm } from "./support-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// The in-app contact channel (task #35) — no helpdesk vendor account
// exists for this project, so this is a real, owned request queue
// (supabase/migrations/0026_support_requests.sql) rather than a mailto:
// link or a stubbed widget. A submitted request is visible here to its
// own submitter and to platform admins at /admin/support.
export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const myRequests = await listMySupportRequests(supabase);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-brand hover:underline">
        &larr; Back to projects
      </Link>
      <h1 className="mb-1 mt-4 text-2xl font-semibold">Support</h1>
      <p className="mb-6 text-sm text-muted">
        Questions, bug reports, or anything else — send us a message and we&apos;ll follow up at
        your account email.
      </p>

      <Card className="mb-8">
        <SupportForm />
      </Card>

      {myRequests.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-muted">Your requests</h2>
          <ul className="flex flex-col gap-3">
            {myRequests.map((request) => (
              <li key={request.id}>
                <Card className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{request.subject}</span>
                    <Badge tone={request.status === "resolved" ? "success" : "brand"}>
                      {request.status === "resolved" ? "Resolved" : "Open"}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted">{request.message}</p>
                  <span className="text-xs text-muted">
                    {new Date(request.created_at).toLocaleString()}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
