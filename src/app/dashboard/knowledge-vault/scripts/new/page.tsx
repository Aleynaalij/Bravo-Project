import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScriptForm } from "../script-form";
import { Card } from "@/components/ui/card";

export default async function NewVaultScriptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard/knowledge-vault/scripts" className="text-sm text-brand hover:underline">
        &larr; Back to Scripts
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">New script</h1>
      <Card>
        <ScriptForm />
      </Card>
    </main>
  );
}
