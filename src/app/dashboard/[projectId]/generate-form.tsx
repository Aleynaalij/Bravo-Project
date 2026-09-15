"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DELIVERABLE_TYPES, type DeliverableType, type ServiceType } from "@/lib/domain/enums";
import {
  DELIVERABLE_LABELS,
  DELIVERABLE_REQUIRES_SERVICE,
  DELIVERABLE_CATEGORIES,
  DELIVERABLE_CATEGORY,
  DELIVERABLE_CATEGORY_LABELS,
  type DeliverableCategory,
} from "@/lib/domain/labels";
import {
  CoreDeliverableIcon,
  DesignDeliverableIcon,
  ProcessDeliverableIcon,
  ComplianceDeliverableIcon,
} from "@/components/icons";
import { generateDeliverablesAction, type GenerateFormState } from "./generate-actions";
import type { GenerationJobRow } from "@/lib/generation/jobs";
import { getFriendlyGenerationError } from "@/lib/generation/error-messages";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { ComponentType, SVGProps } from "react";

const initialState: GenerateFormState = {};
const POLL_INTERVAL_MS = 2500;

const CATEGORY_ICONS: Record<DeliverableCategory, ComponentType<SVGProps<SVGSVGElement>>> = {
  core: CoreDeliverableIcon,
  design: DesignDeliverableIcon,
  process: ProcessDeliverableIcon,
  compliance: ComplianceDeliverableIcon,
};

export function GenerateForm({
  projectId,
  services,
}: {
  projectId: string;
  services: ServiceType[];
}) {
  const [state, formAction, isSubmitting] = useActionState(generateDeliverablesAction, initialState);
  const router = useRouter();

  // Generation now runs in the background (a cron-processed queue, not
  // this request) — once the Server Action returns job ids, this polls
  // their status client-side and refreshes the page once every job the
  // batch created has reached a terminal state. isPolling stays separate
  // from useActionState's own isSubmitting, since the wait for real work
  // to finish happens entirely after the action has already returned.
  const [jobs, setJobs] = useState<Record<string, GenerationJobRow>>({});
  const [isPolling, setIsPolling] = useState(false);
  const lastEnqueuedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.jobIds || state.jobIds.length === 0) return;
    if (state.enqueuedAt === lastEnqueuedAt.current) return;
    lastEnqueuedAt.current = state.enqueuedAt;

    const jobIds = state.jobIds;
    let cancelled = false;
    setIsPolling(true);
    setJobs({});

    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      const results = await Promise.all(
        jobIds.map((id) =>
          fetch(`/api/generation-jobs/${id}`)
            .then((res) => (res.ok ? (res.json() as Promise<GenerationJobRow>) : null))
            .catch(() => null),
        ),
      );
      if (cancelled) return;

      const byId: Record<string, GenerationJobRow> = {};
      for (const job of results) {
        if (job) byId[job.id] = job;
      }
      setJobs(byId);

      const allTerminal = jobIds.every(
        (id) => byId[id]?.status === "succeeded" || byId[id]?.status === "failed",
      );
      if (allTerminal) {
        setIsPolling(false);
        router.refresh();
      } else {
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.jobIds, state.enqueuedAt]);

  const availableTypes = DELIVERABLE_TYPES.filter((type) => {
    const requiredService = DELIVERABLE_REQUIRES_SERVICE[type];
    return !requiredService || services.includes(requiredService);
  });

  const [selected, setSelected] = useState<Set<DeliverableType>>(new Set(availableTypes));

  function toggle(type: DeliverableType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  const jobList = Object.values(jobs);
  const doneCount = jobList.filter((j) => j.status === "succeeded" || j.status === "failed").length;
  const failedJobs = jobList.filter((j) => j.status === "failed");
  const isBusy = isSubmitting || isPolling;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="projectId" value={projectId} />

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {selected.size} of {availableTypes.length} selected
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => setSelected(new Set(availableTypes))}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => setSelected(new Set())}
          >
            Select none
          </button>
        </div>
      </div>

      {DELIVERABLE_CATEGORIES.map((category) => {
        const typesInCategory = availableTypes.filter((type) => DELIVERABLE_CATEGORY[type] === category);
        if (typesInCategory.length === 0) return null;
        const CategoryIcon = CATEGORY_ICONS[category];

        return (
          <div key={category} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <CategoryIcon className="h-3.5 w-3.5" />
              {DELIVERABLE_CATEGORY_LABELS[category]}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {typesInCategory.map((type) => {
                const isChecked = selected.has(type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      isChecked ? "border-brand bg-brand-light" : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="deliverableTypes"
                      value={type}
                      checked={isChecked}
                      onChange={() => toggle(type)}
                      className="accent-brand"
                    />
                    {DELIVERABLE_LABELS[type]}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {state.error && <Alert variant="error">{state.error}</Alert>}

      {isPolling && (
        <Alert variant="info">
          Generating {doneCount} of {jobList.length} complete&hellip; this runs in the background, safe
          to navigate away and come back.
        </Alert>
      )}

      {!isBusy && jobList.length > 0 && failedJobs.length === 0 && (
        <Alert variant="success">Generation complete.</Alert>
      )}

      {!isBusy && failedJobs.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-error-border bg-error-bg px-3 py-2">
          {failedJobs.map((job) => (
            <div key={job.id} className="text-sm text-error-text">
              <span className="font-medium">
                {DELIVERABLE_LABELS[job.deliverable_type] ?? job.deliverable_type} failed:
              </span>{" "}
              {getFriendlyGenerationError(job.error_message)}
              {job.error_message && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted">Technical details</summary>
                  <span className="mt-1 block font-mono text-xs text-muted">{job.error_message}</span>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <Button type="submit" disabled={isBusy || selected.size === 0} className="w-fit">
        {isSubmitting ? "Queuing…" : isPolling ? "Generating…" : "Generate deliverables"}
      </Button>
    </form>
  );
}
