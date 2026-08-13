import type {
  CustomerActivity,
  CustomerDirectoryQuery,
  CustomerJourneyStage,
  CustomerPaymentState,
  WalletState,
} from "./customer-operations.types";
import type { CustomerDetail } from "./customer-operations-service";
import { isInsideCustomerServiceWindow } from "./customer-state";

type SearchParams = Record<string, string | string[] | undefined>;

const tabs = ["customers", "prospects", "all"] as const;
const sorts = [
  "last_activity_desc",
  "first_seen_desc",
  "latest_purchase_desc",
  "follow_up_asc",
] as const;
const stages: CustomerJourneyStage[] = [
  "new_chat",
  "listing_started",
  "ready_to_publish",
  "payment_pending",
  "payment_failed",
  "customer",
  "needs_attention",
];
const paymentStates: CustomerPaymentState[] = ["none", "pending", "paid", "failed", "refunded"];
const walletStates: WalletState[] = ["never_funded", "expired", "empty", "active"];
const followUpStates = ["due", "scheduled", "none", "resolved"] as const;

export function parseDirectoryQuery(searchParams: SearchParams): CustomerDirectoryQuery {
  const tab = allowed(first(searchParams.tab), tabs) ?? "customers";
  const sort = allowed(first(searchParams.sort), sorts) ?? "last_activity_desc";
  const pageSize = allowedNumber(first(searchParams.pageSize), [25, 50, 100]) ?? 25;
  const cursorValue = first(searchParams.cursor);
  const stage = allowed(first(searchParams.stage), stages);
  const paymentState = allowed(first(searchParams.payment), paymentStates);
  const walletState = allowed(first(searchParams.wallet), walletStates);
  const followUpState = allowed(first(searchParams.followUp), followUpStates);
  const planId = slug(first(searchParams.plan));
  const searchToken = normalizedSearch(first(searchParams.q));

  return {
    tab,
    sort,
    pageSize,
    cursor: cursorValue && validCursor(cursorValue) ? cursorValue : null,
    filters: {
      ...(stage ? { stage } : {}),
      ...(paymentState ? { paymentState } : {}),
      ...(walletState ? { walletState } : {}),
      ...(followUpState ? { followUpState } : {}),
      ...(planId ? { planId } : {}),
    },
    searchToken,
  };
}

export function customerDirectoryHref(
  query: CustomerDirectoryQuery,
  overrides: {
    tab?: CustomerDirectoryQuery["tab"];
    cursor?: string | null;
    contact?: string;
    view?: "conversation";
  },
) {
  const params = new URLSearchParams();
  params.set("tab", overrides.tab ?? query.tab);
  if (query.searchToken) params.set("q", query.searchToken);
  if (query.filters.stage) params.set("stage", query.filters.stage);
  if (query.filters.paymentState) params.set("payment", query.filters.paymentState);
  if (query.filters.walletState) params.set("wallet", query.filters.walletState);
  if (query.filters.followUpState) params.set("followUp", query.filters.followUpState);
  if (query.filters.planId) params.set("plan", query.filters.planId);
  if (query.sort !== "last_activity_desc") params.set("sort", query.sort);
  if (query.pageSize !== 25) params.set("pageSize", String(query.pageSize));
  const cursor = overrides.cursor === undefined ? query.cursor : overrides.cursor;
  if (cursor) params.set("cursor", cursor);
  if (overrides.contact) params.set("contact", overrides.contact);
  if (overrides.view) params.set("view", overrides.view);
  return `/admin/workspaces?${params}`;
}

export function toDirectoryRow(
  activity: CustomerActivity,
  planNamesById: Readonly<Record<string, string>> = {},
) {
  return {
    id: activity.id,
    name: activity.displayName || `Broker ${activity.phone.slice(-4)}`,
    phone: activity.phone,
    city: activity.city || "City not set",
    classificationLabel: title(activity.classification),
    stageLabel: title(activity.stage),
    planLabel: planNamesById[activity.planId] ?? title(activity.planId),
    paymentLabel: title(activity.paymentState),
    creditsLabel: creditsLabel(activity),
    listingsLabel: `${activity.listingCounts.published} live · ${activity.listingCounts.ready} ready · ${activity.listingCounts.total} total`,
    latestActivityLabel: activity.latestActivityLabel,
    lastActivityAt: activity.lastActivityAt,
    followUpLabel: activity.followUpAt ? formatDateTime(activity.followUpAt) : "Not scheduled",
    followUpAt: activity.followUpAt,
  };
}

export function toCustomerDetailModel(
  detail: CustomerDetail,
  planNamesById: Readonly<Record<string, string>> = {},
  now = new Date(),
) {
  const activity = detail.activity;
  return {
    activity,
    planLabel: planNamesById[activity.planId] ?? title(activity.planId),
    retentionLabel: `History retained from ${formatDate(activity.historyRetainedFrom)}`,
    insideReplyWindow: isInsideCustomerServiceWindow(activity.lastInboundAt, now),
    messages: detail.messages.map((message) => ({
      id: message.id,
      contactId: message.contactId,
      workspaceId: message.workspaceId,
      direction: message.direction,
      senderType: message.senderType,
      text: message.text,
      deliveryStatus: message.deliveryStatus,
      deliveryLabel: title(message.deliveryStatus),
      failureSummary: message.failureSummary,
      createdAt: message.createdAt,
      createdLabel: formatDateTime(message.createdAt),
    })),
    events: detail.events.map((event) => ({
      id: event.id,
      type: event.type,
      label: event.label,
      listingId: event.listingId,
      occurredAt: event.occurredAt,
      occurredLabel: formatDateTime(event.occurredAt),
    })),
  };
}

function creditsLabel(activity: CustomerActivity) {
  if (activity.walletState === "never_funded") return "Never funded";
  if (activity.walletState === "expired") return "Expired · 0 available";
  if (activity.walletState === "empty") return "Used up · 0 available";
  return `${activity.effectiveCredits} available`;
}

function formatDateTime(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "Invalid date";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(parsed));
}

function formatDate(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "unknown";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(parsed));
}

function title(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizedSearch(value: string | undefined) {
  const token = value?.trim().toLowerCase().match(/[a-z0-9]+/)?.[0] ?? "";
  return token ? token.slice(0, 40) : null;
}

function slug(value: string | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || undefined;
}

function validCursor(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    return typeof parsed.id === "string" && (parsed.sortValue === null || typeof parsed.sortValue === "string");
  } catch {
    return false;
  }
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function allowed<T extends string>(value: string | undefined, values: readonly T[]) {
  return value && values.includes(value as T) ? (value as T) : undefined;
}

function allowedNumber(value: string | undefined, values: readonly number[]) {
  const parsed = Number(value);
  return values.includes(parsed) ? parsed : undefined;
}
