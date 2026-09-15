"use client";

import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function applyTheme(pref: ThemePreference) {
  if (pref === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", pref);
  }
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    // One-time sync from localStorage (a browser-only API layout.tsx's
    // bootstrap script already read to set data-theme before paint) into
    // this component's own state so its buttons reflect the active choice.
    try {
      const stored = localStorage.getItem("theme");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "light" || stored === "dark") setPref(stored);
    } catch {
      // localStorage unavailable (private browsing, blocked storage) — stay on "system"
    }
  }, []);

  function choose(next: ThemePreference) {
    setPref(next);
    applyTheme(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // best-effort persistence only — the theme still applies for this page view
    }
  }

  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => choose(opt.value)}
          aria-pressed={pref === opt.value}
          className={`rounded px-3 py-1 text-sm transition-colors ${
            pref === opt.value ? "bg-brand text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
