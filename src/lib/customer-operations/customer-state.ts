import { normalizePhoneNumber } from "@/lib/owners/owner-profile-service";
import type { CreditWallet } from "@/types/domain";
import type {
  ClassificationInput,
  CustomerClassification,
  CustomerJourneyStage,
  JourneyInput,
  WalletSummary,
} from "./customer-operations.types";

const MESSAGE_RETENTION_DAYS = 180;
const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SEARCH_TOKENS = 200;
const MAX_PREFIX_LENGTH = 32;

export function contactIdForPhone(phone: string) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) throw new Error("Phone number is required.");
  return `contact_${normalized}`;
}

export function classifyContact(input: ClassificationInput): CustomerClassification {
  return input.hasPaidPurchase || input.hasAuthenticatedUser ? "customer" : "prospect";
}

export function deriveJourneyStage(input: JourneyInput): CustomerJourneyStage {
  if (input.needsAttention) return "needs_attention";
  if (input.paymentFailed) return "payment_failed";
  if (input.paymentPending) return "payment_pending";
  if (input.hasReadyListing) return "ready_to_publish";
  if (input.hasIntake) return "listing_started";
  if (input.isCustomer) return "customer";
  return "new_chat";
}

export function deriveWalletState(
  wallet: CreditWallet | null,
  effectiveCredits: number,
  now: Date,
): WalletSummary {
  if (!wallet) {
    return { state: "never_funded", effectiveCredits: 0, label: "Never funded" };
  }

  const validUntil = Date.parse(wallet.validUntil);
  if (!Number.isFinite(validUntil) || validUntil <= now.getTime()) {
    return { state: "expired", effectiveCredits: 0, label: "Expired" };
  }

  const usableCredits = Math.max(0, effectiveCredits);
  if (usableCredits === 0) {
    return { state: "empty", effectiveCredits: 0, label: "0 remaining" };
  }

  return {
    state: "active",
    effectiveCredits: usableCredits,
    label: `Active · ${usableCredits} credit${usableCredits === 1 ? "" : "s"}`,
  };
}

export function messageExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function isInsideCustomerServiceWindow(lastInboundAt: string | null, now: Date) {
  if (!lastInboundAt) return false;
  const timestamp = Date.parse(lastInboundAt);
  if (!Number.isFinite(timestamp)) return false;
  const elapsed = now.getTime() - timestamp;
  return elapsed >= 0 && elapsed <= CUSTOMER_SERVICE_WINDOW_MS;
}

export function buildSearchTokens(values: Array<string | null | undefined>) {
  const tokens = new Set<string>();

  for (const value of values) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) continue;

    addToken(tokens, normalized);
    const digits = normalized.replace(/\D/g, "");
    if (digits) {
      addToken(tokens, digits);
      if (digits.length > 10) addToken(tokens, digits.slice(-10));
    }

    for (const word of normalized.match(/[\p{L}\p{N}_-]+/gu) ?? []) {
      const limit = Math.min(word.length, MAX_PREFIX_LENGTH);
      for (let length = 2; length <= limit; length += 1) {
        addToken(tokens, word.slice(0, length));
      }
      if (tokens.size >= MAX_SEARCH_TOKENS) break;
    }

    if (tokens.size >= MAX_SEARCH_TOKENS) break;
  }

  return [...tokens].slice(0, MAX_SEARCH_TOKENS);
}

function addToken(tokens: Set<string>, token: string) {
  if (tokens.size < MAX_SEARCH_TOKENS && token) tokens.add(token);
}
