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
      title="WhatsApp"
      description="Monitor the connection, incoming messages and broker routing."
      cards={[
        {
          title: "Connection",
          description: "Check the active WhatsApp Business connection.",
          status: "Live",
        },
        {
          title: "Incoming messages",
          description: "Receive property details, images and commands.",
          status: "Connected",
        },
        {
          title: "Broker routing",
          description: "Keep each phone number in its own broker account.",
          status: "Automatic",
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
