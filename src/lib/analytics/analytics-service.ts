import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { AnalyticsEvent } from "@/types/domain";

export class AnalyticsService {
  async listByWorkspace(workspaceId: string) {
    const snapshot = await getAdminDb()
      .collection(firestorePaths.workspaceAnalyticsEvents(workspaceId))
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AnalyticsEvent);
  }

  async totals(workspaceId: string) {
    const events = await this.listByWorkspace(workspaceId);
    return {
      views: events.filter((event) => event.type === "listing_view").length,
      whatsappClicks: events.filter((event) => event.type === "whatsapp_click").length,
      enquiries: events.filter((event) => event.type === "enquiry_submit").length,
    };
  }
}

export const analyticsService = new AnalyticsService();
