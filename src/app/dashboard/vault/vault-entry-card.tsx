"use client";

import { useState } from "react";
import type { VaultEntry } from "@/lib/vault/service";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import { DocxIcon, PdfIcon, PptxIcon } from "@/components/icons";
import { Button, buttonClasses } from "@/components/ui/button";
import { PdfViewerModal } from "./pdf-viewer-modal";

export function VaultEntryCard({
  projectId,
  customerName,
  entry,
  showCustomerName = false,
}: {
  projectId: string;
  customerName: string;
  entry: VaultEntry;
  // FileVault already groups rows under a per-project heading, so
  // repeating the customer name on every row would be redundant there.
  // The dashboard's recent-activity widget spans multiple projects in one
  // list, so it needs the name inline to stay legible.
  showCustomerName?: boolean;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const base = `/api/projects/${projectId}/deliverables/${entry.deliverableId}/export`;
  const label = DELIVERABLE_LABELS[entry.type];

  function emailLink() {
    const url = `${window.location.origin}${base}?format=pdf`;
    const subject = `${customerName} — ${label}`;
    const body = `Here's the "${label}" deliverable for ${customerName}:\n\n${url}\n\nYou'll need to be signed in to BravoPilot to open this link.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 last:border-b-0">
        <div>
          <div className="font-medium">
            {showCustomerName ? `${customerName} — ${label}` : label}
          </div>
          <div className="text-xs text-muted">
            v{entry.versionNumber} &middot; {new Date(entry.generatedAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setViewerOpen(true)}>
            <PdfIcon className="h-3.5 w-3.5" />
            View
          </Button>
          <a className={buttonClasses("secondary", "sm")} href={`${base}?format=docx`}>
            <DocxIcon className="h-3.5 w-3.5" />
            DOCX
          </a>
          <a className={buttonClasses("secondary", "sm")} href={`${base}?format=pdf`}>
            <PdfIcon className="h-3.5 w-3.5" />
            PDF
          </a>
          <a className={buttonClasses("secondary", "sm")} href={`${base}?format=pptx`}>
            <PptxIcon className="h-3.5 w-3.5" />
            PPTX
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={emailLink}>
            Email
          </Button>
        </div>
      </div>

      {viewerOpen && (
        <PdfViewerModal
          title={`${customerName} — ${label}`}
          src={`${base}?format=pdf&disposition=inline`}
          downloadSrc={`${base}?format=pdf`}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
