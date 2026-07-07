import Link from "next/link";
import { AlertTriangle, BadgeCheck, Check, Home, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ownerClaimService } from "@/lib/claims/owner-claim-service";
import { claimOwnerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function OwnerClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ claimed?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const lookup = await ownerClaimService.lookup(token);

  if (query.claimed === "1" || lookup.status === "claimed") {
    return (
      <ClaimShell>
        <div className="rounded-lg border border-emerald-200 bg-white p-8 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <BadgeCheck className="size-6" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">
            Ownership verified
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
            Thanks. Your details are now attached to this property record. The broker can continue
            preparing and publishing the listing from their workspace.
          </p>
          {lookup.listing?.status === "published" && lookup.listing.slug ? (
            <Button asChild className="mt-6 bg-zinc-950 text-white hover:bg-zinc-800">
              <Link href={`/l/${lookup.listing.slug}`}>Open property page</Link>
            </Button>
          ) : (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              Your claim is complete. The public page will open after the broker reviews and
              publishes the listing.
            </div>
          )}
        </div>
      </ClaimShell>
    );
  }

  if (lookup.status !== "ready") {
    return (
      <ClaimShell>
        <div className="rounded-lg border border-amber-200 bg-white p-8 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">
            Claim link unavailable
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
            {statusCopy(lookup.status)}
          </p>
        </div>
      </ClaimShell>
    );
  }

  const action = claimOwnerAction.bind(null, token);
  const error = query.error ? decodeURIComponent(query.error) : null;

  return (
    <ClaimShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            <LockKeyhole className="size-4" />
            Private owner verification
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Claim ownership of your property listing
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
            Confirm your seller details so this property record is connected to you. Your phone
            number came from the WhatsApp message that created the listing.
          </p>

          <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Property</p>
            <div className="mt-3 flex items-start gap-3">
              <Home className="mt-1 size-5 text-emerald-700" />
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">{lookup.listing.title}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {lookup.listing.location || lookup.listing.city}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form action={action} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-zinc-950">Verify your details</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Phone number: <span className="font-medium text-zinc-950">{lookup.maskedPhone}</span>
          </p>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-5 space-y-4">
            <Field label="Full name" name="name" placeholder="Your name" defaultValue={lookup.ownerProfile.name} />
            <Field
              label="Occupation"
              name="occupation"
              placeholder="e.g. Doctor, Business owner, Investor"
              defaultValue={lookup.ownerProfile.occupation}
            />
            <Field
              label="Email"
              name="email"
              placeholder="you@example.com"
              type="email"
              defaultValue={lookup.ownerProfile.email}
            />

            <label className="flex gap-3 rounded-md border border-zinc-200 p-3 text-sm leading-6 text-zinc-700">
              <input
                type="checkbox"
                name="confirmedOwnership"
                required
                className="mt-1 size-4 rounded border-zinc-300 text-zinc-950"
              />
              <span>
                I confirm that I own this property or am authorised to list it for sale or rent.
              </span>
            </label>
            <label className="flex gap-3 rounded-md border border-zinc-200 p-3 text-sm leading-6 text-zinc-700">
              <input
                type="checkbox"
                name="whatsappTransactionalConsent"
                required
                className="mt-1 size-4 rounded border-zinc-300 text-zinc-950"
              />
              <span>I agree to receive WhatsApp OTPs, listing updates, and enquiry alerts.</span>
            </label>
            <label className="flex gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
              <input
                type="checkbox"
                name="termsAccepted"
                required
                className="mt-1 size-4 rounded border-zinc-300 text-zinc-950"
              />
              <span>
                I accept the{" "}
                <Link href="/terms" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
                  Terms
                </Link>
                ,{" "}
                <Link href="/privacy" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link href="/dpdp" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
                  DPDP notice
                </Link>
                .
              </span>
            </label>
          </div>

          <Button type="submit" className="mt-6 w-full bg-zinc-950 text-white hover:bg-zinc-800">
            <Check className="size-4" />
            Claim property
          </Button>
        </form>
      </div>
    </ClaimShell>
  );
}

function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-zinc-950">
      <header className="border-b border-zinc-200/80 bg-[#fbfaf7]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="font-semibold tracking-tight">
            therealestatelink
          </Link>
          <span className="text-sm text-zinc-500">Owner claim</span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        name={name}
        type={type}
        required={name !== "email"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-950"
      />
    </label>
  );
}

function statusCopy(status: string) {
  if (status === "expired") return "This private link has expired. Please ask the broker to send a fresh claim link.";
  if (status === "missing_listing") return "This link is valid, but the listing record could not be found.";
  return "This private link is invalid or has already been used.";
}
