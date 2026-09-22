import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVaultEntries } from "@/lib/vault/service";
import { VaultEntryCard } from "./vault-entry-card";
import { Card } from "@/components/ui/card";

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const groups = await listVaultEntries(supabase);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">FileVault</h1>
      <p className="mb-6 text-sm text-muted">
        Every generated deliverable, organized by project — view, download, or email it any time
        without regenerating anything.
      </p>

      {groups.length === 0 ? (
        <Card className="text-sm text-muted">
          Nothing generated yet.{" "}
          <Link href="/dashboard" className="text-brand hover:underline">
            Go to a project
          </Link>{" "}
          and generate a deliverable to see it here.
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <Card key={group.projectId}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{group.customerName}</h2>
                <Link
                  href={`/dashboard/${group.projectId}`}
                  className="text-sm text-brand hover:underline"
                >
                  Open project &rarr;
                </Link>
              </div>
              <div className="flex flex-col">
                {group.entries.map((entry) => (
                  <VaultEntryCard
                    key={entry.deliverableId}
                    projectId={group.projectId}
                    customerName={group.customerName}
                    entry={entry}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
