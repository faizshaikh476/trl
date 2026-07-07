import { describe, expect, it } from "vitest";
import { getFirestoreDatabaseId } from "./database-id";

describe("getFirestoreDatabaseId", () => {
  it("uses the configured Firestore database id and defaults to the default database", () => {
    process.env.FIRESTORE_DATABASE_ID = "active";
    expect(getFirestoreDatabaseId()).toBe("active");

    delete process.env.FIRESTORE_DATABASE_ID;
    expect(getFirestoreDatabaseId()).toBe("(default)");
  });
});
