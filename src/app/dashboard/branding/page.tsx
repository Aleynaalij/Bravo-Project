import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { getBranding } from "@/lib/branding";
import { BrandingForm } from "./branding-form";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";

export default async function BrandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const branding = await getBranding(supabase, accountId);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard" className="text-sm text-brand hover:underline">
          &larr; Back to projects
        </Link>

        <h1 className="mb-1 mt-4 text-2xl font-semibold">Branding</h1>
        <p className="mb-6 text-sm text-muted">
          Customize how your firm appears on generated DOCX, PDF, and PPTX deliverables.
        </p>

        <Card>
          <BrandingForm branding={branding} />
        </Card>
      </main>
    </>
  );
}
