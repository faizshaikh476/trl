import type { Lead, LeadStatus } from "@/types/domain";
import type { LeadCreateInput } from "../lead.schema";

export interface LeadRepository {
  listByWorkspace(workspaceId: string): Promise<Lead[]>;
  findById(id: string): Promise<Lead | null>;
  create(input: LeadCreateInput): Promise<Lead>;
  updateStatus(id: string, status: LeadStatus): Promise<Lead>;
  addNote(id: string, note: string): Promise<Lead>;
}
