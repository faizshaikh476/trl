"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LeadForm({ listingId }: { listingId: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function submit(formData: FormData) {
    if (formData.get("contactConsent") !== "on") {
      setStatus("error");
      return;
    }

    setStatus("submitting");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        message: formData.get("message"),
        preferredVisitDate: formData.get("preferredVisitDate"),
        budget: formData.get("budget") || undefined,
        contactConsent: formData.get("contactConsent") === "on",
        marketingConsent: formData.get("marketingConsent") === "on",
        consentVersion: "lead-enquiry-v1",
        listingId,
        source: "public_listing",
      }),
    });
    setStatus(response.ok ? "sent" : "error");
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Your name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" placeholder="10 digit mobile number" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="Optional" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" defaultValue="I am interested in this property." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="preferredVisitDate" type="date" />
        <Input name="budget" type="number" placeholder="Budget" />
      </div>
      <label className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
        <input
          type="checkbox"
          name="contactConsent"
          required
          className="mt-1 size-4 rounded border-zinc-300 text-zinc-950"
        />
        <span>
          I agree to share my enquiry with the broker and be contacted about this property.{" "}
          <Link href="/privacy" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
            Privacy
          </Link>
        </span>
      </label>
      <label className="flex gap-3 rounded-lg border border-zinc-200 p-3 text-sm leading-6 text-zinc-600">
        <input
          type="checkbox"
          name="marketingConsent"
          className="mt-1 size-4 rounded border-zinc-300 text-zinc-950"
        />
        <span>Send me updates about similar properties. Optional.</span>
      </label>
      <Button className="w-full" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Request visit"}
      </Button>
      {status === "sent" ? <p className="text-sm text-emerald-600">Enquiry captured in CRM.</p> : null}
      {status === "error" ? <p className="text-sm text-red-600">Please check your details and consent choice.</p> : null}
    </form>
  );
}
