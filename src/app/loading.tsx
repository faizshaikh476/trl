import { ClipboardList } from "lucide-react";

export default function Loading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8ee] px-4 text-zinc-950">
      <div className="absolute inset-x-0 top-0 h-32 bg-emerald-100/70" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-amber-100/70" />
      <div className="relative text-center" aria-live="polite" aria-busy="true">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
          <ClipboardList className="size-6" />
        </div>
        <p className="mt-5 text-sm font-semibold text-zinc-800">Preparing therealestatelink</p>
        <p className="mt-1 text-xs text-zinc-500">Your property page is almost ready.</p>
        <div className="mx-auto mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
        </div>
      </div>
    </main>
  );
}
