import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorForm } from "./creator-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function CodeCreatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Code Creator"
        description="Describe what you need, answer a few environment-aware requirements, and get a generated script — grounded in your own coding standards and the lessons your team has already captured."
      />
      <Card>
        <CreatorForm />
      </Card>
    </main>
  );
}
