import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { Listing, Plan, Workspace } from "@/types/domain";

export type PlanInput = {
  name: string;
  amountPaise: number;
  currency: Plan["currency"];
  listingCredits: number;
  creditValidityDays: number;
  listingVisibilityDays: number;
  featured: boolean;
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

export const defaultPlans: Plan[] = [
  makeDefaultPlan("starter", "Starter", "Starter listing credit package", 199900, 25, 30, 30, false, 10),
  makeDefaultPlan("pro", "Pro", "Pro listing credit package", 499900, 100, 30, 45, true, 20),
  makeDefaultPlan("agency", "Agency", "Agency listing credit package", 999900, 500, 30, 60, true, 30),
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
    const plans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Plan);
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
    if (doc.exists) return { id: doc.id, ...doc.data() } as Plan;
    return defaultPlans.find((plan) => plan.id === planId) ?? defaultPlans[0];
  }

  async upsertPlan(planId: string, input: PlanInput) {
    const now = new Date().toISOString();
    const ref = getAdminDb().doc(firestorePaths.plan(planId));
    const existing = await ref.get();
    const plan: Plan = {
      id: planId,
      name: input.name,
      description: existing.exists ? ((existing.data() as Plan).description ?? "") : "",
      amountPaise: input.amountPaise,
      currency: input.currency,
      listingCredits: input.listingCredits,
      creditValidityDays: input.creditValidityDays,
      listingVisibilityDays: input.listingVisibilityDays,
      featured: input.featured,
      status: input.status,
      sortOrder: input.sortOrder,
      createdAt: existing.exists ? ((existing.data() as Plan).createdAt ?? now) : now,
      updatedAt: now,
    };
    await ref.set(plan);
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

    const [plan, listings] = await Promise.all([
      this.findPlan(workspace.planId),
      listingService.listByWorkspace(workspace.id),
    ]);

    return calculatePlanUsage(plan, listings);
  }

  async assertCanPublish(workspaceId: string, listingBeingPublished?: Listing | null) {
    if (listingBeingPublished?.status === "published") return this.getWorkspaceUsage(workspaceId);
    const usage = await this.getWorkspaceUsage(workspaceId);
    if (usage.isAtLimit) throw new ListingPlanLimitError(usage);
    return usage;
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

export function selectDefaultPlanId(plans: Plan[]) {
  const activePlans = plans
    .filter((plan) => plan.status === "active")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return activePlans.find((plan) => plan.id === "free")?.id ?? activePlans[0]?.id ?? "free";
}

export function calculatePlanUsage(plan: Plan, listings: Listing[]): PlanUsage {
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
  const amountPaise = positiveWholeNumber(
    formData,
    "amountPaise",
    "Amount must be a positive whole number.",
  );
  const currency = requiredCurrency(formData);
  const listingCredits = positiveWholeNumber(
    formData,
    "listingCredits",
    "Listing credits must be a positive whole number.",
  );
  const creditValidityDays = positiveWholeNumber(
    formData,
    "creditValidityDays",
    "Credit validity must be a positive whole number of days.",
  );
  const listingVisibilityDays = positiveWholeNumber(
    formData,
    "listingVisibilityDays",
    "Listing visibility must be a positive whole number of days.",
  );
  const featured = booleanInput(formData.get("featured"));
  const sortOrder = Number(formData.get("sortOrder") ?? 100);
  const status = String(formData.get("status") ?? "active");
  if (!Number.isFinite(sortOrder)) throw new Error("Sort order must be a number.");
  if (status !== "active" && status !== "inactive") throw new Error("Invalid plan status.");

  return {
    name: requiredString(formData, "name"),
    amountPaise,
    currency,
    listingCredits,
    creditValidityDays,
    listingVisibilityDays,
    featured,
    status,
    sortOrder,
  };
}

export function formatPlanPrice(plan: Plan) {
  const rupees = plan.amountPaise / 100;
  const hasFraction = plan.amountPaise % 100 !== 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(rupees);
  return `${plan.currency} ${formatted}`;
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

function requiredCurrency(formData: FormData): Plan["currency"] {
  const value = requiredString(formData, "currency").toUpperCase();
  if (value !== "INR") throw new Error("Currency must be INR.");
  return value;
}

function positiveWholeNumber(formData: FormData, key: string, errorMessage: string) {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value) || value < 1) throw new Error(errorMessage);
  return value;
}

function booleanInput(value: FormDataEntryValue | null) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

function makeDefaultPlan(
  id: string,
  name: string,
  description: string,
  amountPaise: number,
  listingCredits: number,
  creditValidityDays: number,
  listingVisibilityDays: number,
  featured: boolean,
  sortOrder: number,
): Plan {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id,
    name,
    description,
    amountPaise,
    currency: "INR",
    listingCredits,
    creditValidityDays,
    listingVisibilityDays,
    featured,
    status: "active",
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export const billingService = new BillingService();
