import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type FirestoreIndexManifest = {
  indexes: Array<{
    collectionGroup: string;
    queryScope: string;
    fields: Array<{ fieldPath: string; order?: string; arrayConfig?: string }>;
  }>;
  fieldOverrides: Array<{
    collectionGroup: string;
    fieldPath: string;
    ttl?: boolean;
    indexes: Array<{ order: string; queryScope: string }>;
  }>;
};

describe("Firestore index manifest", () => {
  it("supports loading the most recent credit grant in the admin workspace page", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "firebase/firestore.indexes.json"), "utf8"),
    ) as FirestoreIndexManifest;

    expect(manifest.indexes).toContainEqual({
      collectionGroup: "creditLedger",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "type", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" },
      ],
    });
  });

  it("expires customer messages and abandoned intake buffers", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "firebase/firestore.indexes.json"), "utf8"),
    ) as FirestoreIndexManifest;

    expect(manifest.fieldOverrides).toContainEqual({
      collectionGroup: "customerMessages",
      fieldPath: "expiresAt",
      ttl: true,
      indexes: [],
    });
    expect(manifest.fieldOverrides).toContainEqual({
      collectionGroup: "intakeSessions",
      fieldPath: "expiresAt",
      ttl: true,
      indexes: [],
    });
  });

  it("supports customer directory sorts and primary filters", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "firebase/firestore.indexes.json"), "utf8"),
    ) as FirestoreIndexManifest;

    for (const sortField of ["lastActivityAt", "firstSeenAt", "latestPurchaseAt", "followUpAt"]) {
      expect(manifest.indexes).toContainEqual({
        collectionGroup: "customerActivities",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: sortField, order: sortField === "followUpAt" ? "ASCENDING" : "DESCENDING" },
          { fieldPath: "id", order: sortField === "followUpAt" ? "ASCENDING" : "DESCENDING" },
        ],
      });
    }

    for (const filterField of ["classification", "stage", "planId", "paymentState", "walletState"]) {
      expect(manifest.indexes).toContainEqual({
        collectionGroup: "customerActivities",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: filterField, order: "ASCENDING" },
          { fieldPath: "lastActivityAt", order: "DESCENDING" },
          { fieldPath: "id", order: "DESCENDING" },
        ],
      });
    }
  });
});
