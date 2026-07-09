import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8ee] px-4 text-zinc-950">
      <div className="absolute inset-x-0 top-0 h-32 bg-emerald-100/70" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-amber-100/70" />
      <Card className="relative w-full max-w-lg border-emerald-100 bg-white text-zinc-950 shadow-xl shadow-emerald-900/5">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-emerald-700">Welcome back</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in to TRL</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Manage your listings, leads and property catalogue.
          </p>
          <LoginForm nextPath={next} />
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
            <Link href="/terms" className="hover:text-emerald-700">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-emerald-700">
              Privacy
            </Link>
            <Link href="/dpdp" className="hover:text-emerald-700">
              DPDP
            </Link>
            <Link href="/refund-cancellation" className="hover:text-emerald-700">
              Refunds
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
