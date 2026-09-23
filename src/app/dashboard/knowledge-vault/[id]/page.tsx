import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVaultEntry, getVaultEntryReferences } from "@/lib/vault/entries-service";
import { listVaultEntryAttachments } from "@/lib/vault/attachments-service";
import { listProjects } from "@/lib/projects/service";
import { requireAccountId } from "@/lib/auth/session";
import { recordContentView, getContentViewCount } from "@/lib/usage/content-views";
import { EntryForm } from "../entry-form";
import { deleteVaultEntryAction } from "../actions";
import { AttachmentsSection } from "../attachments-section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function EditVaultEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [entry, projects, references, attachments] = await Promise.all([
    getVaultEntry(supabase, id),
    listProjects(supabase),
    getVaultEntryReferences(supabase, id),
    listVaultEntryAttachments(supabase, id),
  ]);
  if (!entry) notFound();

  const accountId = await requireAccountId(supabase);
  // Sequential, not Promise.all: the count read must happen after the
  // insert commits, or a fresh view wouldn't show up in its own count.
  await recordContentView(supabase, {
    accountId,
    contentType: "vault_entry",
    contentId: entry.id,
    viewerUserId: user.id,
    viewerEmail: user.email ?? "",
  });
  const viewCount = await getContentViewCount(supabase, "vault_entry", entry.id);

  const hasReferences = references.sops.length > 0 || references.playbooks.length > 0 || references.scripts.length > 0;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Edit entry"
        description={`Viewed ${viewCount} ${viewCount === 1 ? "time" : "times"}`}
        actions={
          <form action={deleteVaultEntryAction}>
            <input type="hidden" name="id" value={entry.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        }
      />

      {hasReferences && (
        <Card className="mb-6 flex flex-col gap-3">
          <h2 className="font-medium">Referenced by</h2>
          <p className="text-sm text-muted">
            SOPs, playbooks, and scripts that explicitly linked this entry as related.
          </p>
          {references.sops.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">SOPs</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {references.sops.map((sop) => (
                  <li key={sop.id}>
                    <Link href={`/dashboard/sops/${sop.id}`} className="text-brand hover:underline">
                      {sop.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {references.playbooks.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Playbooks</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {references.playbooks.map((playbook) => (
                  <li key={playbook.id}>
                    <Link href={`/dashboard/playbooks/${playbook.id}`} className="text-brand hover:underline">
                      {playbook.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {references.scripts.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Scripts</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {references.scripts.map((script) => (
                  <li key={script.id}>
                    <Link
                      href={`/dashboard/knowledge-vault/scripts/${script.id}`}
                      className="text-brand hover:underline"
                    >
                      {script.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <AttachmentsSection vaultEntryId={entry.id} attachments={attachments} />

      <Card>
        <EntryForm entry={entry} projects={projects} />
      </Card>
    </main>
  );
}
