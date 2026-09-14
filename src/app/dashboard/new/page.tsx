import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { IntakeForm } from "./intake-form";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard" className="text-sm text-brand hover:underline">
          &larr; Back to projects
        </Link>

        <h1 className="mb-6 mt-4 text-2xl font-semibold">New project</h1>

        <Card>
          <IntakeForm />
        </Card>
      </main>
    </>
  );
}
