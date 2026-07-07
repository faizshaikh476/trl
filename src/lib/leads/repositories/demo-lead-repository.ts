import type { Lead, LeadStatus } from "@/types/domain";
import { demoLeads } from "@/lib/mock-data/demo-data";
import type { LeadCreateInput } from "../lead.schema";
import type { LeadRepository } from "./lead-repository";

const leads = [...demoLeads];

export class DemoLeadRepository implements LeadRepository {
  async listByWorkspace(workspaceId: string) {
    return leads.filter((lead) => lead.workspaceId === workspaceId);
  }

  async create(input: LeadCreateInput) {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: `lead_${Date.now()}`,
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
    leads.unshift(lead);
    return lead;
  }

  async findById(id: string) {
    return leads.find((item) => item.id === id) ?? null;
  }

  async updateStatus(id: string, status: LeadStatus) {
    const lead = await this.findById(id);
    if (!lead) throw new Error("Lead not found");
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    return lead;
  }

  async addNote(id: string, note: string) {
    const lead = leads.find((item) => item.id === id);
    if (!lead) throw new Error("Lead not found");
    lead.notes = [...lead.notes, note];
    lead.updatedAt = new Date().toISOString();
    return lead;
  }
}

export const demoLeadRepository = new DemoLeadRepository();
