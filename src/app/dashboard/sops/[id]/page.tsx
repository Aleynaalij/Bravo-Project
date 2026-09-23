import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSop, getSopVaultEntryLinks } from "@/lib/sop/service";
import { listVaultEntries } from "@/lib/vault/entries-service";
import { requireAccountId } from "@/lib/auth/session";
import { recordContentView, getContentViewCount } from "@/lib/usage/content-views";
import { SopForm } from "../sop-form";
import { deleteSopAction, publishSopAction } from "../actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function EditSopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sop = await getSop(supabase, id);
  if (!sop) notFound();

  const [vaultEntries, selectedVaultEntryIds] = await Promise.all([
    listVaultEntries(supabase),
    getSopVaultEntryLinks(supabase, id),
  ]);

  const accountId = await requireAccountId(supabase);
  await recordContentView(supabase, {
    accountId,
    contentType: "sop",
    contentId: sop.id,
    viewerUserId: user.id,
    viewerEmail: user.email ?? "",
  });
  const viewCount = await getContentViewCount(supabase, "sop", sop.id);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Edit SOP
            <Badge tone={sop.status === "published" ? "success" : "neutral"}>
              {sop.status === "published" ? "Published" : "Draft"}
            </Badge>
          </span>
        }
        description={`Written by ${sop.author_email} · v${sop.version} · Viewed ${viewCount} ${viewCount === 1 ? "time" : "times"}`}
        actions={
          <>
            <a className={buttonClasses("secondary", "sm")} href={`/api/sops/${sop.id}/export`}>
              Download Word doc
            </a>
            {sop.status === "draft" && (
              <form action={publishSopAction}>
                <input type="hidden" name="id" value={sop.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Publish
                </Button>
              </form>
            )}
            <form action={deleteSopAction}>
              <input type="hidden" name="id" value={sop.id} />
              <Button type="submit" variant="danger" size="sm">
                Delete
              </Button>
            </form>
          </>
        }
      />

      <Card>
        <SopForm sop={sop} vaultEntries={vaultEntries} selectedVaultEntryIds={selectedVaultEntryIds} />
      </Card>
    </main>
  );
}
