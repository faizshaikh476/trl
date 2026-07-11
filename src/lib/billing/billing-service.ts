import {
  creditWalletService,
  NoListingCreditsError,
} from "@/lib/billing/credit-wallet-service";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { CreditPurchase, CreditWallet, Listing, Plan, Workspace } from "@/types/domain";

export type PlanInput = {
  name: string;
  description?: string;
  amountPaise: number;
  currency: Plan["currency"];
  listingCredits: number;
  creditValidityDays: number;
  listingVisibilityDays: number;
  featured: boolean;
  priceLabel?: string;
  activeListingLimit?: number;
  status: Plan["status"];
  sortOrder: number;
};

export type PlanUsage = {
  plan: Plan;
  activeListings: number;
  limit: number;
  remaining: number;
  isAtLimit: boolean;
};

export type BillingPurchaseSummary = {
  id: string;
  planId: string;
  planName: string;
  status: CreditPurchase["status"];
  credits: number;
  amountLabel: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type WorkspaceBillingSummary = {
  currentPackageName: string;
  currentPackageId: string;
  availableCredits: number;
  validUntil: string | null;
  validUntilLabel: string;
  isWalletActive: boolean;
  purchaseCount: number;
  latestPaidPurchase: BillingPurchaseSummary | null;
  purchases: BillingPurchaseSummary[];
};

export const LISTING_CREDIT_VALIDITY_DAYS = 30;
export const LISTING_VISIBILITY_DAYS = 60;

export const defaultPlans: Plan[] = [
  makeDefaultPlan("starter", "Starter", "Starter listing credit package", 199900, 25, false, 10),
  makeDefaultPlan("pro", "Pro", "Pro listing credit package", 499900, 100, true, 20),
  makeDefaultPlan("agency", "Agency", "Agency listing credit package", 999900, 500, true, 30),
];

export class ListingPlanLimitError extends Error {
  readonly code = "LISTING_PLAN_LIMIT";
  readonly usage: PlanUsage;

  constructor(usage: PlanUsage) {
    super(
      `This workspace has reached the ${usage.plan.name} plan limit of ${usage.limit} published listings.`,
    );
    this.name = "ListingPlanLimitError";
    this.usage = usage;
  }
}

export class BillingService {
  async listPlans() {
    const snapshot = await getAdminDb().collection(firestorePaths.plans()).get();
    const plans = snapshot.docs.map((doc) => normalizePlanRecord({ id: doc.id, ...doc.data() }));
    return (plans.length ? plans : defaultPlans).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listActivePlans() {
    return (await this.listPlans()).filter((plan) => plan.status === "active");
  }

  async defaultPlanId() {
    return selectDefaultPlanId(await this.listPlans());
  }

  async findPlan(planId: string) {
    const doc = await getAdminDb().doc(firestorePaths.plan(planId)).get();
    if (doc.exists) return normalizePlanRecord({ id: doc.id, ...doc.data() });
    return defaultPlans.find((plan) => plan.id === planId) ?? defaultPlans[0];
  }

  async upsertPlan(planId: string, input: PlanInput) {
    const now = new Date().toISOString();
    const ref = getAdminDb().doc(firestorePaths.plan(planId));
    const existing = await ref.get();
    const existingData = (existing.exists ? existing.data() : {}) as Record<string, unknown>;
    const plan = normalizePlanRecord({
      ...existingData,
      id: planId,
      name: input.name,
      description:
        input.description ??
        (typeof existingData.description === "string" ? existingData.description : ""),
      amountPaise: input.amountPaise,
      currency: input.currency,
      listingCredits: input.listingCredits,
      creditValidityDays: LISTING_CREDIT_VALIDITY_DAYS,
      listingVisibilityDays: input.listingVisibilityDays,
      featured: input.featured,
      priceLabel: input.priceLabel,
      activeListingLimit: input.activeListingLimit,
      status: input.status,
      sortOrder: input.sortOrder,
      createdAt: typeof existingData.createdAt === "string" ? existingData.createdAt : now,
      updatedAt: now,
    });
    await ref.set(plan, { merge: true });
    return plan;
  }

  async deletePlan(planId: string) {
    const workspaces = await workspaceService.list();
    const assignedWorkspace = workspaces.find((workspace) => workspace.planId === planId);
    if (assignedWorkspace) {
      throw new Error(`Move ${assignedWorkspace.name} to another plan before deleting this plan.`);
    }
    await getAdminDb().doc(firestorePaths.plan(planId)).delete();
  }

  async getWorkspaceUsage(workspaceOrId: Workspace | string) {
    const workspace =
      typeof workspaceOrId === "string"
        ? await workspaceService.findById(workspaceOrId)
        : workspaceOrId;
    if (!workspace) throw new Error("Workspace not found");

    const [{ listingService }, plan] = await Promise.all([
      import("@/lib/listings/listing-service"),
      this.findPlan(workspace.planId),
    ]);
    const listings = await listingService.listByWorkspace(workspace.id);

    return calculatePlanUsage(plan, listings);
  }

  async findWorkspacePlan(workspaceId: string) {
    const workspace = await workspaceService.findById(workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    return this.findPlan(workspace.planId);
  }

  async getListingCreditBalance(workspaceId: string) {
    return creditWalletService.getBalance(workspaceId);
  }

  async assertCanPublish(workspaceId: string, listingBeingPublished?: Listing | null) {
    const plan = await this.findWorkspacePlan(workspaceId);
    if (listingBeingPublished?.status === "published") {
      return planCreditUsage(plan, await creditWalletService.getBalance(workspaceId));
    }

    const wallet = await creditWalletService.assertCanReactivate(workspaceId);
    if (!listingBeingPublished?.creditLedgerEntryId && !listingBeingPublished?.creditConsumedAt) {
      if (wallet.availableCredits <= 0) throw new NoListingCreditsError();
    }

    return planCreditUsage(plan, wallet.availableCredits);
  }

  createCheckoutPlaceholder(planId: string) {
    return {
      provider: "razorpay",
      status: "mocked",
      planId,
      message: "Razorpay checkout can be enabled by adding live keys.",
    };
  }
}

function planCreditUsage(plan: Plan, availableCredits: number): PlanUsage {
  const remaining = Math.max(0, availableCredits);
  return {
    plan,
    activeListings: Math.max(0, plan.listingCredits - remaining),
    limit: plan.listingCredits,
    remaining,
    isAtLimit: remaining <= 0,
  };
}

/*
  Legacy usage calculation remains for callers that only need historical slot-style
  display data. Publication gating uses wallet credits through assertCanPublish.
*/

export function selectDefaultPlanId(plans: Plan[]) {
  const activePlans = plans
    .filter((plan) => plan.status === "active")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return activePlans.find((plan) => plan.id === "free")?.id ?? activePlans[0]?.id ?? "free";
}

export function calculatePlanUsage(plan: Plan, listings: Listing[]): PlanUsage {
  // Legacy compatibility for old slot-based callers until Task 3 replaces this path.
  const activeListings = listings.filter((listing) => listing.status === "published").length;
  const limit = Math.max(0, plan.listingCredits);
  return {
    plan,
    activeListings,
    limit,
    remaining: Math.max(0, limit - activeListings),
    isAtLimit: activeListings >= limit,
  };
}

export function parsePlanInput(formData: FormData): PlanInput {
  const name = requiredString(formData, "name");
  const isFreePlan = isFreePlanIdentifier(name, planIdFromName(name));
  const hasNewAmountPaise = hasFormValue(formData, "amountPaise");
  const hasNewListingCredits = hasFormValue(formData, "listingCredits");
  const hasNewCurrency = hasFormValue(formData, "currency");
  const hasNewListingVisibility = hasFormValue(formData, "listingVisibilityDays");
  const hasNewFeatured = hasFormValue(formData, "featured");
  const hasAnyNewPricingField =
    hasNewAmountPaise ||
    hasNewListingCredits ||
    hasNewCurrency ||
    hasNewListingVisibility ||
    hasNewFeatured;
  assertFixedCreditValidity(formData);

  const legacyPriceLabel = optionalString(formData, "priceLabel");
  const legacyActiveListingLimit = optionalPositiveWholeNumber(formData, "activeListingLimit");
  const amountPaise = hasNewAmountPaise
    ? wholeNumberAmountPaise(formData, "amountPaise", isFreePlan)
    : parseLegacyAmountPaise(legacyPriceLabel, isFreePlan);
  const currency = hasNewCurrency ? requiredCurrency(formData) : "INR";
  const listingCredits = hasNewListingCredits
    ? positiveWholeNumber(
        formData,
        "listingCredits",
        "Listing credits must be a positive whole number.",
      )
    : requiredLegacyListingCredits(legacyActiveListingLimit);
  const creditValidityDays = LISTING_CREDIT_VALIDITY_DAYS;
  const listingVisibilityDays = hasNewListingVisibility
    ? positiveWholeNumber(
        formData,
        "listingVisibilityDays",
        "Listing visibility must be a positive whole number of days.",
      )
    : LISTING_VISIBILITY_DAYS;
  const featured = hasNewFeatured ? booleanInput(formData.get("featured")) : false;
  const sortOrder = Number(formData.get("sortOrder") ?? 100);
  const status = String(formData.get("status") ?? "active");
  if (!Number.isFinite(sortOrder)) throw new Error("Sort order must be a number.");
  if (status !== "active" && status !== "inactive") throw new Error("Invalid plan status.");

  return {
    name,
    amountPaise,
    currency,
    listingCredits,
    creditValidityDays,
    listingVisibilityDays,
    featured,
    ...(!hasAnyNewPricingField && legacyPriceLabel
      ? {
          priceLabel: legacyPriceLabel,
          activeListingLimit: listingCredits,
        }
      : {}),
    status,
    sortOrder,
  };
}

export function formatPlanPrice(plan: Plan) {
  if (plan.amountPaise < 1 && plan.priceLabel?.trim()) return plan.priceLabel;
  const rupees = plan.amountPaise / 100;
  const hasFraction = plan.amountPaise % 100 !== 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(rupees);
  return `${plan.currency} ${formatted}`;
}

export function buildWorkspaceBillingSummary({
  workspace,
  wallet,
  purchases,
  plans,
  now = new Date(),
}: {
  workspace: Workspace;
  wallet: CreditWallet | null;
  purchases: CreditPurchase[];
  plans: Plan[];
  now?: Date;
}): WorkspaceBillingSummary {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const sortedPurchases = [...purchases].sort((a, b) => purchaseTime(b) - purchaseTime(a));
  const paidPurchases = sortedPurchases.filter((purchase) => purchase.status === "paid");
  const latestPaidPurchase =
    (wallet?.lastPurchaseId
      ? paidPurchases.find((purchase) => purchase.id === wallet.lastPurchaseId)
      : null) ?? paidPurchases[0] ?? null;
  const defaultPlan = planById.get(workspace.planId);
  const currentPlan = latestPaidPurchase ? planById.get(latestPaidPurchase.planId) : defaultPlan;
  const validUntil = wallet?.validUntil ?? null;

  return {
    currentPackageName: currentPlan?.name ?? workspace.planId,
    currentPackageId: currentPlan?.id ?? workspace.planId,
    availableCredits: Math.max(0, wallet?.availableCredits ?? 0),
    validUntil,
    validUntilLabel: validUntil ? formatCreditDate(validUntil) : "No active credits",
    isWalletActive: Boolean(validUntil && Date.parse(validUntil) > now.getTime()),
    purchaseCount: purchases.length,
    latestPaidPurchase: latestPaidPurchase
      ? summarizePurchase(latestPaidPurchase, planById)
      : null,
    purchases: sortedPurchases.map((purchase) => summarizePurchase(purchase, planById)),
  };
}

export function planIdFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredCurrency(formData: FormData): Plan["currency"] {
  const value = requiredString(formData, "currency").toUpperCase();
  if (value !== "INR") throw new Error("Currency must be INR.");
  return value;
}

function hasFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value != null && String(value).trim() !== "";
}

function positiveWholeNumber(formData: FormData, key: string, errorMessage: string) {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value) || value < 1) throw new Error(errorMessage);
  return value;
}

function assertFixedCreditValidity(formData: FormData) {
  if (!hasFormValue(formData, "creditValidityDays")) return;
  const value = Number(formData.get("creditValidityDays"));
  if (value !== LISTING_CREDIT_VALIDITY_DAYS) {
    throw new Error(`Credit validity is fixed at ${LISTING_CREDIT_VALIDITY_DAYS} days.`);
  }
}

function wholeNumberAmountPaise(formData: FormData, key: string, allowZero: boolean) {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value)) throw new Error("Amount must be a positive whole number.");
  if (value === 0 && allowZero) return value;
  if (value < 1) throw new Error("Amount must be a positive whole number.");
  return value;
}

function optionalPositiveWholeNumber(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${key} must be a positive whole number.`);
  }
  return number;
}

function requiredLegacyListingCredits(value: number | null) {
  if (value == null) throw new Error("Listing credits must be a positive whole number.");
  return value;
}

function booleanInput(value: FormDataEntryValue | null) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

function parseLegacyAmountPaise(priceLabel: string | null, isFreePlan: boolean) {
  if (!priceLabel) throw new Error("Amount must be a positive whole number.");
  const numeric = priceLabel.replace(/[^0-9.]/g, "");
  if (!numeric) {
    if (isFreePlan && priceLabel.trim().toLowerCase() === "free") return 0;
    throw new Error("Amount must be a positive whole number.");
  }
  const rupees = Number(numeric);
  if (!Number.isFinite(rupees)) {
    throw new Error("Amount must be a positive whole number.");
  }
  const amountPaise = Math.round(rupees * 100);
  if (amountPaise === 0 && isFreePlan) return amountPaise;
  if (amountPaise < 1) throw new Error("Amount must be a positive whole number.");
  return amountPaise;
}

function normalizeLegacyAmountPaise(priceLabel: string | null) {
  if (!priceLabel) return 0;
  const numeric = priceLabel.replace(/[^0-9.]/g, "");
  if (!numeric) return 0;
  const rupees = Number(numeric);
  if (!Number.isFinite(rupees) || rupees < 0) return 0;
  const amountPaise = Math.round(rupees * 100);
  return amountPaise >= 0 ? amountPaise : 0;
}

function summarizePurchase(purchase: CreditPurchase, planById: Map<string, Plan>) {
  return {
    id: purchase.id,
    planId: purchase.planId,
    planName: planById.get(purchase.planId)?.name ?? purchase.planId,
    status: purchase.status,
    credits: purchase.quantity,
    amountLabel: formatPurchaseAmount(purchase.amountPaise, purchase.currency),
    providerOrderId: purchase.providerOrderId,
    providerPaymentId: purchase.providerPaymentId,
    paidAt: purchase.paidAt,
    createdAt: purchase.createdAt,
  } satisfies BillingPurchaseSummary;
}

function formatPurchaseAmount(amountPaise: number, currency: Plan["currency"]) {
  if (amountPaise <= 0) return "Free";
  const rupees = amountPaise / 100;
  const hasFraction = amountPaise % 100 !== 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(rupees);
  return `${currency} ${formatted}`;
}

function formatCreditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function purchaseTime(purchase: CreditPurchase) {
  const timestamp = purchase.paidAt ?? purchase.updatedAt ?? purchase.createdAt;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlanRecord(plan: Record<string, unknown>) {
  const amountPaise =
    readNormalizedAmountPaise(plan.amountPaise) ?? normalizeLegacyAmountPaise(readString(plan.priceLabel));
  const listingCredits =
    readPositiveWholeNumber(plan.listingCredits) ?? readPositiveWholeNumber(plan.activeListingLimit) ?? 0;
  const normalized = {
    ...plan,
    description: readString(plan.description) ?? "",
    amountPaise,
    currency: "INR" as const,
    listingCredits,
    creditValidityDays: LISTING_CREDIT_VALIDITY_DAYS,
    listingVisibilityDays: readPositiveWholeNumber(plan.listingVisibilityDays) ?? LISTING_VISIBILITY_DAYS,
    featured: readBoolean(plan.featured),
    priceLabel: readString(plan.priceLabel) ?? formatPlanPrice({ amountPaise, currency: "INR" } as Plan),
    activeListingLimit: listingCredits,
  };
  return normalized as Plan & Record<string, unknown>;
}

function readPositiveWholeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return null;
  return value;
}

function readNormalizedAmountPaise(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown) {
  return value === true;
}

function isFreePlanIdentifier(name: string | null, id: string | null) {
  return name?.trim().toLowerCase() === "free" || id?.trim().toLowerCase() === "free";
}

function makeDefaultPlan(
  id: string,
  name: string,
  description: string,
  amountPaise: number,
  listingCredits: number,
  featured: boolean,
  sortOrder: number,
): Plan {
  const now = "2026-01-01T00:00:00.000Z";
  return normalizePlanRecord({
    id,
    name,
    description,
    amountPaise,
    listingCredits,
    creditValidityDays: LISTING_CREDIT_VALIDITY_DAYS,
    listingVisibilityDays: LISTING_VISIBILITY_DAYS,
    featured,
    status: "active",
    sortOrder,
    createdAt: now,
    updatedAt: now,
  });
}

export const billingService = new BillingService();
