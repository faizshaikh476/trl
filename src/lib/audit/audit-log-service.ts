import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { AuditLog } from "@/types/domain";

export class AuditLogService {
  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => `audit_${randomUUID()}`,
  ) {}

  async record(input: {
    workspaceId: string;
    actorId: string;
    action: string;
    targetId?: string;
  }) {
    const auditLog: AuditLog = {
      id: this.createId(),
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: input.action,
      ...(input.targetId ? { targetId: input.targetId } : {}),
      createdAt: this.now().toISOString(),
    };
    await getAdminDb()
      .collection(firestorePaths.workspaceAuditLogs(input.workspaceId))
      .doc(auditLog.id)
      .set(auditLog);
    return auditLog;
  }

  async listByWorkspace(workspaceId: string) {
    const snapshot = await getAdminDb()
      .collection(firestorePaths.workspaceAuditLogs(workspaceId))
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLog);
  }
}

export const auditLogService = new AuditLogService();
