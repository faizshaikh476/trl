import type { CustomerOperationsRepository } from "./customer-operations-repository";
import type { CustomerActivity } from "./customer-operations.types";

export interface CustomerBackfillCandidate {
  activity: CustomerActivity;
}

export interface CustomerBackfillError {
  error: string;
}

export interface CustomerBackfillSource {
  listCandidates(): Promise<Array<CustomerBackfillCandidate | CustomerBackfillError>>;
}

export interface CustomerBackfillReport {
  apply: boolean;
  scanned: number;
  wouldCreate: number;
  wouldUpdate: number;
  unchanged: number;
  skippedNoPhone: number;
  errors: string[];
}

export class CustomerBackfill {
  constructor(
    private readonly source: CustomerBackfillSource,
    private readonly repository: Pick<CustomerOperationsRepository, "getActivity" | "upsertActivity">,
  ) {}

  async run({ apply }: { apply: boolean }): Promise<CustomerBackfillReport> {
    const candidates = await this.source.listCandidates();
    const report: CustomerBackfillReport = {
      apply,
      scanned: candidates.length,
      wouldCreate: 0,
      wouldUpdate: 0,
      unchanged: 0,
      skippedNoPhone: 0,
      errors: [],
    };

    for (const candidate of candidates) {
      if ("error" in candidate) {
        report.errors.push(candidate.error);
        continue;
      }
      const activity = normalizeCandidate(candidate.activity);
      if (!activity.phone) {
        report.skippedNoPhone += 1;
        continue;
      }
      try {
        const existing = await this.repository.getActivity(activity.id);
        const projected = existing ? preserveOperationalFields(existing, activity) : activity;
        if (existing && stableJson(existing) === stableJson(projected)) {
          report.unchanged += 1;
          continue;
        }
        if (existing) report.wouldUpdate += 1;
        else report.wouldCreate += 1;
        if (apply) await this.repository.upsertActivity(projected.id, projected);
      } catch (error) {
        report.errors.push(
          `${activity.workspaceId}: ${error instanceof Error ? error.message : "backfill failed"}`,
        );
      }
    }
    return report;
  }
}

function preserveOperationalFields(
  existing: CustomerActivity,
  projected: CustomerActivity,
): CustomerActivity {
  return {
    ...projected,
    firstSeenAt: existing.firstSeenAt,
    lastInboundAt: existing.lastInboundAt,
    lastOutboundAt: existing.lastOutboundAt,
    tags: existing.tags,
    privateNote: existing.privateNote,
    followUpAt: existing.followUpAt,
    resolution: existing.resolution,
    historyRetainedFrom: existing.historyRetainedFrom,
  };
}

function normalizeCandidate(activity: CustomerActivity): CustomerActivity {
  const phone = activity.phone.replace(/\D/g, "");
  return {
    ...activity,
    id: phone ? `contact_${phone}` : activity.id,
    phone,
    historyRetainedFrom: activity.historyRetainedFrom || activity.lastActivityAt,
  };
}

function stableJson(value: unknown) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, sortObject(nested)]),
  );
}
