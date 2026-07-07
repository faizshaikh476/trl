import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  Car,
  CheckCircle2,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlatformBranding } from "@/lib/platform/branding";

export const dynamic = "force-dynamic";

const samplePhotos = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
];
const CREATE_LISTING_WHATSAPP_URL = "https://wa.me/message/J5AZEENAAMZVK1";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  return {
    title: `Sample property page | ${branding.brandName}`,
    description: "A sample property page showing how WhatsApp property details become a polished listing link.",
  };
}

export default async function SampleListingPage() {
  const branding = await getPlatformBranding();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-[#fbfaf7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="size-4" />
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.brandName} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              branding.brandName
            )}
          </Link>
          <Button asChild className="bg-zinc-950 text-white hover:bg-zinc-800">
            <a href={CREATE_LISTING_WHATSAPP_URL}>Create yours</a>
          </Button>
        </div>
      </header>

      <section className="trl-tall-hero-height relative overflow-hidden bg-zinc-950 text-white">
        <Image
          src={samplePhotos[0]}
          alt="Sample premium apartment listing"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-zinc-950/10" />
        <div className="trl-tall-hero-height relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="size-4 text-emerald-300" />
              Sample listing page
            </p>
            <h1 className="mt-5 text-balance text-5xl font-semibold leading-[0.96] tracking-tight sm:text-7xl">
              3 BHK premium apartment for rent in Koregaon Park.
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-100">
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" />
                Koregaon Park, Pune
              </span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-zinc-950">Rs 85,000/month</span>
              <span className="rounded-full bg-emerald-300 px-3 py-1 font-semibold text-emerald-950">For rent</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-10">
          <div className="grid gap-3 sm:grid-cols-4">
            <Fact icon={BedDouble} label="Configuration" value="3 BHK" />
            <Fact icon={Ruler} label="Carpet area" value="1,450 sqft" />
            <Fact icon={Car} label="Parking" value="2 reserved" />
            <Fact icon={CalendarDays} label="Availability" value="Immediate" />
          </div>

          <section className="border-t border-zinc-200 pt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Signature highlight</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              A ready-to-share property page made from one WhatsApp message.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Highlight text="Premium gallery with large mobile-first photos" />
              <Highlight text="Clean pricing, location, facts, and enquiry actions" />
              <Highlight text="Broker catalogue and lead tracking after login" />
              <Highlight text="AI-written title, highlights, and buyer-ready copy" />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {samplePhotos.slice(1).map((photo, index) => (
              <div key={photo} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-200">
                <Image
                  src={photo}
                  alt={`Sample gallery image ${index + 1}`}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="p-5">
              <p className="text-sm text-zinc-500">Sample contact card</p>
              <h2 className="mt-2 text-2xl font-semibold">Your brokerage appears here</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Real listings show the verified broker profile, WhatsApp button, call button, and enquiry form.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <MessageCircle className="size-4" />
                  WhatsApp
                </Button>
                <Button variant="outline">
                  <Phone className="size-4" />
                  Call
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-zinc-200">
              <MiniStat label="Freshness" value="Updated today" />
              <MiniStat label="Share" value="One clean link" />
            </div>
            <div className="border-t border-zinc-200 p-5">
              <Button asChild className="w-full bg-zinc-950 text-white hover:bg-zinc-800">
                <a href={CREATE_LISTING_WHATSAPP_URL}>
                  Build my first listing
                  <Share2 className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <Icon className="size-5 text-emerald-700" />
      <p className="mt-5 text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Highlight({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
      <p className="text-sm font-medium leading-6">{text}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
