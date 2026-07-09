export function requestedOtpAudit(now: string) {
  return {
    requestedAt: now,
    sendStatus: "pending" as const,
    failedVerificationAttempts: 0,
  };
}

export function acceptedOtpAudit(messageId: string, _providerStatus: string, now: string) {
  return {
    providerMessageId: messageId,
    sendStatus: "accepted" as const,
    providerAcceptedAt: now,
  };
}

export function failedOtpAttemptAudit(now: string) {
  return {
    failedVerificationAttempts: "increment" as const,
    lastFailedVerificationAt: now,
  };
}

export function verifiedOtpAudit(uid: string, now: string) {
  return {
    verifiedAt: now,
    verifiedByUid: uid,
  };
}
