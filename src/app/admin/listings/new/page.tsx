import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ListingForm } from "@/components/listings/listing-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import { createManualListingInWorkspaceAction } from "@/server-actions/listing-actions";

export default async function AdminNewListingPage() {
  await getCurrentAdmin();
  const workspaces = await workspaceService.list();

  return (
    <AdminShell active="Listings">
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
          <Link href="/admin/listings">
            <ArrowLeft className="size-4" />
            Listings
          </Link>
        </Button>
        <div>
          <p className="text-sm text-cyan-200">Super Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Create listing</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Create a draft under any broker workspace. Publish it only after the workspace and broker details are correct.
          </p>
        </div>

        <ListingForm
          action={createManualListingInWorkspaceAction}
          submitLabel="Create draft"
          extraFields={
            <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <Label htmlFor="workspaceId">Workspace</Label>
              <select
                id="workspaceId"
                name="workspaceId"
                required
                className="mt-2 h-10 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white"
              >
                <option value="">Select workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} · {workspace.city}
                  </option>
                ))}
              </select>
            </section>
          }
        />
      </div>
    </AdminShell>
  );
}
