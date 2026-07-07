import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { AuditLog } from "@/types/domain";

export class AuditLogService {
  async listByWorkspace(workspaceId: string) {
    const snapshot = await getAdminDb()
      .collection(firestorePaths.workspaceAuditLogs(workspaceId))
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLog);
  }
}

export const auditLogService = new AuditLogService();
