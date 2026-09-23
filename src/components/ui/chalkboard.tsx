"use client";

import { useEffect, useRef } from "react";

// The QuePilot robot, writing the script live on a digital chalkboard as
// it streams in (src/app/api/automation/creator/stream/route.ts). This is
// deliberately dark regardless of the page's own light/dark theme — a
// chalkboard reads as a chalkboard on either, the same way this app's
// code blocks elsewhere stay monospace/neutral rather than re-theming.
// All animation happens through Tailwind's motion-safe: variant, so
// prefers-reduced-motion gets the static board with zero extra branching.
export function Chalkboard({ text, streaming }: { text: string; streaming: boolean }) {
  const boardRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const board = boardRef.current;
    if (board) board.scrollTop = board.scrollHeight;
  }, [text]);

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "linear-gradient(160deg, #8a5a34 0%, #6b4423 60%, #573619 100%)",
        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.45)",
      }}
    >
      <div className="relative overflow-hidden rounded-md" style={{ background: "radial-gradient(circle at 30% 20%, #1a3a26 0%, #0f2418 70%)" }}>
        <pre
          ref={boardRef}
          className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words p-4 pb-14 font-mono text-sm leading-relaxed"
          style={{ color: "#eafbea", textShadow: "0 0 2px rgba(234,251,234,0.35)" }}
        >
          {text || (streaming ? " " : "")}
          {streaming && (
            <span
              aria-hidden
              className="motion-safe:animate-[chalkbot-caret_1s_step-start_infinite] ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-[#eafbea]"
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
      <line x1="26" y1="4" x2="26" y2="12" stroke="#9fd6ff" strokeWidth="2" />
      <circle
        cx="26"
        cy="4"
        r="2.5"
        fill="#7cc9ff"
        className={active ? "motion-safe:animate-[chalkbot-glow_1.1s_ease-in-out_infinite]" : ""}
      />
      {/* head */}
      <rect x="12" y="12" width="28" height="20" rx="6" fill="#0f6cbd" stroke="#7cc9ff" strokeWidth="1.5" />
      <g className="motion-safe:animate-[chalkbot-blink_4s_ease-in-out_infinite]" style={{ transformOrigin: "26px 22px" }}>
        <circle cx="20" cy="22" r="2.2" fill="#eafbea" />
        <circle cx="32" cy="22" r="2.2" fill="#eafbea" />
      </g>
      {/* body */}
      <rect x="15" y="33" width="22" height="17" rx="4" fill="#0c3b5e" stroke="#7cc9ff" strokeWidth="1.5" />
      <rect x="21" y="38" width="10" height="6" rx="1.5" fill="#7cc9ff" opacity="0.7" />
      {/* arm + chalk, nudges while active */}
      <g
        className={active ? "motion-safe:animate-[chalkbot-nudge_0.7s_ease-in-out_infinite]" : ""}
        style={{ transformOrigin: "37px 37px" }}
      >
        <line x1="37" y1="37" x2="46" y2="44" stroke="#0c3b5e" strokeWidth="3" strokeLinecap="round" />
        <rect x="44" y="42" width="6" height="3" rx="1" fill="#eafbea" transform="rotate(38 47 43.5)" />
      </g>
    </svg>
  );
}
