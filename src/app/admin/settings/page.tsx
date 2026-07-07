import { CheckCircle2, Globe2, ImageIcon, Search, ShieldCheck, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { getPlatformBranding } from "@/lib/platform/branding";
import { updatePlatformBrandingAction } from "@/server-actions/platform-branding-actions";

export default async function AdminPlatformSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await getCurrentAdmin();
  const query = await searchParams;
  const branding = await getPlatformBranding();

  return (
    <AdminShell active="Platform settings">
      <div className="space-y-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-cyan-200">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Platform settings</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Control the public website identity, favicon, search metadata, and social preview.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {query.saved === "branding" ? (
              <Badge className="w-fit bg-emerald-300 text-slate-950">
                <CheckCircle2 className="size-3" />
                Branding saved
              </Badge>
            ) : null}
            {query.error ? (
              <Badge className="w-fit bg-rose-200 text-rose-950">
                {query.error}
              </Badge>
            ) : null}
            <Button
              type="submit"
              form="platform-branding-form"
              className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
            >
              Save changes
            </Button>
          </div>
        </div>

        <form
          id="platform-branding-form"
          action={updatePlatformBrandingAction}
          encType="multipart/form-data"
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"
        >
          <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-cyan-300 text-slate-950">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Website identity</h2>
                <p className="text-sm text-slate-400">Used across the homepage, login, dashboard shell, and browser metadata.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Brand name"
                name="brandName"
                defaultValue={branding.brandName}
                placeholder="therealestatelink"
              />
              <Field
                label="Short name"
                name="shortName"
                defaultValue={branding.shortName}
                placeholder="TRL"
              />
              <Field
                label="Support email"
                name="supportEmail"
                defaultValue={branding.supportEmail}
                placeholder="support@example.com"
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <AssetUpload
                label="Upload logo"
                name="logoFile"
                urlName="logoUrl"
                defaultUrl={branding.logoUrl}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                helper="PNG, SVG, JPG, or WebP. Max 5MB."
              />
              <AssetUpload
                label="Upload favicon"
                name="faviconFile"
                urlName="faviconUrl"
                defaultUrl={branding.faviconUrl}
                accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                helper="Square PNG, SVG, or ICO. Max 1MB."
              />
              <AssetUpload
                label="Upload social image"
                name="socialImageFile"
                urlName="socialImageUrl"
                defaultUrl={branding.socialImageUrl}
                accept="image/png,image/jpeg,image/webp"
                helper="1200 x 630 image for WhatsApp previews. Max 8MB."
              />
            </div>

            <div className="mt-8 border-t border-cyan-300/10 pt-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-white/10 text-cyan-200">
                  <Search className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">SEO defaults</h2>
                  <p className="text-sm text-slate-400">Homepage and site fallback title, description, and share cards.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                <Field
                  label="SEO title"
                  name="seoTitle"
                  defaultValue={branding.seoTitle}
                  placeholder="therealestatelink | AI-powered WhatsApp to property pages"
                />
                <label className="grid gap-2 text-sm font-medium text-slate-200">
                  SEO description
                  <textarea
                    name="seoDescription"
                    defaultValue={branding.seoDescription}
                    rows={4}
                    className="min-h-28 rounded-md border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                    placeholder="Describe the product in one polished sentence."
                  />
                </label>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-cyan-300/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                Changes publish to the website shell and search metadata after save.
              </p>
              <Button type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                Save platform branding
              </Button>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Live brand preview</h2>
                <Badge className="bg-cyan-300 text-slate-950">global</Badge>
              </div>
              <div className="mt-5 rounded-lg bg-[#fbfaf7] p-4 text-zinc-950">
                <div className="flex items-center gap-3">
                  <BrandMark logoUrl={branding.logoUrl} shortName={branding.shortName} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{branding.brandName}</p>
                    <p className="text-xs text-zinc-500">Public website</p>
                  </div>
                </div>
                <div className="mt-5 rounded-md border border-zinc-200 bg-white p-4">
                  <p className="line-clamp-1 text-sm text-blue-700">{branding.seoTitle}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{branding.seoDescription}</p>
                  <p className="mt-2 text-xs text-emerald-700">www.therealestatelink.com</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
              <div className="flex items-center gap-3">
                <ImageIcon className="size-5 text-cyan-200" />
                <h2 className="text-lg font-semibold">Asset guidance</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                <p>Logo: transparent PNG or SVG, at least 256px wide.</p>
                <p>Favicon: square PNG/SVG, 32px or larger.</p>
                <p>Social image: 1200 x 630 JPG/PNG for clean link previews.</p>
              </div>
            </section>

            <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
              <div className="flex items-center gap-3">
                <Globe2 className="size-5 text-cyan-200" />
                <h2 className="text-lg font-semibold">Scope</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                These are platform-wide defaults. Broker catalogue branding stays inside broker workspace settings.
              </p>
            </section>
          </aside>
        </form>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-200">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-12 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
      />
    </label>
  );
}

function AssetUpload({
  label,
  name,
  urlName,
  defaultUrl,
  accept,
  helper,
}: {
  label: string;
  name: string;
  urlName: string;
  defaultUrl: string;
  accept: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-cyan-300/10 text-cyan-200">
          <Upload className="size-4" />
        </span>
      </div>

      <label className="mt-4 grid gap-2 text-xs font-medium text-slate-300">
        Choose file
        <input
          name={name}
          type="file"
          accept={accept}
          className="block w-full cursor-pointer rounded-md border border-dashed border-cyan-300/30 bg-white/[0.03] text-sm text-slate-300 outline-none transition file:mr-3 file:h-11 file:border-0 file:bg-cyan-300 file:px-4 file:text-sm file:font-semibold file:text-slate-950 hover:border-cyan-300 focus:border-cyan-300"
        />
      </label>

      {defaultUrl ? (
        <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={defaultUrl} alt="" className="h-24 w-full object-contain p-3" />
        </div>
      ) : null}

      <label className="mt-3 grid gap-2 text-xs font-medium text-slate-400">
        Or paste a hosted URL
        <input
          name={urlName}
          defaultValue={defaultUrl}
          placeholder="https://..."
          className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
        />
      </label>
    </div>
  );
}

function BrandMark({ logoUrl, shortName }: { logoUrl: string; shortName: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="size-10 rounded-md border border-zinc-200 bg-white object-contain p-1"
      />
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-md bg-emerald-500 text-sm font-semibold text-white">
      {shortName.slice(0, 3).toUpperCase()}
    </span>
  );
}
