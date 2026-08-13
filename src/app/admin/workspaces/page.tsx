import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { CustomerDirectory } from "@/components/admin/customer-directory";
import { CustomerDetailDrawer } from "@/components/admin/customer-detail-drawer";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService, formatPlanPrice } from "@/lib/billing/billing-service";
import { customerOperationsService } from "@/lib/customer-operations/customer-operations-service";
import { parseDirectoryQuery, toCustomerDetailModel } from "@/lib/customer-operations/customer-directory-model";
import type { CustomerActivityCounts, CustomerDirectoryPage } from "@/lib/customer-operations/customer-operations.types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: SearchParams }) {
  await getCurrentAdmin();
  const rawSearchParams = await searchParams;
  const query = parseDirectoryQuery(rawSearchParams);
  const contactId = first(rawSearchParams.contact);
  const initialTab = first(rawSearchParams.view) === "conversation" ? "conversation" : "overview";
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
  const [selectedDetail, plans] = await Promise.all([
    contactId?.startsWith("contact_")
      ? customerOperationsService.getCustomerDetail(contactId)
      : Promise.resolve(null),
    billingService.listPlans(),
  ]);
  const planNamesById = Object.fromEntries(plans.map((plan) => [plan.id, plan.name]));
  const activePlans = plans.filter((plan) => plan.status === "active");

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
      <CustomerDirectory query={query} page={page} counts={counts} planNamesById={planNamesById} error={error} />
      {selectedDetail ? (
        <CustomerDetailDrawer
          detail={toCustomerDetailModel(selectedDetail, planNamesById)}
          closeHref={closeHref(rawSearchParams)}
          initialTab={initialTab}
          plans={activePlans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            listingCredits: plan.listingCredits,
            priceLabel: formatPlanPrice(plan),
          }))}
        />
      ) : null}
    </AdminSectionPage>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function closeHref(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "contact" || key === "view" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  const query = params.toString();
  return query ? `/admin/workspaces?${query}` : "/admin/workspaces";
}
