"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8ee] px-4 text-zinc-950">
      <div className="w-full max-w-lg rounded-lg border border-red-100 bg-white p-6 shadow-xl shadow-red-900/5">
        <div className="flex size-11 items-center justify-center rounded-md bg-red-50 text-red-600">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold">This page could not load</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The request failed before the workspace finished loading. Retry the page, or return to a
          stable starting point.
        </p>
        {error.digest ? <p className="mt-4 text-xs text-zinc-500">Error reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => unstable_retry()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
