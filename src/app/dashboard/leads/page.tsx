import { AppShell } from "@/components/dashboard/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatRupees } from "@/lib/format";
import { leadService } from "@/lib/leads/lead-service";
import { listingService } from "@/lib/listings/listing-service";
import { addLeadNoteAction, updateLeadStatusAction } from "@/server-actions/lead-actions";
import type { LeadStatus } from "@/types/domain";

const quickStatuses: LeadStatus[] = ["contacted", "visit_scheduled", "closed", "lost"];

export default async function LeadsPage() {
  const user = await getCurrentUser();
  const leads = await leadService.listByWorkspace(user.workspaceId!);
  const leadRows = await Promise.all(
    leads.map(async (lead) => ({
      lead,
      listing: await listingService.findAnyById(lead.listingId),
    })),
  );

  return (
    <AppShell active="Leads">
      <div className="space-y-6 pb-10">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm shadow-stone-200/70 ring-1 ring-stone-200 sm:p-8">
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Leads</h1>
          <p className="mt-3 max-w-2xl text-stone-500">Buyer enquiries, visit requests, notes, and follow-up status.</p>
        </div>
        <div className="grid gap-4">
          {leadRows.map(({ lead, listing }) => {
            return (
              <section key={lead.id} className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/60">
                <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-stone-950">{lead.name}</h2>
                      <Badge>{lead.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-2 text-stone-600">{lead.message}</p>
                    <p className="mt-2 text-sm text-stone-400">{listing?.title}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600 md:text-right">
                    <p>{lead.phone}</p>
                    <p>{lead.budget ? formatRupees(lead.budget) : "Budget not shared"}</p>
                    <p>{lead.preferredVisitDate ?? "Visit date open"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex flex-wrap gap-2">
                      {quickStatuses.map((status) => (
                        <form key={status} action={updateLeadStatusAction.bind(null, lead.id, status)}>
                          <Button type="submit" size="sm" variant="secondary" className="bg-stone-100 text-stone-950 hover:bg-stone-200">
                            {status.replaceAll("_", " ")}
                          </Button>
                        </form>
                      ))}
                    </div>
                    <form action={addLeadNoteAction.bind(null, lead.id)} className="mt-4 flex gap-2">
                      <Input
                        name="note"
                        placeholder="Add follow-up note"
                        className="h-11 border-stone-200 bg-stone-50 text-stone-950 focus-visible:border-stone-950 focus-visible:ring-stone-950/10"
                      />
                      <Button type="submit" variant="outline" className="border-stone-200 bg-white text-stone-950 hover:bg-stone-100">Add note</Button>
                    </form>
                    {lead.notes.length ? (
                      <div className="mt-3 space-y-1 text-sm text-stone-500">
                        {lead.notes.map((note) => (
                          <p key={note}>Note: {note}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
