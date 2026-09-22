import { describe, expect, it } from "vitest";
import { buildNavEntries, flattenNavEntries, getActiveHref, isNavGroup } from "./nav-config";

describe("buildNavEntries", () => {
  it("omits the Admin group for a non-admin", () => {
    const entries = buildNavEntries(false);
    expect(entries.some((e) => isNavGroup(e) && e.label === "Admin")).toBe(false);
  });

  it("appends the Admin group last for a platform admin", () => {
    const entries = buildNavEntries(true);
    const last = entries[entries.length - 1];
    expect(isNavGroup(last) && last.label === "Admin").toBe(true);
  });

  it("keeps every href unique", () => {
    const hrefs = flattenNavEntries(buildNavEntries(true)).map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("flattenNavEntries", () => {
  it("flattens direct links and group items into one list", () => {
    const flat = flattenNavEntries([
      { href: "/a", label: "A" },
      { label: "Group", items: [{ href: "/b", label: "B" }, { href: "/c", label: "C" }] },
    ]);
    expect(flat.map((item) => item.href)).toEqual(["/a", "/b", "/c"]);
  });
});

describe("getActiveHref", () => {
  const items = [
    { href: "/dashboard", label: "Projects" },
    { href: "/dashboard/billing", label: "Billing" },
  ];

  it("matches an exact path", () => {
    expect(getActiveHref("/dashboard/billing", items)).toBe("/dashboard/billing");
  });

  it("matches a nested path against its parent", () => {
    expect(getActiveHref("/dashboard/abc-123", items)).toBe("/dashboard");
  });

  it("prefers the longer, more specific match", () => {
    expect(getActiveHref("/dashboard/billing/invoices", items)).toBe("/dashboard/billing");
  });

  it("returns null when nothing matches", () => {
    expect(getActiveHref("/login", items)).toBeNull();
  });
});
