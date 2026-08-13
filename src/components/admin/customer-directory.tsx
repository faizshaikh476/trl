import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toDirectoryRow } from "@/lib/customer-operations/customer-directory-model";
import type {
  CustomerActivityCounts,
  CustomerDirectoryPage,
  CustomerDirectoryQuery,
} from "@/lib/customer-operations/customer-operations.types";

export function CustomerDirectory({
  query,
  page,
  counts,
  error = null,
}: {
  query: CustomerDirectoryQuery;
  page: CustomerDirectoryPage;
  counts: CustomerActivityCounts;
  error?: string | null;
}) {
  const rows = page.items.map(toDirectoryRow);
  const filtered = Boolean(
    query.searchToken || Object.keys(query.filters).length || query.tab !== "customers",
  );

  return (
    <section className="overflow-hidden rounded-xl border border-cyan-300/10 bg-white/[0.045] text-white">
      <div className="border-b border-cyan-300/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Customer directory</h2>
            <p className="mt-1 text-sm text-slate-400">
              Newest activity first. Open a row to inspect the complete customer journey.
            </p>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-slate-950/50 p-1">
            {([
              ["customers", "Customers", counts.customers],
              ["prospects", "Prospects", counts.prospects],
              ["all", "All", counts.all],
            ] as const).map(([tab, label, count]) => (
              <Link
                key={tab}
                href={directoryHref(query, { tab, cursor: null })}
                className={
                  query.tab === tab
                    ? "rounded-md bg-cyan-300 px-3 py-2 text-sm font-medium text-slate-950"
                    : "rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                }
              >
                {label} <span className="ml-1 opacity-70">{count}</span>
              </Link>
            ))}
          </div>
        </div>

        <form action="/admin/workspaces" className="mt-4 grid gap-3 lg:grid-cols-[minmax(15rem,1.5fr)_repeat(4,minmax(9rem,1fr))_auto]">
          <input type="hidden" name="tab" value={query.tab} />
          <label className="relative">
            <span className="sr-only">Search customers</span>
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500" />
            <input
              name="q"
              defaultValue={query.searchToken ?? ""}
              placeholder="Search name, phone, email"
              className="h-10 w-full rounded-md border border-white/10 bg-slate-950/70 pl-9 pr-3 text-sm text-white placeholder:text-slate-600"
            />
          </label>
          <FilterSelect name="stage" label="Journey stage" value={query.filters.stage} options={stageOptions} />
          <FilterSelect name="payment" label="Payment" value={query.filters.paymentState} options={paymentOptions} />
          <FilterSelect name="wallet" label="Credits" value={query.filters.walletState} options={walletOptions} />
          <FilterSelect name="sort" label="Sort" value={query.sort} options={sortOptions} />
          <Button type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Apply</Button>
        </form>
      </div>

      {error ? (
        <div className="flex items-start gap-3 p-6 text-amber-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-300" />
          <div><p className="font-medium">Customer data could not load</p><p className="mt-1 text-sm text-slate-400">{error}</p></div>
        </div>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-white/[0.035] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Customer','Journey','Plan & payment','Credits','Listings','Latest activity','Follow-up'].map((heading) => (
                  <th key={heading} className="px-5 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-cyan-300/10 transition-colors hover:bg-cyan-300/[0.045]">
                  <td className="p-0">
                    <Link href={directoryHref(query, { contact: row.id })} className="block px-5 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300">
                      <p className="font-medium text-slate-100">{row.name}</p>
                      <p className="mt-1 text-xs text-slate-400">+{row.phone} · {row.city}</p>
                      <p className="mt-1 text-[11px] text-slate-600">#{index + 1}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-4"><Badge className={journeyTone(row.stageLabel)}>{row.stageLabel}</Badge><p className="mt-2 text-xs text-slate-500">{row.classificationLabel}</p></td>
                  <td className="px-5 py-4"><p className="text-slate-200">{row.planLabel}</p><p className="mt-1 text-xs text-slate-400">{row.paymentLabel}</p></td>
                  <td className="px-5 py-4 text-slate-200">{row.creditsLabel}</td>
                  <td className="px-5 py-4 text-slate-300">{row.listingsLabel}</td>
                  <td className="px-5 py-4"><p className="max-w-52 truncate text-slate-200">{row.latestActivityLabel}</p><time title={exactDate(row.lastActivityAt)} dateTime={row.lastActivityAt} className="mt-1 block text-xs text-slate-500">{relativeDate(row.lastActivityAt)}</time></td>
                  <td className="px-5 py-4"><span className={row.followUpAt ? "text-cyan-200" : "text-slate-500"}>{row.followUpLabel}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <UsersRound className="size-8 text-slate-600" />
          <p className="mt-4 font-medium text-slate-200">{filtered ? "No matching customers" : "No customer activity yet"}</p>
          <p className="mt-1 max-w-md text-sm text-slate-500">{filtered ? "Clear or change the filters to widen this view." : "New WhatsApp conversations and backfilled workspaces will appear here."}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-cyan-300/10 px-5 py-4">
        <p className="text-sm text-slate-500">Showing up to {query.pageSize} records</p>
        <div className="flex gap-2">
          {query.cursor ? <Button asChild variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5"><Link href={directoryHref(query, { cursor: page.previousCursor })}><ArrowLeft className="size-4" />Previous</Link></Button> : null}
          {page.nextCursor ? <Button asChild variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5"><Link href={directoryHref(query, { cursor: page.nextCursor })}>Next<ArrowRight className="size-4" /></Link></Button> : null}
        </div>
      </div>
    </section>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: ReadonlyArray<readonly [string, string]> }) {
  return <label><span className="sr-only">{label}</span><select name={name} defaultValue={value ?? ""} className="h-10 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm text-white"><option value="">All {label.toLowerCase()}</option>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>;
}

function directoryHref(query: CustomerDirectoryQuery, overrides: { tab?: CustomerDirectoryQuery['tab']; cursor?: string | null; contact?: string }) {
  const params = new URLSearchParams();
  params.set('tab', overrides.tab ?? query.tab);
  if (query.searchToken) params.set('q', query.searchToken);
  if (query.filters.stage) params.set('stage', query.filters.stage);
  if (query.filters.paymentState) params.set('payment', query.filters.paymentState);
  if (query.filters.walletState) params.set('wallet', query.filters.walletState);
  if (query.filters.followUpState) params.set('followUp', query.filters.followUpState);
  if (query.filters.planId) params.set('plan', query.filters.planId);
  if (query.sort !== 'last_activity_desc') params.set('sort', query.sort);
  if (query.pageSize !== 25) params.set('pageSize', String(query.pageSize));
  const cursor = overrides.cursor === undefined ? query.cursor : overrides.cursor;
  if (cursor) params.set('cursor', cursor);
  if (overrides.contact) params.set('contact', overrides.contact);
  return `/admin/workspaces?${params}`;
}

function journeyTone(stage: string) {
  if (stage === 'Needs Attention' || stage === 'Payment Failed') return 'bg-rose-300 text-rose-950';
  if (stage === 'Customer') return 'bg-emerald-300 text-emerald-950';
  if (stage === 'Ready To Publish') return 'bg-amber-300 text-amber-950';
  return 'bg-cyan-300 text-slate-950';
}

function relativeDate(value: string) {
  const timestamp = Date.parse(value); if (!Number.isFinite(timestamp)) return 'Unknown';
  const minutes = Math.round((timestamp - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60); if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

function exactDate(value: string) { const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(timestamp)) : 'Unknown'; }

const stageOptions = [['new_chat','New chat'],['listing_started','Listing started'],['ready_to_publish','Ready to publish'],['payment_pending','Payment pending'],['payment_failed','Payment failed'],['customer','Customer'],['needs_attention','Needs attention']] as const;
const paymentOptions = [['none','No payment'],['pending','Pending'],['paid','Paid'],['failed','Failed'],['refunded','Refunded']] as const;
const walletOptions = [['never_funded','Never funded'],['expired','Expired'],['empty','Used up'],['active','Active']] as const;
const sortOptions = [['last_activity_desc','Newest activity'],['first_seen_desc','Newest contact'],['latest_purchase_desc','Latest purchase'],['follow_up_asc','Follow-up due']] as const;
