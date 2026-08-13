import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type FirestoreIndexManifest = {
  indexes: Array<{
    collectionGroup: string;
    queryScope: string;
    fields: Array<{ fieldPath: string; order: string }>;
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
});
