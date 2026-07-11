import Link from "next/link";
import {
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  IndianRupee,
  FileWarning,
  Gauge,
  MessageCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { getPlatformBranding } from "@/lib/platform/branding";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: FileWarning },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/orders", label: "Orders", icon: IndianRupee },
  { href: "/admin/ai", label: "AI settings", icon: Bot },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/usage", label: "Usage logs", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit logs", icon: ScrollText },
  { href: "/admin/settings", label: "Platform settings", icon: Settings },
];

export async function AdminShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const branding = await getPlatformBranding();
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-cyan-300/10 bg-slate-950 px-4 py-5 lg:block">
        <div className="flex h-full flex-col">
          <Link href="/admin" className="flex items-center gap-3 px-2">
            <BrandMark logoUrl={branding.logoUrl} shortName={branding.shortName} />
            <div>
              <p className="text-sm font-semibold">{branding.brandName}</p>
              <p className="text-xs text-cyan-200/70">Super Admin console</p>
            </div>
          </Link>
          <nav className="mt-8 space-y-1">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const selected = active === item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-cyan-300/10 hover:text-white",
                    selected && "bg-cyan-300 text-slate-950 hover:bg-cyan-300 hover:text-slate-950",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="rounded-lg border border-cyan-300/10 bg-cyan-300/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="size-4 text-cyan-200" />
                Broker workspaces
              </div>
              <p className="mt-2 text-sm leading-5 text-cyan-100/70">
                Open a broker dashboard through audited workspace impersonation once enabled.
              </p>
            </div>
            <SignOutForm />
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-cyan-300/10 bg-slate-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
          <BrandMark logoUrl={branding.logoUrl} shortName={branding.shortName} compact />
          Super Admin
        </Link>
        <SignOutForm compact />
      </header>
      <main className="min-w-0 lg:pl-72">
        <div className="mx-auto min-w-0 w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

function BrandMark({
  logoUrl,
  shortName,
  compact = false,
}: {
  logoUrl: string;
  shortName: string;
  compact?: boolean;
}) {
  const size = compact ? "size-8" : "size-10";
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={cn(size, "rounded-md bg-white object-contain p-1")}
      />
    );
  }

  return (
    <span className={cn(size, "flex items-center justify-center rounded-md bg-cyan-300 text-slate-950")}>
      {shortName ? shortName.slice(0, 2).toUpperCase() : <ShieldCheck className="size-4" />}
    </span>
  );
}
