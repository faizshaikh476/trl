import crypto from "node:crypto";

export interface PurchaseLinkPayload {
  workspaceId: string;
  planId: string;
  expiresAt: string;
}

export interface VerifyPurchaseLinkOptions {
  now?: Date;
  workspaceId?: string;
  planId?: string;
}

export function createPurchaseLinkToken(input: PurchaseLinkPayload) {
  const payload = normalizePayload(input);
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", requirePurchaseLinkSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyPurchaseLinkToken(
  token: string,
  options: VerifyPurchaseLinkOptions = {},
): PurchaseLinkPayload | null {
  const secret = process.env.PURCHASE_LINK_SECRET?.trim();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [encodedPayload, signature] = parts;
  const expected = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  if (!timingSafeEqualString(signature, expected)) return null;

  const payload = parsePayload(encodedPayload);
  if (!payload) return null;

  const now = options.now ?? new Date();
  if (new Date(payload.expiresAt).getTime() <= now.getTime()) return null;
  if (options.workspaceId && payload.workspaceId !== options.workspaceId) return null;
  if (options.planId && payload.planId !== options.planId) return null;

  return payload;
}

function normalizePayload(input: PurchaseLinkPayload): PurchaseLinkPayload {
  const workspaceId = input.workspaceId.trim();
  const planId = input.planId.trim();
  const expiresAt = input.expiresAt.trim();
  if (!workspaceId) throw new Error("workspaceId is required.");
  if (!planId) throw new Error("planId is required.");
  if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
    throw new Error("expiresAt must be a valid ISO timestamp.");
  }
  return { workspaceId, planId, expiresAt };
}

function parsePayload(encodedPayload: string): PurchaseLinkPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      workspaceId?: unknown;
      planId?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof parsed.workspaceId !== "string" ||
      typeof parsed.planId !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      !parsed.workspaceId.trim() ||
      !parsed.planId.trim() ||
      Number.isNaN(new Date(parsed.expiresAt).getTime())
    ) {
      return null;
    }
    return {
      workspaceId: parsed.workspaceId,
      planId: parsed.planId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function requirePurchaseLinkSecret() {
  const secret = process.env.PURCHASE_LINK_SECRET?.trim();
  if (!secret) throw new Error("PURCHASE_LINK_SECRET is required.");
  return secret;
}

function timingSafeEqualString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
