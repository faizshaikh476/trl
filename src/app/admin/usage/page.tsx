import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { getCurrentAdmin } from "@/lib/auth/current-user";

export default async function AdminUsagePage() {
  await getCurrentAdmin();

  return (
    <AdminSectionPage
      active="Usage logs"
      title="Usage logs"
      description="Track AI generations, WhatsApp messages, listing views, clicks, enquiries, and conversion signals."
      cards={[
        {
          title: "AI usage",
          description: "Provider, model, task type, token estimate, cost estimate, and generation status.",
          status: "next",
        },
        {
          title: "WhatsApp usage",
          description: "Inbound/outbound message counts, media downloads, intake starts, and intake completions.",
          status: "next",
        },
        {
          title: "Public funnel",
          description: "Listing views, WhatsApp clicks, call clicks, enquiries, and share events.",
          status: "tracking",
        },
      ]}
      tableTitle="Recent usage"
      tableRows={[
        { event: "listing_view", workspace: "The Rare Address", source: "public listing", status: "tracked" },
        { event: "enquiry_submit", workspace: "The Rare Address", source: "lead form", status: "tracked" },
      ]}
    />
  );
}
