"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SopState = { status: "idle" } | { status: "generating" } | { status: "done"; sopId: string; sopTitle: string };

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

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setError(null);
    setReply(null);
    setSopState({ status: "idle" });
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
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium">Ask Que</h2>
        <p className="text-sm text-muted">
          Ask a Microsoft Purview question and get step-by-step guidance, or ask how to do something in this
          platform. Once you have an answer, you can turn it into a real, downloadable SOP.
        </p>
      </div>

      <form className="flex gap-2" onSubmit={handleAsk}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Que anything about Purview or this platform&hellip;"
          disabled={loading}
          className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:opacity-60"
        />
        <Button type="submit" size="sm" disabled={loading || !question.trim()}>
          {loading ? "Asking…" : "Ask"}
        </Button>
      </form>

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
    </Card>
  );
}
