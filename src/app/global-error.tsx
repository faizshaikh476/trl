"use client";

import "./globals.css";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#fff8ee] px-4 text-zinc-950">
          <div className="w-full max-w-lg rounded-lg border border-red-100 bg-white p-6 shadow-xl shadow-red-900/5">
            <div className="flex size-11 items-center justify-center rounded-md bg-red-50 text-red-600">
              <AlertTriangle className="size-5" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              We couldn&apos;t load this page. Try again in a moment.
            </p>
            {error.digest ? <p className="mt-4 text-xs text-zinc-500">Reference: {error.digest}</p> : null}
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <RefreshCw className="size-4" />
              Retry
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
