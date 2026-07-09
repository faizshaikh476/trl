import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { AnalyticsEvent } from "@/types/domain";

type TrackableAnalyticsType =
  | "listing_view"
  | "whatsapp_click"
  | "call_click"
  | "enquiry_submit"
  | "share_click";

const counterByEventType: Partial<Record<TrackableAnalyticsType, string>> = {
  listing_view: "views",
  whatsapp_click: "whatsappClicks",
  call_click: "callClicks",
  enquiry_submit: "leads",
};

export class AnalyticsService {
  async listByWorkspace(workspaceId: string) {
    const snapshot = await getAdminDb()
      .collection(firestorePaths.workspaceAnalyticsEvents(workspaceId))
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AnalyticsEvent);
  }

  async recordListingEvent({
    workspaceId,
    listingId,
    type,
  }: {
    workspaceId: string;
    listingId: string;
    type: TrackableAnalyticsType;
  }) {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const eventRef = db.collection(firestorePaths.workspaceAnalyticsEvents(workspaceId)).doc();
    const event: AnalyticsEvent = {
      id: eventRef.id,
      workspaceId,
      listingId,
      type,
      createdAt: now,
    };

    await eventRef.set(event);

    const counter = counterByEventType[type];
    if (counter) {
      await db.doc(firestorePaths.workspaceListing(workspaceId, listingId)).update({
        [counter]: FieldValue.increment(1),
      });
    }

    return event;
  }

  async totals(workspaceId: string) {
    const events = await this.listByWorkspace(workspaceId);
    const views = events.filter((event) => event.type === "listing_view").length;
    const enquiries = events.filter((event) => event.type === "enquiry_submit").length;
    return {
      views,
      whatsappClicks: events.filter((event) => event.type === "whatsapp_click").length,
      callClicks: events.filter((event) => event.type === "call_click").length,
      shares: events.filter((event) => event.type === "share_click").length,
      enquiries,
      conversionRate: views > 0 ? Math.round((enquiries / views) * 100) : 0,
    };
  }
}

export const analyticsService = new AnalyticsService();
