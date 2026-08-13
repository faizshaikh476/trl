import { beforeEach, describe, expect, it, vi } from "vitest";

const firebase = vi.hoisted(() => ({
  writes: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        set: async (value: Record<string, unknown>) => {
          firebase.writes.push(value);
        },
      }),
    }),
  }),
}));

import { FirestoreWhatsAppIntakeSessionStore } from "./whatsapp-intake-session-store";

describe("FirestoreWhatsAppIntakeSessionStore retention", () => {
  beforeEach(() => {
    firebase.writes.length = 0;
  });

  it("scrubs text and media after completing an intake", async () => {
    const store = new FirestoreWhatsAppIntakeSessionStore();
    await store.markCompleted("workspace_1", "919876543210", "listing_1");

    expect(firebase.writes).toEqual([
      expect.objectContaining({
        status: "completed",
        listingId: "listing_1",
        messages: [],
        media: [],
      }),
    ]);
  });

  it("scrubs text and media after cancelling an intake", async () => {
    const store = new FirestoreWhatsAppIntakeSessionStore();
    await store.markCancelled("workspace_1", "919876543210");

    expect(firebase.writes).toEqual([
      expect.objectContaining({ status: "cancelled", messages: [], media: [] }),
    ]);
  });
});
