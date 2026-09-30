import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addPurviewItem, savePurviewProfile, updatePurviewItem } from "./actions";
import { DiscoveryForm } from "./discovery-form";

const input = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground";
const statuses = ["todo", "in_progress", "blocked", "done"] as const;
const label: Record<string, string> = {
  todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done",
  dlp: "DLP", retention: "Retention", labels: "Sensitivity labels", ediscovery: "eDiscovery", other: "Other",
};

type WorkItem = {
  id: string; title: string; description: string; kind: string; workstream: string;
  status: string; owner_name: string; due_date: string | null; evidence_url: string | null;
};

export default async function PurviewWorkspace({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const project = await getProject(supabase, projectId);
  if (!project) notFound();
  const [profileResult, itemsResult, snapshotsResult] = await Promise.all([
    supabase.from("purview_project_profiles").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("purview_work_items").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("purview_discovery_snapshots").select("*").eq("project_id", projectId).order("imported_at", { ascending: false }).limit(5),
  ]);
  if (profileResult.error || itemsResult.error || snapshotsResult.error) {
    throw new Error("Purview workspace is unavailable. Apply migration 0049 before using this page.");
  }
  const profile = profileResult.data;
  const items = (itemsResult.data ?? []) as WorkItem[];
  const snapshots = snapshotsResult.data ?? [];
  const closed = project.status === "closed";

  return <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
    <div>
      <Link href={`/dashboard/${projectId}`} className="text-sm text-brand hover:underline">← {project.customer_name}</Link>
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-brand">Project workspace / Purview</p>
      <h1 className="mt-2 text-3xl font-bold">From baseline to evidence</h1>
      <p className="mt-2 text-muted">Capture the current state, plan work, record decisions and risks, and track proof of completion.</p>
      <p className="mt-3 rounded-lg border border-border p-3 text-sm text-muted">Use synthetic or approved client information. This workspace does not connect to a tenant or run changes.</p>
    </div>

    <Card>
      <h2 className="text-xl font-semibold">Engagement baseline</h2>
      <p className="mt-1 text-sm text-muted">Record what is known, what you aim to change, and any licensing or cloud constraints.</p>
      <form action={savePurviewProfile} className="mt-5 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="projectId" value={projectId} />
        <label className="text-sm">Microsoft cloud
          <select className={input} name="cloud" defaultValue={profile?.cloud ?? "unknown"} disabled={closed}>
            <option value="unknown">Not confirmed</option><option value="commercial">Commercial</option><option value="gcc">GCC</option><option value="gcc_high">GCC High</option><option value="dod">DoD</option><option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm">Tenant label (no tenant ID needed)
          <input className={input} name="tenantLabel" maxLength={120} defaultValue={profile?.tenant_label ?? ""} disabled={closed} />
        </label>
        {([
          ["currentState", "Current state", profile?.current_state, 4000],
          ["targetState", "Target state", profile?.target_state, 4000],
          ["licensingNotes", "Licensing assumptions", profile?.licensing_notes, 2000],
          ["constraints", "Constraints and approvals", profile?.constraints, 2000],
        ] as const).map(([name, title, value, max]) =>
          <label className="text-sm" key={name}>{title}
            <textarea name={name} className={`${input} min-h-24`} maxLength={max} defaultValue={value ?? ""} disabled={closed} />
          </label>)}
        {!closed && <div className="md:col-span-2"><Button type="submit">Save baseline</Button></div>}
      </form>
    </Card>

    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Workboard</h2><p className="text-sm text-muted">{items.length} items across DLP, retention, labels and eDiscovery.</p></div>
      </div>
      {!closed && <Card className="mt-4">
        <h3 className="font-semibold">Add a task, decision, risk, milestone or evidence</h3>
        <form action={addPurviewItem} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="projectId" value={projectId} />
          <label className="text-sm">Type<select className={input} name="kind"><option value="task">Task</option><option value="risk">Risk</option><option value="decision">Decision</option><option value="milestone">Milestone</option><option value="evidence">Evidence</option></select></label>
          <label className="text-sm">Workstream<select className={input} name="workstream"><option value="dlp">DLP</option><option value="retention">Retention</option><option value="labels">Sensitivity labels</option><option value="ediscovery">eDiscovery</option><option value="other">Other</option></select></label>
          <label className="text-sm">Owner<input className={input} name="ownerName" maxLength={120} placeholder="Name or team" /></label>
          <label className="text-sm md:col-span-2">Title<input className={input} name="title" maxLength={160} required placeholder="Review existing DLP policies" /></label>
          <label className="text-sm">Due date<input className={input} name="dueDate" type="date" /></label>
          <label className="text-sm md:col-span-2">Notes<textarea className={input} name="description" maxLength={4000} /></label>
          <label className="text-sm">Evidence URL (HTTPS)<input className={input} name="evidenceUrl" type="url" maxLength={1000} placeholder="https://…" /></label>
          <div className="md:col-span-3"><Button type="submit">Add item</Button></div>
        </form>
      </Card>}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map(status => <div key={status} className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">{label[status]} <span className="text-muted">{items.filter(i => i.status === status).length}</span></h3>
          <div className="space-y-3">{items.filter(i => i.status === status).map(item => <Card key={item.id}>
            <p className="text-xs uppercase tracking-wide text-brand">{item.kind} · {label[item.workstream]}</p>
            <h4 className="mt-1 font-semibold break-words">{item.title}</h4>
            {item.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{item.description}</p>}
            {(item.owner_name || item.due_date) && <p className="mt-2 text-xs text-muted">{item.owner_name}{item.owner_name && item.due_date ? " · " : ""}{item.due_date}</p>}
            {item.evidence_url?.startsWith("https://") && <a className="mt-2 block text-sm text-brand underline break-all" href={item.evidence_url} target="_blank" rel="noopener noreferrer">Open evidence ↗</a>}
            {!closed && <form action={updatePurviewItem} className="mt-3 flex gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="itemId" value={item.id} /><select aria-label={`Status for ${item.title}`} className={input} name="status" defaultValue={item.status}>{statuses.map(s => <option key={s} value={s}>{label[s]}</option>)}</select><Button type="submit" size="sm" variant="secondary">Save</Button></form>}
          </Card>)}</div>
        </div>)}
      </div>
    </section>

    <Card>
      <h2 className="text-xl font-semibold">Read-only discovery snapshots</h2>
      <p className="mt-2 text-sm text-muted">Import a sanitized inventory after your organization authorizes the assessment. Only four aggregate counts are accepted; tenant identifiers, policy details, secrets, and tokens are rejected by the import schema. No live Microsoft connection is configured.</p>
      {!closed && <DiscoveryForm projectId={projectId} />}
      <div className="mt-5 space-y-2">{snapshots.map(s => <div key={s.id} className="rounded-lg border border-border p-3 text-sm">
        <strong>{s.tenant_label}</strong> · {s.cloud} · captured {new Date(s.captured_at).toLocaleDateString("en-US", { timeZone: "UTC" })}
        <p className="text-muted">Labels {s.inventory?.counts?.sensitivityLabels} · DLP {s.inventory?.counts?.dlpPolicies} · Retention {s.inventory?.counts?.retentionPolicies} · eDiscovery {s.inventory?.counts?.ediscoveryCases}</p>
      </div>)}</div>
    </Card>
  </main>;
}
