"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Bot, ExternalLink, FileText, ImageIcon, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface IntakeResult {
  status?: string;
  reply?: string;
  listing?: {
    id: string;
    workspaceId: string;
    title: string;
    slug: string;
    status: string;
    qualityScore: number;
    missingFields: string[];
  };
  media?: Array<{ id: string; url: string; type: string; isHero: boolean }>;
  claim?: {
    claimPath: string;
    claimUrl: string;
    expiresAt: string;
  };
  ownerProfile?: {
    id: string;
    phone: string;
    status: string;
  };
  ai?: {
    provider: string;
    model: string;
    confidenceScore: number;
    costEstimate: number;
  };
}

function parseMediaInput(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const validUrls = lines.filter((line) => {
    try {
      const url = new URL(line);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });

  return {
    invalidLines: lines.filter((line) => !validUrls.includes(line)),
    media: validUrls.map((url, index) => ({
      id: `admin_actual_${Date.now()}_${index}`,
      url,
      type: "image" as const,
    })),
  };
}

function formatValidationIssues(issues: unknown) {
  if (!issues || typeof issues !== "object") return null;
  const fieldErrors = (issues as { fieldErrors?: Record<string, string[]> }).fieldErrors;
  if (!fieldErrors) return null;

  const messages = Object.entries(fieldErrors)
    .flatMap(([field, errors]) => errors.map((message) => `${field}: ${message}`))
    .join(" ");

  return messages || null;
}

export function WhatsAppIntakeTester({
  workspaceId,
  workspaceName,
  providerLabel,
}: {
  workspaceId: string | null;
  workspaceName: string;
  providerLabel: string;
}) {
  const [from, setFrom] = useState("");
  const [text, setText] = useState("");
  const [mediaText, setMediaText] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { media, invalidLines } = useMemo(() => parseMediaInput(mediaText), [mediaText]);
  const canRun = Boolean(workspaceId && from.trim() && text.trim());

  function runIntake() {
    if (!workspaceId) {
      setError("Create a workspace before testing intake.");
      return;
    }
    if (!from.trim() || !text.trim()) {
      setError("Add the actual sender phone and WhatsApp message text.");
      return;
    }

    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/whatsapp/intake-test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            from: from.trim(),
            text: text.trim(),
            media,
          }),
        });

        const contentType = response.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? ((await response.json()) as IntakeResult & { message?: string })
          : ({ message: await response.text() } as IntakeResult & { message?: string });

        if (!response.ok) {
          const issueMessage = formatValidationIssues((data as { issues?: unknown }).issues);
          setError(
            issueMessage ||
              data.message ||
              "The intake failed before a listing could be created.",
          );
          return;
        }
        setResult(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to create listing right now.");
      }
    });
  }

  const publicPageReady = result?.listing?.status === "published";

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm text-cyan-200">
              <Bot className="size-4" />
              {providerLabel}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Create listing from WhatsApp data</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Paste a real broker message and real image URLs. The intake creates a listing draft
              and stores those images in the listing media collection.
            </p>
          </div>
          <div className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
            Super Admin only
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="max-w-sm">
            <Label htmlFor="sender-phone" className="text-slate-200">
              Sender phone
            </Label>
            <Input
              id="sender-phone"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              placeholder="e.g. 9822052388"
              className="mt-2 border-cyan-300/10 bg-slate-950 text-white"
            />
          </div>

          <div>
            <Label htmlFor="actual-message" className="text-slate-200">
              WhatsApp message
            </Label>
            <Textarea
              id="actual-message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste the broker's WhatsApp property message here."
              className="mt-2 min-h-52 border-cyan-300/10 bg-slate-950 text-white"
            />
          </div>

          <div>
            <Label htmlFor="actual-images" className="text-slate-200">
              Image URLs
            </Label>
            <Textarea
              id="actual-images"
              value={mediaText}
              onChange={(event) => setMediaText(event.target.value)}
              placeholder="One image URL per line. These will be attached to the created listing."
              className="mt-2 min-h-28 border-cyan-300/10 bg-slate-950 text-white"
            />
            <p className="mt-2 text-xs text-slate-500">
              Add real property image URLs that should appear in the created listing gallery.
            </p>
            {invalidLines.length ? (
              <p className="mt-2 text-xs text-amber-200">
                Ignoring {invalidLines.length} image line(s) that are not public http/https URLs.
              </p>
            ) : null}
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={runIntake}
            disabled={isPending || !canRun}
            className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Create listing
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setText("");
              setMediaText("");
              setFrom("");
              setResult(null);
              setError(null);
            }}
          >
            Clear
          </Button>
        </div>

        {result?.listing ? (
          <div className="mt-5 rounded-lg border border-cyan-300/10 bg-slate-950 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-sm text-cyan-200">
                  <MessageCircle className="size-4" />
                  Draft created from WhatsApp intake
                </p>
                <h3 className="mt-2 text-lg font-semibold">{result.listing.title}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Status: {result.listing.status.replaceAll("_", " ")} · Quality:{" "}
                  {result.listing.qualityScore}/100 · Media attached: {result.media?.length ?? 0}
                </p>
                {result.ai ? (
                  <p className="mt-1 text-xs text-slate-500">
                    AI: {result.ai.provider} / {result.ai.model} · Confidence:{" "}
                    {Math.round(result.ai.confidenceScore * 100)}%
                  </p>
                ) : null}
                {result.ownerProfile ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Owner profile: {result.ownerProfile.phone} · {result.ownerProfile.status}
                  </p>
                ) : null}
                {result.claim ? (
                  <div className="mt-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
                      Owner claim link
                    </p>
                    <Link
                      href={result.claim.claimPath}
                      className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm text-white underline underline-offset-4"
                    >
                      <ExternalLink className="size-4 shrink-0" />
                      {result.claim.claimUrl}
                    </Link>
                    <p className="mt-2 text-xs text-slate-500">
                      Share this private link with the property owner to verify their details.
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link
                    href={`/admin/listings/${result.listing.id}?workspaceId=${result.listing.workspaceId}`}
                  >
                    Review draft
                  </Link>
                </Button>
                {publicPageReady ? (
                  <Button asChild size="sm" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                    <Link href={`/l/${result.listing.slug}`}>View page</Link>
                  </Button>
                ) : (
                  <p className="max-w-48 text-right text-xs leading-5 text-slate-500">
                    Publish the draft before opening the public page.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="rounded-lg border border-cyan-300/10 bg-slate-950 p-5 text-white">
        <p className="text-sm font-medium text-cyan-200">Input summary</p>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-slate-500">Workspace</p>
            <p className="mt-1 font-medium">{workspaceName}</p>
          </div>
          <div>
            <p className="text-slate-500">Message length</p>
            <p className="mt-1 font-medium">{text.trim().length} characters</p>
          </div>
          <div>
            <p className="text-slate-500">Images to attach</p>
            <p className="mt-1 font-medium">{media.length}</p>
          </div>
        </div>

        {media.length ? (
          <div className="mt-5 space-y-2">
            {media.map((item, index) => (
              <div key={item.id} className="rounded-md border border-white/10 p-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                  <ImageIcon className="size-3" />
                  Image {index + 1}
                </p>
                <p className="mt-2 break-all text-xs text-slate-500">{item.url}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-white/10 p-3 text-sm text-slate-500">
            <FileText className="mb-2 size-4" />
            Add image URLs to verify the created listing has gallery media.
          </div>
        )}
      </aside>
    </section>
  );
}
