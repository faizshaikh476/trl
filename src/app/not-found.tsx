import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-zinc-950">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-emerald-500 text-white">
          <Search className="size-6" />
        </div>
        <p className="mt-6 text-sm font-medium text-emerald-700">404</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-600">
          This link is not available, or the listing may no longer be published.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <Home className="size-4" />
              Home
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
