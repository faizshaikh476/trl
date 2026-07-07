import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { ParsedWhatsAppMessage } from "./whatsapp-provider";

export type WhatsAppIntakeSessionStatus = "collecting" | "processing" | "completed" | "cancelled";

export interface WhatsAppIntakeSession {
  id: string;
  workspaceId: string;
  phone: string;
  status: WhatsAppIntakeSessionStatus;
  messages: string[];
  media: ParsedWhatsAppMessage["media"];
  listingId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  collectionAcknowledgedAt: string | null;
}

export interface WhatsAppIntakeSessionStore {
  getActiveSession(workspaceId: string, phone: string): Promise<WhatsAppIntakeSession | null>;
  startSession(workspaceId: string, phone: string): Promise<WhatsAppIntakeSession>;
  appendMessage(
    workspaceId: string,
    phone: string,
    message: Pick<ParsedWhatsAppMessage, "text" | "media">,
  ): Promise<WhatsAppIntakeSession>;
  markProcessing(workspaceId: string, phone: string): Promise<void>;
  markCompleted(workspaceId: string, phone: string, listingId: string): Promise<void>;
  markCancelled(workspaceId: string, phone: string): Promise<void>;
}

export class FirestoreWhatsAppIntakeSessionStore implements WhatsAppIntakeSessionStore {
  async getActiveSession(workspaceId: string, phone: string) {
    const snapshot = await sessionRef(workspaceId, phone).get();
    if (!snapshot.exists) return null;

    const session = toSession(snapshot.id, snapshot.data());
    if (session.status === "completed" || session.status === "cancelled") return null;
    return session;
  }

  async startSession(workspaceId: string, phone: string) {
    const now = new Date().toISOString();
    const session: WhatsAppIntakeSession = {
      id: sessionId(phone),
      workspaceId,
      phone,
      status: "collecting",
      messages: [],
      media: [],
      listingId: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      collectionAcknowledgedAt: null,
    };
    await sessionRef(workspaceId, phone).set(session);
    return session;
  }

  async appendMessage(workspaceId: string, phone: string, message: Pick<ParsedWhatsAppMessage, "text" | "media">) {
    const ref = sessionRef(workspaceId, phone);
    const text = message.text.trim();

    return getAdminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const existing = snapshot.exists ? toSession(snapshot.id, snapshot.data()) : null;
      const now = new Date().toISOString();
      const session =
        existing && existing.status !== "completed" && existing.status !== "cancelled"
          ? existing
          : {
              id: sessionId(phone),
              workspaceId,
              phone,
              status: "collecting" as const,
              messages: [],
              media: [],
              listingId: null,
              createdAt: now,
              updatedAt: now,
              completedAt: null,
              collectionAcknowledgedAt: null,
            };
      const hasContent = Boolean(text || message.media.length);
      const shouldAcknowledgeCollection =
        session.status !== "processing" && !session.collectionAcknowledgedAt && hasContent;

      const next: WhatsAppIntakeSession = {
        ...session,
        status: session.status === "processing" ? "processing" : "collecting",
        messages: text ? [...session.messages, text] : session.messages,
        media: [...session.media, ...message.media],
        updatedAt: now,
        collectionAcknowledgedAt: shouldAcknowledgeCollection ? now : session.collectionAcknowledgedAt,
      };

      transaction.set(ref, next);
      return next;
    });
  }

  async markProcessing(workspaceId: string, phone: string) {
    await sessionRef(workspaceId, phone).set(
      {
        status: "processing",
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  async markCompleted(workspaceId: string, phone: string, listingId: string) {
    const now = new Date().toISOString();
    await sessionRef(workspaceId, phone).set(
      {
        status: "completed",
        listingId,
        updatedAt: now,
        completedAt: now,
      },
      { merge: true },
    );
  }

  async markCancelled(workspaceId: string, phone: string) {
    await sessionRef(workspaceId, phone).set(
      {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }
}

export const firestoreWhatsAppIntakeSessionStore = new FirestoreWhatsAppIntakeSessionStore();

function sessionRef(workspaceId: string, phone: string) {
  return getAdminDb().collection(firestorePaths.workspaceIntakeSessions(workspaceId)).doc(sessionId(phone));
}

function sessionId(phone: string) {
  return phone.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function toSession(id: string, data: FirebaseFirestore.DocumentData | undefined): WhatsAppIntakeSession {
  const value = data ?? {};
  return {
    id,
    workspaceId: String(value.workspaceId ?? ""),
    phone: String(value.phone ?? ""),
    status: isSessionStatus(value.status) ? value.status : "collecting",
    messages: Array.isArray(value.messages) ? value.messages.map(String) : [],
    media: Array.isArray(value.media) ? value.media : [],
    listingId: typeof value.listingId === "string" ? value.listingId : null,
    createdAt: String(value.createdAt ?? new Date().toISOString()),
    updatedAt: String(value.updatedAt ?? new Date().toISOString()),
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    collectionAcknowledgedAt: typeof value.collectionAcknowledgedAt === "string" ? value.collectionAcknowledgedAt : null,
  };
}

function isSessionStatus(value: unknown): value is WhatsAppIntakeSessionStatus {
  return value === "collecting" || value === "processing" || value === "completed" || value === "cancelled";
}
