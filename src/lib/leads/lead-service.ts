import type { LeadStatus } from "@/types/domain";
import { publicLeadSchema, type LeadCreateInput } from "./lead.schema";
import { firestoreLeadRepository } from "./repositories/firestore-lead-repository";
import type { LeadRepository } from "./repositories/lead-repository";

export class LeadService {
  constructor(private readonly repository: LeadRepository = firestoreLeadRepository) {}

  listByWorkspace(workspaceId: string) {
    return this.repository.listByWorkspace(workspaceId);
  }

  create(input: LeadCreateInput) {
    const parsed = publicLeadSchema.parse(input);
    return this.repository.create({ ...parsed, workspaceId: input.workspaceId });
  }

  findById(id: string) {
    return this.repository.findById(id);
  }

  updateStatus(id: string, status: LeadStatus) {
    return this.repository.updateStatus(id, status);
  }

  addNote(id: string, note: string) {
    if (note.trim().length < 2) throw new Error("Note is too short");
    return this.repository.addNote(id, note.trim());
  }
}

export const leadService = new LeadService();
