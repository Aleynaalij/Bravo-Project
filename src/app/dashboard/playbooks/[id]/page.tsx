import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlaybook, getPlaybookVaultEntryLinks } from "@/lib/playbook/service";
import { listVaultEntries } from "@/lib/vault/entries-service";
import { requireAccountId } from "@/lib/auth/session";
import { recordContentView, getContentViewCount } from "@/lib/usage/content-views";
import { PlaybookForm } from "../playbook-form";
import { deletePlaybookAction, publishPlaybookAction } from "../actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function EditPlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const playbook = await getPlaybook(supabase, id);
  if (!playbook) notFound();

  const [vaultEntries, selectedVaultEntryIds] = await Promise.all([
    listVaultEntries(supabase),
    getPlaybookVaultEntryLinks(supabase, id),
  ]);

  const accountId = await requireAccountId(supabase);
  await recordContentView(supabase, {
    accountId,
    contentType: "playbook",
    contentId: playbook.id,
    viewerUserId: user.id,
    viewerEmail: user.email ?? "",
  });
  const viewCount = await getContentViewCount(supabase, "playbook", playbook.id);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Edit playbook
            <Badge tone={playbook.status === "published" ? "success" : "neutral"}>
              {playbook.status === "published" ? "Published" : "Draft"}
            </Badge>
          </span>
        }
        description={`Written by ${playbook.author_email} · v${playbook.version} · Viewed ${viewCount} ${viewCount === 1 ? "time" : "times"}`}
        actions={
          <>
            {playbook.status === "draft" && (
              <form action={publishPlaybookAction}>
                <input type="hidden" name="id" value={playbook.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Publish
                </Button>
              </form>
            )}
            <form action={deletePlaybookAction}>
              <input type="hidden" name="id" value={playbook.id} />
              <Button type="submit" variant="danger" size="sm">
                Delete
              </Button>
            </form>
          </>
        }
      />

      <Card>
        <PlaybookForm playbook={playbook} vaultEntries={vaultEntries} selectedVaultEntryIds={selectedVaultEntryIds} />
      </Card>
    </main>
  );
}
