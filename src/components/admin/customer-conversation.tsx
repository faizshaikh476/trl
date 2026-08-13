"use client";

import { useActionState } from "react";
import { AlertCircle, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  retryCustomerMessageAction,
  sendCustomerFollowUpTemplateAction,
  sendCustomerReplyAction,
  type CustomerOperationsActionState,
} from "@/server-actions/customer-operations-actions";
import type { ReturnTypeOfCustomerDetailModel } from "./customer-detail-drawer";

const initialState: CustomerOperationsActionState = { ok: false, message: "" };

export function CustomerConversation({
  contactId,
  workspaceId,
  messages,
  insideReplyWindow,
  retentionLabel,
}: {
  contactId: string;
  workspaceId: string;
  messages: ReturnTypeOfCustomerDetailModel["messages"];
  insideReplyWindow: boolean;
  retentionLabel: string;
}) {
  const [replyState, replyAction, replyPending] = useActionState(
    sendCustomerReplyAction.bind(null, contactId),
    initialState,
  );
  const [templateState, templateAction, templatePending] = useActionState(
    sendCustomerFollowUpTemplateAction.bind(null, contactId),
    initialState,
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/10 bg-slate-950/40 px-5 py-3 text-xs text-slate-400">
        {retentionLabel}. Media is not retained in chat.
      </div>
      <div
        role="log"
        aria-label="Conversation history"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-5"
      >
        {messages.length ? messages.map((message) => (
          <div key={message.id} className={message.direction === "outbound" ? "ml-auto max-w-[82%]" : "mr-auto max-w-[82%]"}>
            <div className={message.direction === "outbound" ? "rounded-2xl rounded-br-sm bg-cyan-300 px-4 py-3 text-slate-950" : "rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 text-slate-100"}>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
            </div>
            <div className={message.direction === "outbound" ? "mt-1 flex items-center justify-end gap-2 text-[11px] text-slate-500" : "mt-1 flex items-center gap-2 text-[11px] text-slate-500"}>
              <span>{message.senderType === "admin" ? "You" : message.senderType}</span>
              <time dateTime={message.createdAt}>{message.createdLabel}</time>
              <span className={message.deliveryStatus === "failed" ? "text-rose-300" : ""}>{message.deliveryLabel}</span>
            </div>
            {message.deliveryStatus === "failed" ? (
              <RetryMessage contactId={contactId} workspaceId={workspaceId} messageId={message.id} failureSummary={message.failureSummary} />
            ) : null}
          </div>
        )) : <p className="py-12 text-center text-sm text-slate-500">No retained conversation text yet.</p>}
      </div>
      <div
        role="region"
        aria-label="Conversation reply"
        className="shrink-0 border-t border-white/10 p-4"
      >
        {insideReplyWindow ? (
          <form action={replyAction} className="space-y-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <textarea name="text" required maxLength={2000} rows={3} placeholder="Reply on WhatsApp…" className="w-full resize-none rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm text-white placeholder:text-slate-600" />
            <div className="flex items-center justify-between gap-3">
              <ActionMessage state={replyState} />
              <Button disabled={replyPending} type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Send className="size-4" />{replyPending ? "Sending…" : "Send reply"}</Button>
            </div>
          </form>
        ) : (
          <form action={templateAction} className="flex items-center justify-between gap-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div><p className="text-sm font-medium text-amber-100">24-hour reply window closed</p><p className="mt-1 text-xs text-slate-400">Use the approved WhatsApp follow-up template.</p><ActionMessage state={templateState} /></div>
            <Button disabled={templatePending} type="submit" className="shrink-0 bg-amber-300 text-amber-950 hover:bg-amber-200">{templatePending ? "Sending…" : "Send follow-up"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function RetryMessage({ contactId, workspaceId, messageId, failureSummary }: { contactId: string; workspaceId: string; messageId: string; failureSummary: string | null }) {
  const [state, action, pending] = useActionState(retryCustomerMessageAction.bind(null, contactId), initialState);
  return <form action={action} className="mt-2 flex items-center justify-end gap-2 text-xs"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="messageId" value={messageId} /><span className="text-rose-300"><AlertCircle className="mr-1 inline size-3" />{failureSummary || "Send failed"}</span><Button size="xs" variant="outline" disabled={pending} className="border-white/10 bg-transparent text-white"><RefreshCw className="size-3" />Retry</Button><ActionMessage state={state} /></form>;
}

function ActionMessage({ state }: { state: CustomerOperationsActionState }) {
  return state.message ? <span className={state.ok ? "text-xs text-emerald-300" : "text-xs text-rose-300"}>{state.message}</span> : null;
}
