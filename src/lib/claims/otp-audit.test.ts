import { describe, expect, it } from "vitest";
import {
  acceptedOtpAudit,
  failedOtpAttemptAudit,
  requestedOtpAudit,
  verifiedOtpAudit,
} from "./otp-audit";

describe("OTP audit patches", () => {
  it("records a request and provider acceptance without the OTP", () => {
    const requested = requestedOtpAudit("2026-07-09T10:00:00.000Z");
    const accepted = acceptedOtpAudit("wamid_123", "sent", "2026-07-09T10:00:01.000Z");

    expect(requested).toEqual({
      requestedAt: "2026-07-09T10:00:00.000Z",
      sendStatus: "pending",
      failedVerificationAttempts: 0,
    });
    expect(accepted).toEqual({
      providerMessageId: "wamid_123",
      sendStatus: "accepted",
      providerAcceptedAt: "2026-07-09T10:00:01.000Z",
    });
    expect(JSON.stringify({ requested, accepted })).not.toContain("otp");
  });

  it("records failed attempts and successful verification", () => {
    expect(failedOtpAttemptAudit("2026-07-09T10:01:00.000Z")).toEqual({
      failedVerificationAttempts: "increment",
      lastFailedVerificationAt: "2026-07-09T10:01:00.000Z",
    });
    expect(verifiedOtpAudit("uid_123", "2026-07-09T10:02:00.000Z")).toEqual({
      verifiedAt: "2026-07-09T10:02:00.000Z",
      verifiedByUid: "uid_123",
    });
  });
});
