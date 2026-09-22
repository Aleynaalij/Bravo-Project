import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { IntakeForm } from "./intake-form";
import { PageHeader } from "@/components/page-header";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader title="New project" />

      <Card>
        <IntakeForm />
      </Card>
    </main>
  );
}
