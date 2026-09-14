import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listProjectsWithServices } from "@/lib/projects/service";
import { Header } from "@/components/header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServiceIcon, SparkleIcon } from "@/components/icons";
import { SERVICE_LABELS } from "@/lib/domain/labels";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projects = await listProjectsWithServices(supabase);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div
          className="mb-8 flex flex-col gap-1 rounded-lg px-6 py-5 text-white"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <SparkleIcon className="h-4 w-4" />
            PurviewPilot
          </div>
          <p className="text-lg font-semibold">
            {projects.length === 0
              ? "Let's draft your first client's Purview documentation."
              : `${projects.length} project${projects.length === 1 ? "" : "s"} in flight — pick one up or start a new intake.`}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <LinkButton href="/dashboard/new">New project</LinkButton>
        </div>

        {projects.length === 0 ? (
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
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{project.customer_name}</div>
                        <div className="text-sm text-muted">{project.industry}</div>
                      </div>
                      {project.services.length > 0 && (
                        <div className="flex items-center -space-x-1.5">
                          {project.services.slice(0, 5).map((service) => (
                            <span
                              key={service}
                              title={SERVICE_LABELS[service]}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-brand-light text-brand-dark"
                            >
                              <ServiceIcon service={service} className="h-3.5 w-3.5" />
                            </span>
                          ))}
                          {project.services.length > 5 && (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-xs font-medium text-muted">
                              +{project.services.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
