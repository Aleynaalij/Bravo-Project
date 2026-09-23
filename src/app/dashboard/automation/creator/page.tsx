import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorForm } from "./creator-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

// Code Creator's Server Action calls generateCompletion synchronously in
// the same request — a full script + setup notes + rollback in one JSON
// response can take well past Vercel's 10s platform default, which kills
// the function mid-await before runCodeCreator's own catch block can even
// write error_message. maxDuration raises the ceiling so a slow (not
// hung) completion has room to finish instead of dying silently.
export const maxDuration = 120;

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
