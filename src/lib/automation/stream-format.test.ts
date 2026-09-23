import { describe, expect, it } from "vitest";
import { extractStreamingScriptPreview, parseStreamedScript } from "./stream-format";

const complete =
  "%%%QUEPILOT_SCRIPT%%%\nWrite-Host 'hi'\n%%%QUEPILOT_NOTES%%%\nRun as admin.\n%%%QUEPILOT_ROLLBACK%%%\nDelete the file.";

describe("parseStreamedScript", () => {
  it("parses a well-formed, complete streamed response", () => {
    const result = parseStreamedScript(complete);
    expect(result).toEqual({
      content: "Write-Host 'hi'",
      notes: "Run as admin.",
      rollback: "Delete the file.",
    });
  });

  it("returns null when a marker is missing entirely", () => {
    expect(parseStreamedScript("%%%QUEPILOT_SCRIPT%%%\ncode\n%%%QUEPILOT_NOTES%%%\nnotes")).toBeNull();
  });

  it("returns null when markers are out of order", () => {
    const outOfOrder =
      "%%%QUEPILOT_NOTES%%%\nnotes\n%%%QUEPILOT_SCRIPT%%%\ncode\n%%%QUEPILOT_ROLLBACK%%%\nrollback";
    expect(parseStreamedScript(outOfOrder)).toBeNull();
  });

  it("returns null when the script section is empty", () => {
    const empty = "%%%QUEPILOT_SCRIPT%%%\n\n%%%QUEPILOT_NOTES%%%\nnotes\n%%%QUEPILOT_ROLLBACK%%%\nrollback";
    expect(parseStreamedScript(empty)).toBeNull();
  });

  it("tolerates leading preamble text before the first marker", () => {
    expect(parseStreamedScript(`Sure, here you go:\n\n${complete}`)).toEqual({
      content: "Write-Host 'hi'",
      notes: "Run as admin.",
      rollback: "Delete the file.",
    });
  });

  it("allows empty notes/rollback sections (schema only requires non-empty content)", () => {
    const minimal = "%%%QUEPILOT_SCRIPT%%%\ncode\n%%%QUEPILOT_NOTES%%%\n%%%QUEPILOT_ROLLBACK%%%\n";
    expect(parseStreamedScript(minimal)).toEqual({ content: "code", notes: "", rollback: "" });
  });
});

describe("extractStreamingScriptPreview", () => {
  it("is empty before the script marker has fully arrived", () => {
    expect(extractStreamingScriptPreview("Sure, here")).toBe("");
    expect(extractStreamingScriptPreview("Sure, here %%%QUEPILOT_SCR")).toBe("");
  });

  it("shows the script content as it streams in, before notes starts", () => {
    expect(extractStreamingScriptPreview("%%%QUEPILOT_SCRIPT%%%\nWrite-Host")).toBe("\nWrite-Host");
  });

  it("stops exactly at the notes marker once it fully arrives", () => {
    expect(extractStreamingScriptPreview("%%%QUEPILOT_SCRIPT%%%\ncode\n%%%QUEPILOT_NOTES%%%\nnotes so far")).toBe(
      "\ncode\n",
    );
  });

  it("never flashes a partial notes marker at the tail", () => {
    const withPartialMarker = "%%%QUEPILOT_SCRIPT%%%\ncode\n%%%QUEPILOT_NO";
    expect(extractStreamingScriptPreview(withPartialMarker)).toBe("\ncode\n");
  });

  it("shows the full script once notes never arrives (still streaming)", () => {
    expect(extractStreamingScriptPreview("%%%QUEPILOT_SCRIPT%%%\nline one\nline two")).toBe("\nline one\nline two");
  });
});
