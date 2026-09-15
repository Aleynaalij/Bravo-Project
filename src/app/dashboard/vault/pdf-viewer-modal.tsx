"use client";

import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/button";

export function PdfViewerModal({
  title,
  src,
  downloadSrc,
  onClose,
}: {
  title: string;
  src: string;
  downloadSrc: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <h3 className="truncate text-sm font-medium">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <a href={downloadSrc} className={buttonClasses("secondary", "sm")}>
              Download
            </a>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        {/* Browsers render PDFs with their own native viewer inside an
            iframe, complete with print/zoom/download controls — no PDF.js
            or similar library needed for a "built-in" viewer. */}
        <iframe src={src} title={title} className="flex-1 border-0" />
      </div>
    </div>
  );
}
