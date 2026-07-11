import Link from "next/link";
import { Building2, ClipboardList, CreditCard, GalleryVerticalEnd, Home, Inbox, Settings } from "lucide-react";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { getPlatformBranding } from "@/lib/platform/branding";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/listings", label: "Listings", icon: Building2 },
  { href: "/catalogue", label: "Catalogue", icon: GalleryVerticalEnd },
  { href: "/dashboard/leads", label: "Leads", icon: Inbox },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export async function AppShell({
  children,
  active,
  tone = "light",
}: {
  children: React.ReactNode;
  active?: string;
  tone?: "dark" | "light";
}) {
  const branding = await getPlatformBranding();
  const isLight = tone === "light";
  return (
    <div className={cn("min-h-screen", isLight ? "bg-stone-50 text-stone-950" : "bg-zinc-950 text-zinc-50")}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden w-64 border-r px-4 py-5 lg:block",
          isLight ? "border-stone-200 bg-white text-stone-950" : "border-white/10 bg-zinc-950/95",
        )}
      >
        <div className="flex h-full flex-col">
          <Link href="/" className="flex items-center gap-3 px-2">
            <BrandMark logoUrl={branding.logoUrl} shortName={branding.shortName} />
            <div>
              <p className="text-sm font-semibold">{branding.brandName}</p>
              <p className={cn("text-xs", isLight ? "text-stone-500" : "text-zinc-400")}>Broker workspace</p>
            </div>
          </Link>
          <nav className="mt-8 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const selected = active === item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                    isLight
                      ? "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white",
                    selected &&
                      (isLight
                        ? "bg-stone-950 text-white hover:bg-stone-950 hover:text-white"
                        : "bg-white text-zinc-950 hover:bg-white hover:text-zinc-950"),
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className={cn("mt-auto space-y-3 border-t pt-4", isLight ? "border-stone-200" : "border-white/10")}>
            <p className={cn("px-2 text-xs", isLight ? "text-stone-500" : "text-zinc-500")}>
              Signed in to broker workspace
            </p>
            <SignOutForm />
          </div>
        </div>
      </aside>
      <header
        className={cn(
          "sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur lg:hidden",
          isLight ? "border-stone-200 bg-white/90" : "border-white/10 bg-zinc-950/95",
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <BrandMark logoUrl={branding.logoUrl} shortName={branding.shortName} compact />
          {branding.brandName}
        </Link>
        <SignOutForm compact />
      </header>
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
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
  const size = compact ? "size-8" : "size-9";
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={cn(size, "rounded-md border border-black/5 bg-white object-contain p-1")}
      />
    );
  }

  return (
    <span className={cn(size, "flex items-center justify-center rounded-md bg-emerald-500 text-white")}>
      {shortName ? shortName.slice(0, 2).toUpperCase() : <ClipboardList className="size-4" />}
    </span>
  );
}
