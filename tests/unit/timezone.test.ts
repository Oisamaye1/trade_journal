import { describe, expect, it } from "vitest";
import { isValidTimeZone, normalizeTimeZone } from "@/domain/time/timezone";

describe("time zones", () => {
  it.each(["UTC", "Europe/London", "America/New_York", "Etc/GMT-2", "Asia/Tokyo"])(
    "accepts %s",
    (tz) => expect(isValidTimeZone(tz)).toBe(true),
  );

  it.each(["", "Mars/Olympus", "GMT+25", null, undefined, 3, "x".repeat(65)])("rejects %s", (tz) =>
    expect(isValidTimeZone(tz)).toBe(false),
  );

  it("normalizes invalid input to the fallback", () => {
    expect(normalizeTimeZone("nope")).toBe("UTC");
    expect(normalizeTimeZone(null, "Europe/Prague")).toBe("Europe/Prague");
    expect(normalizeTimeZone("Europe/Prague")).toBe("Europe/Prague");
  });
});
