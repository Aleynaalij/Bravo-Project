import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, customer_name, industry, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <LinkButton href="/dashboard/new">New project</LinkButton>
        </div>

        {!projects || projects.length === 0 ? (
          <Card className="text-sm text-muted">
            No projects yet.{" "}
            <Link href="/dashboard/new" className="text-brand hover:underline">
              Start an intake
            </Link>
            .
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/dashboard/${project.id}`}>
                  <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                    <div className="font-medium">{project.customer_name}</div>
                    <div className="text-sm text-muted">{project.industry}</div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
