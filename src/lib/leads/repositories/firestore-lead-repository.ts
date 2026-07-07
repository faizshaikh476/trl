import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { Lead, LeadStatus } from "@/types/domain";
import type { LeadCreateInput } from "../lead.schema";
import type { LeadRepository } from "./lead-repository";

export class FirestoreLeadRepository implements LeadRepository {
  async listByWorkspace(workspaceId: string) {
    const snapshot = await getAdminDb().collection(firestorePaths.workspaceLeads(workspaceId)).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Lead);
  }

  async create(input: LeadCreateInput) {
    const now = new Date().toISOString();
    const leadRef = getAdminDb().collection(firestorePaths.workspaceLeads(input.workspaceId)).doc();
    const lead: Lead = {
      id: leadRef.id,
      ...input,
      email: input.email || undefined,
      consentedAt: now,
      assignedTo: null,
      status: "new",
      notes: [],
      followUpAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await leadRef.set(lead);
    return lead;
  }

  async findById(id: string) {
    const snapshot = await getAdminDb().collectionGroup("leads").where("id", "==", id).limit(1).get();
    const doc = snapshot.docs[0];
    return doc ? ({ id: doc.id, ...doc.data() } as Lead) : null;
  }

  async updateStatus(id: string, status: LeadStatus) {
    const lead = await this.findById(id);
    if (!lead) throw new Error("Lead not found");
    const patch: Partial<Lead> = { status, updatedAt: new Date().toISOString() };
    await getAdminDb().doc(firestorePaths.workspaceLead(lead.workspaceId, lead.id)).update(patch);
    return { ...lead, ...patch };
  }

  async addNote(id: string, note: string) {
    const lead = await this.findById(id);
    if (!lead) throw new Error("Lead not found");
    const patch: Partial<Lead> = {
      notes: [...lead.notes, note],
      updatedAt: new Date().toISOString(),
    };
    await getAdminDb().doc(firestorePaths.workspaceLead(lead.workspaceId, lead.id)).update(patch);
    return { ...lead, ...patch };
  }

}

export const firestoreLeadRepository = new FirestoreLeadRepository();
