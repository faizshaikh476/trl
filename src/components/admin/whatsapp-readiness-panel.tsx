import { CheckCircle2, CircleAlert, Copy } from "lucide-react";

type ReadinessItem = {
  label: string;
  ready: boolean;
  help: string;
};

export function WhatsAppReadinessPanel({
  callbackUrl,
  verifyTokenSet,
  phoneNumberIdSet,
  businessAccountIdSet,
  accessTokenSet,
  provider,
}: {
  callbackUrl: string;
  verifyTokenSet: boolean;
  phoneNumberIdSet: boolean;
  businessAccountIdSet: boolean;
  accessTokenSet: boolean;
  provider: string;
}) {
  const items: ReadinessItem[] = [
    {
      label: "Provider set to Meta",
      ready: provider === "meta",
      help: "Set WHATSAPP_PROVIDER=meta.",
    },
    {
      label: "Phone number ID",
      ready: phoneNumberIdSet,
      help: "Set WHATSAPP_PHONE_NUMBER_ID from Meta API Setup.",
    },
    {
      label: "Business account ID",
      ready: businessAccountIdSet,
      help: "Set WHATSAPP_BUSINESS_ACCOUNT_ID from Meta API Setup.",
    },
    {
      label: "Access token",
      ready: accessTokenSet,
      help: "Use a fresh token. Do not reuse a token pasted into chat.",
    },
    {
      label: "Webhook verify token",
      ready: verifyTokenSet,
      help: "Set WHATSAPP_WEBHOOK_VERIFY_TOKEN and paste the same value into Meta.",
    },
    {
      label: "Per-number workspace routing",
      ready: true,
      help: "Each WhatsApp sender gets or reuses a broker workspace based on their phone number.",
    },
  ];
  const readyCount = items.filter((item) => item.ready).length;

  return (
    <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-cyan-200">Meta Cloud API setup</p>
          <h2 className="mt-2 text-2xl font-semibold">WhatsApp readiness</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Configure these before using the Meta test number as the live chatbot. Secrets are only
            checked as present or missing.
          </p>
        </div>
        <div className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
          {readyCount}/{items.length} ready
        </div>
      </div>

      <div className="mt-5 rounded-md border border-white/10 bg-slate-950 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Callback URL
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="break-all text-sm text-cyan-100">{callbackUrl}</code>
          <Copy className="size-4 text-slate-500" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-white/10 bg-slate-950 p-4">
            <div className="flex items-start gap-3">
              {item.ready ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
              ) : (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" />
              )}
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.help}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
