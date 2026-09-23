"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  generatedSopId?: string | null;
  generatedSopTitle?: string | null;
}

interface ChatResponse {
  conversationId: string;
  reply: string;
  generatedSopId: string | null;
  generatedSopTitle: string | null;
}

// The dashboard home page's chat surface — "ask Que anything about
// Microsoft Purview or this platform, get step-by-step guidance grounded
// in Microsoft's own docs and this account's own Knowledge Vault, then
// ask it to turn the answer into a real downloadable SOP." Starts
// collapsed to a single input row; expands into a message thread on the
// first submit. Deliberately doesn't browse past conversations (each page
// load starts fresh) — the conversation is still persisted server-side
// (assistant_conversations/assistant_messages), just not browsable yet.
export function AskQueBar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
      });
      const data = (await res.json()) as ChatResponse | { code: string; message: string };

      if (!res.ok) {
        const message2 = "message" in data ? data.message : "Something went wrong — try again.";
        setError(message2);
        return;
      }

      const chatData = data as ChatResponse;
      setConversationId(chatData.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chatData.reply,
          generatedSopId: chatData.generatedSopId,
          generatedSopTitle: chatData.generatedSopTitle,
        },
      ]);
    } catch {
      setError("Couldn't reach Que just now — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium">Ask Que</h2>
        <p className="text-sm text-muted">
          Ask a Microsoft Purview question and get step-by-step guidance, or ask how to do something in this
          platform. Say &ldquo;generate an SOP for this&rdquo; on any answer to save it as a real, downloadable
          Word doc.
        </p>
      </div>

      {messages.length > 0 && (
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-md border border-border p-3">
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {m.role === "user" ? "You" : "Que"}
              </span>
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              {m.generatedSopId && (
                <Link
                  href={`/dashboard/sops/${m.generatedSopId}`}
                  className="w-fit text-sm text-brand hover:underline"
                >
                  View &ldquo;{m.generatedSopTitle}&rdquo; &rarr;
                </Link>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-muted">Que is thinking&hellip;</p>}
          <div ref={threadEndRef} />
        </div>
      )}

      {error && <p className="text-sm text-error-text">{error}</p>}

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Que anything about Purview or this platform&hellip;"
          disabled={loading}
          className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:opacity-60"
        />
        <Button type="submit" size="sm" disabled={loading || !input.trim()}>
          {loading ? "Asking…" : "Ask"}
        </Button>
      </form>
    </Card>
  );
}
