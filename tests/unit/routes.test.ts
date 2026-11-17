import { describe, expect, it } from "vitest";
import { NAV } from "@/components/app-shell/nav-config";
import { DEFAULT_APP_PATH, isProtectedPath, safeNextPath } from "@/lib/routes";

describe("safeNextPath", () => {
  it.each([
    ["/journal", "/journal"],
    ["/accounts/abc?tab=rules#x", "/accounts/abc?tab=rules#x"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [undefined],
    [""],
    ["https://evil.example/phish"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["dashboard"],
    [42],
  ])("rejects %s", (input) => {
    expect(safeNextPath(input)).toBe(DEFAULT_APP_PATH);
  });
});

describe("isProtectedPath", () => {
  it("protects app routes and their children", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/accounts/123/settings")).toBe(true);
  });

  it("leaves public routes open", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/sign-in")).toBe(false);
    expect(isProtectedPath("/auth/callback")).toBe(false);
    expect(isProtectedPath("/tools/prop-roi-calculator")).toBe(false);
    // Prefix match must respect segment boundaries.
    expect(isProtectedPath("/dashboards-are-public")).toBe(false);
  });

  it("covers every in-app navigation destination", () => {
    for (const item of Object.values(NAV)) {
      expect(isProtectedPath(item.href), item.href).toBe(true);
    }
  });
});
