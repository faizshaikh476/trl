import { afterEach, describe, expect, it } from "vitest";
import { formatIndiaDateTime } from "./india-time";

const originalTimeZone = process.env.TZ;

describe("India date and time formatting", () => {
  afterEach(() => {
    process.env.TZ = originalTimeZone;
  });

  it("renders an absolute timestamp in India time regardless of the server timezone", () => {
    process.env.TZ = "UTC";

    expect(formatIndiaDateTime("2026-08-13T08:04:00.000Z")).toBe(
      "13 Aug 2026, 01:34 pm",
    );
  });
});
