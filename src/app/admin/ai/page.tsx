import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { listAIProviders } from "@/lib/ai/ai-router";
import { getCurrentAdmin } from "@/lib/auth/current-user";

export default async function AdminAIPage() {
  await getCurrentAdmin();

  return (
    <AdminSectionPage
      active="AI settings"
      title="AI settings"
      description="Manage the AI models used to create and improve listings."
      cards={[
        {
          title: "Connections",
          description: "See which AI services are available.",
          status: "Status",
        },
        {
          title: "Listing creation",
          description: "Property details are turned into structured, shareable listings.",
          status: "AI",
        },
        {
          title: "Usage",
          description: "Review model activity and estimated cost.",
          status: "Monitor",
        },
      ]}
      tableTitle="Providers"
      tableRows={listAIProviders().map((provider) => ({
        provider: provider.label,
        status: provider.enabled ? "Connected" : "Not connected",
        access: provider.localOnly ? "Internal" : "Live",
      }))}
    />
  );
}
