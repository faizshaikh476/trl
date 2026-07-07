import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { WhatsAppReadinessPanel } from "@/components/admin/whatsapp-readiness-panel";
import { WhatsAppIntakeTester } from "@/components/admin/whatsapp-intake-tester";
import { listAIProviders } from "@/lib/ai/ai-router";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { workspaceService } from "@/lib/workspaces/workspace-service";

const providers = [
  { provider: "Admin intake", status: "enabled", webhook: "/api/admin/whatsapp/intake-test" },
  { provider: "Meta Cloud API", status: "ready after env", webhook: "/api/whatsapp/webhook" },
];

export default async function AdminWhatsAppPage() {
  await getCurrentAdmin();
  const workspace = (await workspaceService.list())[0] ?? null;
  const provider = listAIProviders().find((item) => item.enabled && !item.localOnly) ??
    listAIProviders().find((item) => item.id === "mock");
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://therealestatelink.vercel.app"
  ).replace(/\/+$/, "");
  const callbackUrl = `${appUrl.startsWith("http") ? appUrl : `https://${appUrl}`}/api/whatsapp/webhook`;

  return (
    <AdminSectionPage
      active="WhatsApp"
      title="WhatsApp providers"
      description="Manage WhatsApp provider routing, webhook verification, message usage, and workspace phone mappings."
      cards={[
        {
          title: "Provider abstraction",
          description: "Admin intake and Meta Cloud API share one service contract.",
          status: "ready",
        },
        {
          title: "Webhook endpoint",
          description: "Meta verification and incoming message POSTs are live at the production callback URL.",
          status: "ready",
        },
        {
          title: "Workspace mapping",
          description: "Incoming WhatsApp senders auto-resolve to their own broker workspace.",
          status: "ready",
        },
      ]}
      tableTitle="Provider endpoints"
      tableRows={providers}
    >
      <WhatsAppReadinessPanel
        callbackUrl={callbackUrl}
        provider={process.env.WHATSAPP_PROVIDER ?? "mock"}
        verifyTokenSet={Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)}
        phoneNumberIdSet={Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID)}
        businessAccountIdSet={Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID)}
        accessTokenSet={Boolean(process.env.WHATSAPP_ACCESS_TOKEN)}
      />
      <WhatsAppIntakeTester
        workspaceId={workspace?.id ?? null}
        workspaceName={workspace?.name ?? "No workspace"}
        providerLabel={provider?.label ?? "Local AI parser"}
      />
    </AdminSectionPage>
  );
}
