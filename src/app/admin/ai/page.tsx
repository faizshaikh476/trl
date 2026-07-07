import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { listAIProviders } from "@/lib/ai/ai-router";
import { getCurrentAdmin } from "@/lib/auth/current-user";

export default async function AdminAIPage() {
  await getCurrentAdmin();

  return (
    <AdminSectionPage
      active="AI settings"
      title="AI settings"
      description="Configure platform AI defaults, fallback providers, model routing, task policy, and cost controls."
      cards={[
        {
          title: "Provider routing",
          description: "OpenAI, Gemini, and Anthropic provider routing can be enabled as credentials are added.",
          status: "ready",
        },
        {
          title: "Task model policy",
          description: "Extraction, copy, risk detection, marketing assets, and image classification should have independent models.",
          status: "next",
        },
        {
          title: "Cost and audit logs",
          description: "Every generation should persist provider, model, estimate, status, and error state.",
          status: "next",
        },
      ]}
      tableTitle="Providers"
      tableRows={listAIProviders().map((provider) => ({
        provider: provider.label,
        enabled: provider.enabled ? "yes" : "needs key",
        local_only: provider.localOnly ? "yes" : "no",
      }))}
    />
  );
}
