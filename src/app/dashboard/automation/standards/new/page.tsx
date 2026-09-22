import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StandardForm } from "../standard-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function NewCodingStandardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader title="New coding standard" />
      <Card>
        <StandardForm />
      </Card>
    </main>
  );
}
