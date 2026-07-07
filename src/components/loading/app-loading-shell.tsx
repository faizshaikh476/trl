import { ClipboardList, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function SkeletonLine({ className, isLight = false }: { className?: string; isLight?: boolean }) {
  return <div className={cn("h-3 rounded-full", isLight ? "bg-stone-200" : "bg-white/10", className)} />;
}

function SkeletonCard({ className, isLight = false }: { className?: string; isLight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        isLight ? "border-stone-200 bg-white shadow-sm" : "border-white/10 bg-white/[0.05]",
        className,
      )}
    >
      <SkeletonLine isLight={isLight} className="w-24" />
      <div className={cn("mt-5 h-8 w-16 rounded-md", isLight ? "bg-stone-200" : "bg-white/10")} />
      <SkeletonLine isLight={isLight} className="mt-5 w-40" />
    </div>
  );
}

export function AppLoadingShell({
  variant = "broker",
  message = "Loading workspace",
}: {
  variant?: "broker" | "admin";
  message?: string;
}) {
  const isAdmin = variant === "admin";
  const isBroker = !isAdmin;
  const Icon = isAdmin ? ShieldCheck : ClipboardList;
  const accent = isAdmin ? "bg-cyan-300 text-slate-950" : "bg-emerald-500 text-white";
  const bg = isAdmin ? "bg-slate-950 text-slate-50" : "bg-stone-50 text-stone-950";
  const sidebar = isAdmin ? "w-72 border-cyan-300/10" : "w-64 border-stone-200 bg-white";
  const contentPad = isAdmin ? "lg:pl-72" : "lg:pl-64";

  return (
    <div className={cn("min-h-screen", bg)} aria-live="polite" aria-busy="true">
      <aside className={cn("fixed inset-y-0 left-0 hidden border-r px-4 py-5 lg:block", sidebar)}>
        <div className="flex items-center gap-3 px-2">
          <div className={cn("flex size-10 items-center justify-center rounded-md", accent)}>
            <Icon className="size-5" />
          </div>
          <div className="space-y-2">
            <SkeletonLine isLight={isBroker} className="w-32" />
            <SkeletonLine isLight={isBroker} className="w-24" />
          </div>
        </div>
        <div className="mt-10 space-y-3 px-2">
          {Array.from({ length: isAdmin ? 9 : 5 }).map((_, index) => (
            <SkeletonLine key={index} isLight={isBroker} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <main className={contentPad}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className={cn("flex items-center gap-3 text-sm", isBroker ? "text-stone-600" : "text-white/70")}>
            <span className={cn("size-2 animate-pulse rounded-full", isAdmin ? "bg-cyan-300" : "bg-emerald-400")} />
            {message}
          </div>
          <div className="mt-8 space-y-3">
            <SkeletonLine isLight={isBroker} className="w-28" />
            <SkeletonLine isLight={isBroker} className="h-8 w-72 max-w-full" />
            <SkeletonLine isLight={isBroker} className="w-full max-w-2xl" />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} isLight={isBroker} />
            ))}
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <SkeletonCard isLight={isBroker} className="min-h-56" />
            <SkeletonCard isLight={isBroker} className="min-h-56" />
          </div>
        </div>
      </main>
    </div>
  );
}
