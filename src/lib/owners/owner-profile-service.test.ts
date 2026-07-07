import { describe, expect, it } from "vitest";
import {
  maskPhoneNumber,
  normalizePhoneNumber,
  ownerProfileIdForPhone,
} from "./owner-profile-service";

describe("owner profile phone helpers", () => {
  it("normalizes a local Indian mobile number to an owner-safe identifier", () => {
    expect(normalizePhoneNumber("98220 52388")).toBe("919822052388");
    expect(ownerProfileIdForPhone("+91 98220 52388")).toBe("owner_919822052388");
  });

  it("keeps non-local country-code numbers stable", () => {
    expect(normalizePhoneNumber("+1 (415) 555-0199")).toBe("14155550199");
    expect(ownerProfileIdForPhone("+1 (415) 555-0199")).toBe("owner_14155550199");
  });

  it("masks phone numbers for public claim pages", () => {
    expect(maskPhoneNumber("+91 98220 52388")).toBe("********2388");
  });
});
