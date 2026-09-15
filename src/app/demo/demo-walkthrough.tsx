"use client";

import { useState } from "react";
import Link from "next/link";
import type { DeliverableType, ServiceType } from "@/lib/domain/enums";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import {
  SERVICE_LABELS,
  DELIVERABLE_LABELS,
  DELIVERABLE_REQUIRES_SERVICE,
  DELIVERABLE_CATEGORY,
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  SERVICE_PRACTICE_AREA,
} from "@/lib/domain/labels";
import {
  ServiceIcon,
  PracticeAreaIcon,
  SparkleIcon,
  CoreDeliverableIcon,
  DesignDeliverableIcon,
  DocxIcon,
  PdfIcon,
  PptxIcon,
} from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button, LinkButton, buttonClasses } from "@/components/ui/button";
import { DEMO_PROJECT, DEMO_INITIAL_SERVICES, DEMO_CANDIDATE_DELIVERABLES, DEMO_CONTENT } from "@/lib/demo/data";

const CATEGORY_ICON = { core: CoreDeliverableIcon, design: DesignDeliverableIcon } as const;

export function DemoWalkthrough() {
  const [services, setServices] = useState<Set<ServiceType>>(new Set(DEMO_INITIAL_SERVICES));
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<DeliverableType>>(
    new Set(DEMO_CANDIDATE_DELIVERABLES),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<DeliverableType | null>(null);
  const [savedNoticeType, setSavedNoticeType] = useState<DeliverableType | null>(null);

  const availableDeliverables = DEMO_CANDIDATE_DELIVERABLES.filter((type) => {
    const requiredService = DELIVERABLE_REQUIRES_SERVICE[type];
    return !requiredService || services.has(requiredService);
  });

  function toggleService(service: ServiceType) {
    setServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
    // Selections no longer available after a service is unchecked shouldn't
    // stay silently "selected" — same behavior the real generate form gets
    // for free by only ever rendering available types.
    setGeneratedAt(null);
  }

  function toggleDeliverable(type: DeliverableType) {
    setSelectedDeliverables((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleGenerate() {
    setIsGenerating(true);
    setGeneratedAt(null);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedAt(Date.now());
    }, 900);
  }

  const generatedTypes = generatedAt
    ? availableDeliverables.filter((t) => selectedDeliverables.has(t))
    : [];

  return (
    <div className="flex flex-col gap-10">
      <div
        className="flex flex-col gap-1 rounded-lg px-6 py-5 text-white"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white/80">
          <SparkleIcon className="h-4 w-4" />
          Demo
        </div>
        <p className="text-lg font-semibold">
          A fictional project you can click through hands-on — nothing here is saved.
        </p>
        <p className="text-sm text-white/80">
          This walks the exact flow you&apos;d use on a real engagement: pick services, generate
          deliverables, then review, edit, and export them.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">The intake</h2>
        <p className="mb-3 text-sm text-muted">
          Every real project starts with a short questionnaire like this one — it&apos;s what grounds
          every generated deliverable in the actual customer context instead of generic boilerplate.
        </p>
        <Card className="flex flex-col gap-2">
          <div className="font-medium">{DEMO_PROJECT.customerName}</div>
          <div className="text-sm text-muted">
            {DEMO_PROJECT.industry} &middot; {DEMO_PROJECT.userCount} users &middot;{" "}
            {DEMO_PROJECT.licensingTier}
          </div>
          <div className="text-sm">
            <span className="font-medium">Locations:</span>{" "}
            {DEMO_PROJECT.geographicLocations.join(", ")}
          </div>
          <div className="text-sm">
            <span className="font-medium">Compliance notes:</span> {DEMO_PROJECT.complianceNotes}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Step 1 — Services in scope</h2>
        <p className="mb-3 text-sm text-muted">
          Selecting a service does two things: it decides which service-specific deliverables (like
          DLP Design, below) become available, and it grounds AI generation in the right Knowledge
          Base content for that practice area. Try unchecking <strong>Data Loss Prevention</strong>{" "}
          and watch DLP Design disappear from Step 2.
        </p>
        <Card className="flex flex-col gap-4">
          {PRACTICE_AREAS.map((area) => {
            const servicesInArea = SERVICE_TYPES.filter((s) => SERVICE_PRACTICE_AREA[s] === area);
            return (
              <div key={area} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <PracticeAreaIcon area={area} className="h-3.5 w-3.5" />
                  {PRACTICE_AREA_LABELS[area]}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {servicesInArea.map((service) => {
                    const checked = services.has(service);
                    return (
                      <label
                        key={service}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          checked ? "border-brand bg-brand-light" : "border-border hover:bg-surface-hover"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleService(service)}
                          className="accent-brand"
                        />
                        <ServiceIcon service={service} className="h-4 w-4 shrink-0 text-brand-dark" />
                        {SERVICE_LABELS[service]}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Step 2 — Generate deliverables</h2>
        <p className="mb-3 text-sm text-muted">
          This demo has canned content for 3 of the real catalog&apos;s 18 deliverable types — enough to
          show the flow without needing a live AI call. Select which ones to generate, same as the
          real form.
        </p>
        <Card className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {availableDeliverables.map((type) => {
              const checked = selectedDeliverables.has(type);
              return (
                <label
                  key={type}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    checked ? "border-brand bg-brand-light" : "border-border hover:bg-surface-hover"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDeliverable(type)}
                    className="accent-brand"
                  />
                  {DELIVERABLE_LABELS[type]}
                </label>
              );
            })}
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || selectedDeliverables.size === 0}
            className="w-fit"
          >
            {isGenerating ? "Generating…" : "Generate deliverables"}
          </Button>
        </Card>
      </section>

      {generatedTypes.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Step 3 — Review, edit & export</h2>
          <p className="mb-3 text-sm text-muted">
            Every generated deliverable can be edited inline, then exported to DOCX, PDF, or PPTX.
            The export buttons below produce real files — try one.
          </p>
          <div className="flex flex-col gap-6">
            {generatedTypes.map((type) => (
              <DemoDeliverableCard
                key={type}
                type={type}
                isEditing={editingType === type}
                onStartEdit={() => setEditingType(type)}
                onSave={() => {
                  setEditingType(null);
                  setSavedNoticeType(type);
                  setTimeout(() => setSavedNoticeType(null), 2500);
                }}
                onCancel={() => setEditingType(null)}
                justSaved={savedNoticeType === type}
              />
            ))}
          </div>
        </section>
      )}

      <Card className="flex flex-col items-start gap-3">
        <h2 className="text-lg font-semibold">Ready to start a real project?</h2>
        <p className="text-sm text-muted">
          Everything above works the same way on a real engagement — except Step 2 calls Azure
          OpenAI and Step 3&apos;s edits actually save.
        </p>
        <div className="flex gap-3">
          <LinkButton href="/dashboard/new">Start a new project</LinkButton>
          <Link href="/dashboard" className="text-sm text-brand hover:underline self-center">
            Back to projects
          </Link>
        </div>
      </Card>
    </div>
  );
}

function DemoDeliverableCard({
  type,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  justSaved,
}: {
  type: DeliverableType;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  justSaved: boolean;
}) {
  const content = DEMO_CONTENT[type as keyof typeof DEMO_CONTENT];
  const CategoryIcon = CATEGORY_ICON[DELIVERABLE_CATEGORY[type] as keyof typeof CATEGORY_ICON] ?? CoreDeliverableIcon;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <CategoryIcon className="h-4 w-4 text-muted" />
          {DELIVERABLE_LABELS[type]}
          <Badge tone="brand">Demo content</Badge>
        </h3>
        <div className="flex items-center gap-2">
          <a className={buttonClasses("secondary", "sm")} href={`/api/demo/export?type=${type}&format=docx`}>
            <DocxIcon className="h-3.5 w-3.5" />
            DOCX
          </a>
          <a className={buttonClasses("secondary", "sm")} href={`/api/demo/export?type=${type}&format=pdf`}>
            <PdfIcon className="h-3.5 w-3.5" />
            PDF
          </a>
          <a className={buttonClasses("secondary", "sm")} href={`/api/demo/export?type=${type}&format=pptx`}>
            <PptxIcon className="h-3.5 w-3.5" />
            PPTX
          </a>
          {!isEditing && (
            <Button type="button" variant="ghost" size="sm" onClick={onStartEdit}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <Alert variant="warning" className="mb-3">
        AI-generated draft — review before sending to a client. Not certified compliance advice.
      </Alert>

      {justSaved && (
        <Alert variant="success" className="mb-3">
          Saved (demo only — nothing was actually stored).
        </Alert>
      )}

      {!isEditing ? (
        <div className="flex flex-col gap-4">
          {content.sections.map((section, i) => (
            <div key={i}>
              <h4 className="mb-1 text-sm font-semibold text-brand-dark">{section.heading}</h4>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="mb-1 text-sm text-foreground/80">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {content.sections.map((section, i) => (
            <div key={i} className="flex flex-col gap-1">
              <input
                defaultValue={section.heading}
                className="rounded-md border border-border px-2 py-1 text-sm font-semibold focus:border-brand focus:outline-none"
              />
              <textarea
                defaultValue={section.paragraphs.join("\n\n")}
                rows={Math.max(3, section.paragraphs.length * 2)}
                className="rounded-md border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button type="button" onClick={onSave} className="w-fit">
              Save edits
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
