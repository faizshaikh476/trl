import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { CustomerDirectory } from "@/components/admin/customer-directory";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { customerOperationsService } from "@/lib/customer-operations/customer-operations-service";
import { parseDirectoryQuery } from "@/lib/customer-operations/customer-directory-model";
import type { CustomerActivityCounts, CustomerDirectoryPage } from "@/lib/customer-operations/customer-operations.types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: SearchParams }) {
  await getCurrentAdmin();
  const query = parseDirectoryQuery(await searchParams);
  let page: CustomerDirectoryPage = { items: [], nextCursor: null, previousCursor: null };
  let counts: CustomerActivityCounts = { all: 0, customers: 0, prospects: 0, needsAttention: 0 };
  let error: string | null = null;
  try {
    [page, counts] = await Promise.all([
      customerOperationsService.queryActivities(query),
      customerOperationsService.countActivities(),
    ]);
  } catch (cause) {
    console.error("Unable to load customer operations directory", cause);
    error = "Retry the page. If this continues, verify that the customer activity indexes are deployed.";
  }

  return (
    <AdminSectionPage
      active="Workspaces"
      title="Customer operations"
      description="Track customers, prospects, payments, listings, credits and follow-ups in activity order."
      cards={[
        { title: "Customers", description: "Paid or authenticated broker accounts.", status: String(counts.customers) },
        { title: "Prospects", description: "Contacts who have not purchased or claimed an account yet.", status: String(counts.prospects) },
        { title: "Needs attention", description: "Failed payments and customer journeys requiring follow-up.", status: String(counts.needsAttention) },
      ]}
    >
      <CustomerDirectory query={query} page={page} counts={counts} error={error} />
    </AdminSectionPage>
  );
}
