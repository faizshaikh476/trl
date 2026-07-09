import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  grantCredits: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentAdmin: mocks.getCurrentAdmin,
}));

vi.mock("@/lib/billing/credit-wallet-service", () => ({
  creditWalletService: {
    grantCredits: mocks.grantCredits,
  },
}));

import { grantPromotionalCreditsAction } from "./credit-actions";

beforeEach(() => {
  mocks.getCurrentAdmin.mockReset();
  mocks.grantCredits.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.getCurrentAdmin.mockResolvedValue({
    id: "admin_1",
    name: "Admin",
    email: "admin@example.com",
    role: "super_admin",
    workspaceId: null,
  });
  mocks.grantCredits.mockResolvedValue({
    id: "grant:promotion:admin:admin_1:workspace_1:grant-a",
  });
});

describe("grantPromotionalCreditsAction", () => {
  it("grants promotional credits with a submission-scoped deterministic source id", async () => {
    const formData = grantFormData({
      quantity: "5",
      reason: "Launch promo",
      idempotencyKey: "grant-a",
    });

    await grantPromotionalCreditsAction("workspace_1", formData);

    expect(mocks.grantCredits).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      quantity: 5,
      validityDays: 30,
      sourceType: "promotion",
      sourceId: "admin:admin_1:workspace_1:grant-a",
      reason: "Launch promo",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/workspaces");
  });

  it("allows two separate grants with the same quantity and reason when idempotency keys differ", async () => {
    await grantPromotionalCreditsAction(
      "workspace_1",
      grantFormData({
        quantity: "5",
        reason: "Launch promo",
        idempotencyKey: "grant-a",
      }),
    );
    await grantPromotionalCreditsAction(
      "workspace_1",
      grantFormData({
        quantity: "5",
        reason: "Launch promo",
        idempotencyKey: "grant-b",
      }),
    );

    expect(mocks.grantCredits).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sourceId: "admin:admin_1:workspace_1:grant-a",
        quantity: 5,
        reason: "Launch promo",
      }),
    );
    expect(mocks.grantCredits).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sourceId: "admin:admin_1:workspace_1:grant-b",
        quantity: 5,
        reason: "Launch promo",
      }),
    );
  });

  it("keeps repeated submissions with the same idempotency key idempotent", async () => {
    const formData = grantFormData({
      quantity: "5",
      reason: "Launch promo",
      idempotencyKey: "grant-a",
    });

    await grantPromotionalCreditsAction("workspace_1", formData);
    await grantPromotionalCreditsAction("workspace_1", formData);

    expect(mocks.grantCredits).toHaveBeenCalledTimes(2);
    expect(mocks.grantCredits.mock.calls[0][0]).toMatchObject({
      sourceId: "admin:admin_1:workspace_1:grant-a",
      quantity: 5,
      reason: "Launch promo",
    });
    expect(mocks.grantCredits.mock.calls[1][0]).toMatchObject({
      sourceId: "admin:admin_1:workspace_1:grant-a",
      quantity: 5,
      reason: "Launch promo",
    });
  });

  it("rejects non-super admins before granting credits", async () => {
    mocks.getCurrentAdmin.mockResolvedValue({
      id: "admin_2",
      name: "Platform Admin",
      email: "platform@example.com",
      role: "platform_admin",
      workspaceId: null,
    });

    await expect(
      grantPromotionalCreditsAction(
        "workspace_1",
        grantFormData({
          quantity: "5",
          reason: "Launch promo",
          idempotencyKey: "grant-a",
        }),
      ),
    ).rejects.toThrow("Only super admins can grant promotional credits.");

    expect(mocks.grantCredits).not.toHaveBeenCalled();
  });

  it("requires a positive whole number quantity", async () => {
    await expect(
      grantPromotionalCreditsAction(
        "workspace_1",
        grantFormData({
          quantity: "1.5",
          reason: "Launch promo",
          idempotencyKey: "grant-a",
        }),
      ),
    ).rejects.toThrow("Quantity must be a positive whole number.");

    await expect(
      grantPromotionalCreditsAction(
        "workspace_1",
        grantFormData({
          quantity: "0",
          reason: "Launch promo",
          idempotencyKey: "grant-a",
        }),
      ),
    ).rejects.toThrow("Quantity must be a positive whole number.");

    expect(mocks.grantCredits).not.toHaveBeenCalled();
  });

  it("requires a non-empty reason", async () => {
    await expect(
      grantPromotionalCreditsAction(
        "workspace_1",
        grantFormData({
          quantity: "5",
          reason: "  ",
          idempotencyKey: "grant-a",
        }),
      ),
    ).rejects.toThrow("Reason is required.");

    expect(mocks.grantCredits).not.toHaveBeenCalled();
  });

  it("requires grant confirmation", async () => {
    const formData = grantFormData({
      quantity: "5",
      reason: "Launch promo",
      idempotencyKey: "grant-a",
    });
    formData.delete("confirmation");

    await expect(grantPromotionalCreditsAction("workspace_1", formData)).rejects.toThrow(
      "Confirm the promotional credit grant before submitting.",
    );

    expect(mocks.grantCredits).not.toHaveBeenCalled();
  });

  it("requires an idempotency key generated by the grant form", async () => {
    const formData = grantFormData({
      quantity: "5",
      reason: "Launch promo",
      idempotencyKey: "grant-a",
    });
    formData.delete("idempotencyKey");

    await expect(grantPromotionalCreditsAction("workspace_1", formData)).rejects.toThrow(
      "Idempotency key is required.",
    );

    expect(mocks.grantCredits).not.toHaveBeenCalled();
  });
});

function grantFormData(input: {
  quantity: string;
  reason: string;
  idempotencyKey: string;
}) {
  const formData = new FormData();
  formData.set("quantity", input.quantity);
  formData.set("reason", input.reason);
  formData.set("idempotencyKey", input.idempotencyKey);
  formData.set("confirmation", "confirm");
  return formData;
}
