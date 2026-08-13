import crypto from "node:crypto";

export interface ListingActivationPayload {
  workspaceId: string;
  listingId: string;
  expiresAt: string;
}

export interface VerifyListingActivationOptions {
  now?: Date;
  workspaceId?: string;
  listingId?: string;
}

export function createListingActivationToken(input: ListingActivationPayload) {
  const payload = normalizePayload(input);
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", requireSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyListingActivationToken(
  token: string,
  options: VerifyListingActivationOptions = {},
): ListingActivationPayload | null {
  const secret = process.env.PURCHASE_LINK_SECRET?.trim();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [encodedPayload, signature] = parts;
  const expected = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  if (!timingSafeEqual(signature, expected)) return null;

  const payload = parsePayload(encodedPayload);
  if (!payload) return null;
  if (Date.parse(payload.expiresAt) <= (options.now ?? new Date()).getTime()) return null;
  if (options.workspaceId && payload.workspaceId !== options.workspaceId) return null;
  if (options.listingId && payload.listingId !== options.listingId) return null;
  return payload;
}

function normalizePayload(input: ListingActivationPayload): ListingActivationPayload {
  const workspaceId = input.workspaceId.trim();
  const listingId = input.listingId.trim();
  const expiresAt = input.expiresAt.trim();
  if (!workspaceId) throw new Error("workspaceId is required.");
  if (!listingId) throw new Error("listingId is required.");
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) {
    throw new Error("expiresAt must be a valid ISO timestamp.");
  }
  return { workspaceId, listingId, expiresAt };
}

function parsePayload(encodedPayload: string): ListingActivationPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      workspaceId?: unknown;
      listingId?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof parsed.workspaceId !== "string" ||
      typeof parsed.listingId !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      !parsed.workspaceId.trim() ||
      !parsed.listingId.trim() ||
      Number.isNaN(Date.parse(parsed.expiresAt))
    ) {
      return null;
    }
    return {
      workspaceId: parsed.workspaceId,
      listingId: parsed.listingId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function requireSecret() {
  const secret = process.env.PURCHASE_LINK_SECRET?.trim();
  if (!secret) throw new Error("PURCHASE_LINK_SECRET is required.");
  return secret;
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
