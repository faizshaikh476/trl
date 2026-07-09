import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { getCurrentAdmin } from "@/lib/auth/current-user";

export default async function AdminUsagePage() {
  await getCurrentAdmin();

  return (
    <AdminSectionPage
      active="Usage logs"
      title="Usage logs"
      description="Monitor activity across AI, WhatsApp and public listings."
      cards={[
        {
          title: "AI usage",
          description: "Model activity and estimated cost.",
          status: "AI",
        },
        {
          title: "WhatsApp usage",
          description: "Messages received, replies sent and listings created.",
          status: "Messages",
        },
        {
          title: "Public funnel",
          description: "Views, contact clicks, shares and enquiries.",
          status: "Live",
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
