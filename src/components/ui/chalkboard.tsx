"use client";

import { useEffect, useRef } from "react";

// Centered, blurred-backdrop overlay so the chalkboard is impossible to
// miss while Code Creator is generating — it previously rendered inline
// at the bottom of the form, easy to scroll past without ever seeing the
// script arrive. Stays mounted through the "closing" phase (show=false)
// so its exit keyframe can play before the caller unmounts it.
export function ChalkboardOverlay({ show, children }: { show: boolean; children: React.ReactNode }) {
  const backdropAnim = show
    ? "motion-safe:animate-[chalkbot-backdrop-in_250ms_ease-out_forwards]"
    : "motion-safe:animate-[chalkbot-backdrop-out_250ms_ease-in_forwards]";
  const cardAnim = show
    ? "motion-safe:animate-[chalkbot-overlay-in_300ms_ease-out_forwards]"
    : "motion-safe:animate-[chalkbot-overlay-out_300ms_ease-in_forwards]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Generating script"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm ${backdropAnim}`}
    >
      <div className={`w-full max-w-2xl ${cardAnim}`}>{children}</div>
    </div>
  );
}

// The QuePilot robot, writing the script live on a digital chalkboard as
// it streams in (src/app/api/automation/creator/stream/route.ts) — black
// board, electric-blue chalk, deliberately theme-independent since a
// terminal reads as a terminal on either light or dark host theme. All
// animation goes through Tailwind's motion-safe: variant, so
// prefers-reduced-motion gets the static board with zero extra branching.
export function Chalkboard({ text, streaming, complete }: { text: string; streaming: boolean; complete: boolean }) {
  const boardRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const board = boardRef.current;
    if (board) board.scrollTop = board.scrollHeight;
  }, [text]);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#00d4ff]/25 bg-black"
      style={{
        boxShadow: "0 0 0 1px rgba(0,212,255,0.12), 0 0 48px -12px rgba(0,212,255,0.45), 0 24px 60px -20px rgba(0,0,0,0.85)",
      }}
    >
      <div className="flex items-center justify-between border-b border-[#00d4ff]/15 px-4 py-2.5">
        <span className="font-mono text-xs tracking-wide text-[#00d4ff]/70">QuePilot Code Creator</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-[#00d4ff]">
          {complete ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="#00d4ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Complete
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] motion-safe:animate-[chalkbot-glow_1.1s_ease-in-out_infinite]" />
              Writing…
            </>
          )}
        </span>
      </div>

      <div className="relative">
        <pre
          ref={boardRef}
          className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap break-words p-4 pb-14 font-mono text-sm leading-relaxed"
          style={{ color: "#00d4ff", textShadow: "0 0 6px rgba(0,212,255,0.55), 0 0 1px rgba(0,212,255,0.9)" }}
        >
          {text || (streaming ? " " : "")}
          {streaming && (
            <span
              aria-hidden
              className="motion-safe:animate-[chalkbot-caret_1s_step-start_infinite] ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-[#00d4ff]"
            />
          )}
        </pre>

        <div className="pointer-events-none absolute bottom-2 right-3 motion-safe:animate-[chalkbot-bob_2.4s_ease-in-out_infinite]">
          <RobotMascot active={streaming} />
        </div>
      </div>
    </div>
  );
}

function RobotMascot({ active }: { active: boolean }) {
  return (
    <svg width="52" height="56" viewBox="0 0 52 56" aria-hidden focusable="false">
      {/* antenna */}
      <line x1="26" y1="4" x2="26" y2="12" stroke="#00d4ff" strokeWidth="2" />
      <circle
        cx="26"
        cy="4"
        r="2.5"
        fill="#00d4ff"
        className={active ? "motion-safe:animate-[chalkbot-glow_1.1s_ease-in-out_infinite]" : ""}
      />
      {/* head — near-black fill so it reads as a faint silhouette against
          the board, with the cyan stroke doing the real outline work */}
      <rect x="12" y="12" width="28" height="20" rx="6" fill="#0a0f16" stroke="#00d4ff" strokeWidth="1.5" />
      <g className="motion-safe:animate-[chalkbot-blink_4s_ease-in-out_infinite]" style={{ transformOrigin: "26px 22px" }}>
        <circle cx="20" cy="22" r="2.2" fill="#00d4ff" />
        <circle cx="32" cy="22" r="2.2" fill="#00d4ff" />
      </g>
      {/* body */}
      <rect x="15" y="33" width="22" height="17" rx="4" fill="#0a0f16" stroke="#00d4ff" strokeWidth="1.5" />
      <rect x="21" y="38" width="10" height="6" rx="1.5" fill="#00d4ff" opacity="0.55" />
      {/* arm + chalk, nudges while active */}
      <g
        className={active ? "motion-safe:animate-[chalkbot-nudge_0.7s_ease-in-out_infinite]" : ""}
        style={{ transformOrigin: "37px 37px" }}
      >
        <line x1="37" y1="37" x2="46" y2="44" stroke="#0a0f16" strokeWidth="3" strokeLinecap="round" />
        <rect x="44" y="42" width="6" height="3" rx="1" fill="#00d4ff" transform="rotate(38 47 43.5)" />
      </g>
    </svg>
  );
}
