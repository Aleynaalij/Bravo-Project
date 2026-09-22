import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCodingStandard } from "@/lib/automation/standards-service";
import { StandardForm } from "../standard-form";
import { deleteCodingStandardAction } from "../actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function EditCodingStandardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const standard = await getCodingStandard(supabase, id);
  if (!standard) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Edit coding standard"
        description={`Defined by ${standard.author_email} · v${standard.version}`}
        actions={
          <form action={deleteCodingStandardAction}>
            <input type="hidden" name="id" value={standard.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        }
      />

      <Card>
        <StandardForm standard={standard} />
      </Card>
    </main>
  );
}
