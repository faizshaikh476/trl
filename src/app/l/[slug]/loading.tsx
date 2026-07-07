export default function PublicListingLoading() {
  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950" aria-live="polite" aria-busy="true">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 rounded-full bg-zinc-200" />
          <div className="h-9 w-28 rounded-md bg-zinc-200" />
        </div>
        <div className="mt-8 space-y-3">
          <div className="h-8 w-full max-w-xl rounded-full bg-zinc-200" />
          <div className="h-4 w-72 rounded-full bg-zinc-200" />
        </div>
        <div className="mt-6 grid gap-2 md:grid-cols-[2fr_1fr]">
          <div className="aspect-[4/3] animate-pulse rounded-lg bg-zinc-200 md:aspect-[16/10]" />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            <div className="animate-pulse rounded-lg bg-zinc-200" />
            <div className="animate-pulse rounded-lg bg-zinc-200" />
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="h-24 rounded-lg bg-zinc-200" />
            <div className="h-40 rounded-lg bg-zinc-200" />
          </div>
          <div className="h-72 rounded-lg bg-zinc-200" />
        </div>
      </div>
    </main>
  );
}
