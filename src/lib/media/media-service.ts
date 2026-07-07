import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { MediaAsset } from "@/types/domain";

export class MediaService {
  async listByListing(workspaceId: string, listingId: string) {
    const snapshot = await getAdminDb()
      .collection(firestorePaths.workspaceMedia(workspaceId))
      .where("listingId", "==", listingId)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as MediaAsset)
      .sort((a, b) => a.order - b.order);
  }

  async heroForListing(workspaceId: string, listingId: string) {
    const media = await this.listByListing(workspaceId, listingId);
    return media.find((asset) => asset.isHero) ?? media[0] ?? null;
  }
}

export const mediaService = new MediaService();
