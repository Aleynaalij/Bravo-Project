import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects/service";
import { EntryForm } from "../entry-form";
import { Card } from "@/components/ui/card";

export default async function NewVaultEntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projects = await listProjects(supabase);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard/knowledge-vault" className="text-sm text-brand hover:underline">
        &larr; Back to Knowledge Vault
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">New entry</h1>
      <Card>
        <EntryForm projects={projects} />
      </Card>
    </main>
  );
}
