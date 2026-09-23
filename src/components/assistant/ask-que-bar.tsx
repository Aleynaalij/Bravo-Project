"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SopState = { status: "idle" } | { status: "generating" } | { status: "done"; sopId: string; sopTitle: string };

const PLACEHOLDER = "Ask me anything";

const SUGGESTED_TOPICS = [
  "How do I close out a project?",
  "How do I set up a DLP policy for Exchange?",
  "Generate an SOP for a retention label rollout",
  "How do I search across my Knowledge Vault?",
];

// Single-shot by design (revised down from an earlier multi-turn chat
// design once its open-ended AI cost was flagged as a concern): one
// question, one grounded answer, and an optional explicit "generate an
// SOP from this" follow-up — never a growing conversation history sent
// back to the model on every exchange. Each of those two actions is its
// own bounded API call (/api/assistant/ask, /api/assistant/generate-sop).
export function AskQueBar() {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sopState, setSopState] = useState<SopState>({ status: "idle" });
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setError(null);
    setReply(null);
    setSopState({ status: "idle" });
    setShowSuggestions(false);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong — try again.");
        return;
      }

      setAskedQuestion(q);
      setReply(data.reply as string);
    } catch {
      setError("Couldn't reach Que just now — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSop() {
    if (!askedQuestion || !reply || sopState.status === "generating") return;

    setSopState({ status: "generating" });
    setError(null);

    try {
      const res = await fetch("/api/assistant/generate-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askedQuestion, reply }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Couldn't generate an SOP from that — try again.");
        setSopState({ status: "idle" });
        return;
      }

      setSopState({ status: "done", sopId: data.sopId as string, sopTitle: data.sopTitle as string });
    } catch {
      setError("Couldn't reach Que just now — check your connection and try again.");
      setSopState({ status: "idle" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowSuggestions((v) => !v)}
          aria-expanded={showSuggestions}
          aria-label="Suggested topics"
          title="Suggested topics"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs text-muted hover:border-brand hover:text-brand"
        >
          i
        </button>
      </div>

      <form onSubmit={handleAsk} className="relative">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={PLACEHOLDER}
          disabled={loading}
          className="w-full rounded-3xl border border-border bg-surface px-6 py-5 pr-16 text-base focus:border-brand focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          aria-label="Ask Que"
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-40"
        >
          {loading ? (
            <span className="text-xs">…</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="6 11 12 5 18 11" />
            </svg>
          )}
        </button>
      </form>

      {showSuggestions && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => {
                setQuestion(topic);
                setShowSuggestions(false);
              }}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:border-brand hover:bg-surface-hover"
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-error-text">{error}</p>}

      {reply && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">You asked</span>
            <p className="text-sm">{askedQuestion}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Que</span>
            <p className="whitespace-pre-wrap text-sm">{reply}</p>
          </div>

          {sopState.status === "done" ? (
            <Link href={`/dashboard/sops/${sopState.sopId}`} className="w-fit text-sm text-brand hover:underline">
              View &ldquo;{sopState.sopTitle}&rdquo; &rarr;
            </Link>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              disabled={sopState.status === "generating"}
              onClick={handleGenerateSop}
            >
              {sopState.status === "generating" ? "Generating SOP…" : "Generate SOP from this"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
