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
    const heroSnapshot = await getAdminDb()
      .collection(firestorePaths.workspaceMedia(workspaceId))
      .where("listingId", "==", listingId)
      .where("isHero", "==", true)
      .limit(1)
      .get();
    const hero = heroSnapshot.docs[0];
    if (hero) return { id: hero.id, ...hero.data() } as MediaAsset;

    const fallbackSnapshot = await getAdminDb()
      .collection(firestorePaths.workspaceMedia(workspaceId))
      .where("listingId", "==", listingId)
      .limit(1)
      .get();
    const fallback = fallbackSnapshot.docs[0];
    return fallback ? ({ id: fallback.id, ...fallback.data() } as MediaAsset) : null;
  }
}

export const mediaService = new MediaService();
