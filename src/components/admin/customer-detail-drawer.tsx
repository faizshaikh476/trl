"use client";

import { useActionState, useId } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleDollarSign, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { toCustomerDetailModel } from "@/lib/customer-operations/customer-directory-model";
import { grantPromotionalCreditsAction } from "@/server-actions/credit-actions";
import { assignWorkspacePlanAction } from "@/server-actions/billing-actions";
import { deleteCustomerConversationAction, updateCustomerManagementAction, type CustomerOperationsActionState } from "@/server-actions/customer-operations-actions";
import { CustomerConversation } from "./customer-conversation";

export type ReturnTypeOfCustomerDetailModel = ReturnType<typeof toCustomerDetailModel>;
type PlanOption = { id: string; name: string; listingCredits: number; priceLabel: string };
const initialState: CustomerOperationsActionState = { ok: false, message: "" };

export function CustomerDetailDrawer({ detail, closeHref, plans }: { detail: ReturnTypeOfCustomerDetailModel; closeHref: string; plans: PlanOption[] }) {
  const router = useRouter();
  const activity = detail.activity;
  return (
    <Sheet open onOpenChange={(open) => { if (!open) router.push(closeHref); }}>
      <SheetContent side="right" className="w-[min(94vw,52rem)] border-cyan-300/10 bg-slate-950 text-white sm:max-w-none" showCloseButton>
        <SheetHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 pr-10"><SheetTitle className="text-xl text-white">{activity.displayName}</SheetTitle><Badge className="bg-cyan-300 text-slate-950">{activity.classification}</Badge><Badge variant="secondary">{activity.stage.replaceAll('_',' ')}</Badge></div>
          <SheetDescription className="text-slate-400">+{activity.phone} · {activity.city || 'City not set'} · {activity.workspaceId}</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="overview" className="min-h-0 flex-1 gap-0">
          <TabsList variant="line" className="mx-5 mt-2 h-10 w-auto justify-start overflow-x-auto border-b border-white/10 text-slate-400">
            <TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="conversation">Conversation</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="overflow-y-auto p-5"><Overview detail={detail} /></TabsContent>
          <TabsContent value="conversation" className="min-h-0 overflow-hidden"><CustomerConversation contactId={activity.id} workspaceId={activity.workspaceId} messages={detail.messages} insideReplyWindow={detail.insideReplyWindow} retentionLabel={detail.retentionLabel} /></TabsContent>
          <TabsContent value="activity" className="overflow-y-auto p-5"><ActivityTimeline events={detail.events} /></TabsContent>
          <TabsContent value="manage" className="overflow-y-auto p-5"><Manage detail={detail} plans={plans} /></TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Overview({ detail }: { detail: ReturnTypeOfCustomerDetailModel }) {
  const a = detail.activity;
  const facts = [['Plan', a.planId],['Payment',a.paymentState],['Credits',`${a.effectiveCredits} (${a.walletState.replaceAll('_',' ')})`],['Listings',`${a.listingCounts.published} live · ${a.listingCounts.ready} ready · ${a.listingCounts.total} total`],['Email',a.email || 'Not set'],['History',detail.retentionLabel]];
  return <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">{facts.map(([label,value]) => <div key={label} className="bg-slate-950 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-sm text-slate-100">{value}</p></div>)}</div>;
}

function ActivityTimeline({ events }: { events: ReturnTypeOfCustomerDetailModel['events'] }) {
  return events.length ? <ol className="space-y-0">{events.slice().reverse().map((event) => <li key={event.id} className="relative border-l border-cyan-300/20 pb-6 pl-5 last:pb-0"><span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-slate-950 bg-cyan-300" /><p className="text-sm text-slate-100">{event.label}</p><time dateTime={event.occurredAt} className="mt-1 block text-xs text-slate-500">{event.occurredLabel}</time>{event.listingId ? <p className="mt-1 text-xs text-slate-600">Listing {event.listingId}</p> : null}</li>)}</ol> : <p className="py-12 text-center text-sm text-slate-500">No lifecycle events recorded yet.</p>;
}

function Manage({ detail, plans }: { detail: ReturnTypeOfCustomerDetailModel; plans: PlanOption[] }) {
  const activity = detail.activity;
  const [managementState, managementAction, managementPending] = useActionState(updateCustomerManagementAction.bind(null, activity.id), initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCustomerConversationAction.bind(null, activity.id), initialState);
  const stableId = useId().replace(/[^a-zA-Z0-9_-]/g, 'x');
  return <div className="space-y-6">
    <form action={managementAction} className="space-y-3 rounded-lg border border-white/10 p-4"><input type="hidden" name="workspaceId" value={activity.workspaceId} /><h3 className="font-medium">Follow-up and notes</h3><label className="grid gap-1 text-sm text-slate-300">Private note<textarea name="privateNote" defaultValue={activity.privateNote} maxLength={2000} rows={4} className="rounded-md border border-white/10 bg-slate-950 p-3 text-white" /></label><label className="grid gap-1 text-sm text-slate-300">Tags<input name="tags" defaultValue={activity.tags.join(', ')} placeholder="hot, pune, payment" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-white" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm text-slate-300">Follow-up at<input name="followUpAt" type="datetime-local" defaultValue={toLocalInput(activity.followUpAt)} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-white" /></label><label className="grid gap-1 text-sm text-slate-300">Resolution<select name="resolution" defaultValue={activity.resolution} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-white"><option value="open">Open</option><option value="resolved">Resolved</option></select></label></div><div className="flex items-center justify-between"><State state={managementState} /><Button disabled={managementPending} className="bg-cyan-300 text-slate-950"><Save className="size-4" />Save management</Button></div></form>
    <div className="grid gap-4 sm:grid-cols-2"><form action={assignWorkspacePlanAction.bind(null, activity.workspaceId)} className="space-y-3 rounded-lg border border-white/10 p-4"><h3 className="flex items-center gap-2 font-medium"><CircleDollarSign className="size-4 text-cyan-300" />Plan assignment</h3><select name="planId" defaultValue={activity.planId} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white">{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {plan.listingCredits} credits · {plan.priceLabel}</option>)}</select><Button className="w-full bg-cyan-300 text-slate-950">Update plan</Button></form><form action={grantPromotionalCreditsAction.bind(null, activity.workspaceId)} className="space-y-3 rounded-lg border border-white/10 p-4"><input type="hidden" name="idempotencyKey" value={`grant-${stableId}`} /><h3 className="flex items-center gap-2 font-medium"><CalendarClock className="size-4 text-cyan-300" />Grant credits</h3><input name="quantity" type="number" min="1" required placeholder="Quantity" className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white" /><input name="reason" required placeholder="Reason" className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white" /><label className="flex gap-2 text-xs text-slate-400"><input type="checkbox" name="confirmation" value="confirm" required />Confirm promotional grant</label><Button className="w-full bg-cyan-300 text-slate-950">Grant credits</Button></form></div>
    <form action={deleteAction} className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-4"><input type="hidden" name="workspaceId" value={activity.workspaceId} /><h3 className="flex items-center gap-2 font-medium text-rose-200"><Trash2 className="size-4" />Delete retained conversation</h3><p className="mt-1 text-xs text-slate-400">This removes chat text only. Lifecycle events and customer management remain.</p><div className="mt-3 flex gap-2"><input name="confirmation" placeholder='Type "delete"' className="h-10 min-w-0 flex-1 rounded-md border border-rose-300/20 bg-slate-950 px-3 text-white" /><Button disabled={deletePending} variant="destructive">Delete chat</Button></div><State state={deleteState} /></form>
  </div>;
}

function State({ state }: { state: CustomerOperationsActionState }) { return state.message ? <p className={state.ok ? "text-xs text-emerald-300" : "text-xs text-rose-300"}>{state.message}</p> : null; }
function toLocalInput(value: string | null) { if (!value || !Number.isFinite(Date.parse(value))) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); }
