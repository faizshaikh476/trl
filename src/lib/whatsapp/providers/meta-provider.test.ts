import { describe, expect, it, vi } from "vitest";

vi.stubEnv("WHATSAPP_DEFAULT_WORKSPACE_ID", "workspace_live");

describe("MetaWhatsAppProvider", () => {
  it("parses text messages from Meta webhook payloads", async () => {
    const { MetaWhatsAppProvider } = await import("./meta-provider");
    const provider = new MetaWhatsAppProvider();

    const message = provider.parseWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: "wamid_1",
                    from: "919822052388",
                    type: "text",
                    text: { body: "2 bhk flat for rent in Baner Pune" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(message).toEqual({
      id: "wamid_1",
      workspaceId: "workspace_live",
      from: "919822052388",
      text: "2 bhk flat for rent in Baner Pune",
      media: [],
    });
  });

  it("parses image captions and media ids from Meta webhook payloads", async () => {
    const { MetaWhatsAppProvider } = await import("./meta-provider");
    const provider = new MetaWhatsAppProvider();

    const message = provider.parseWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: "wamid_2",
                    from: "919822052388",
                    type: "image",
                    image: {
                      id: "media_123",
                      caption: "Office for sale in Wanwadi, 450 sqft",
                      mime_type: "image/jpeg",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(message.text).toBe("Office for sale in Wanwadi, 450 sqft");
    expect(message.id).toBe("wamid_2");
    expect(message.media).toEqual([{ id: "media_123", url: "", type: "image" }]);
  });

  it("parses every message when Meta batches multiple photos in one webhook", async () => {
    const { MetaWhatsAppProvider } = await import("./meta-provider");
    const provider = new MetaWhatsAppProvider();

    const messages = provider.parseWebhookPayloads({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: "wamid_1",
                    from: "919822052388",
                    type: "image",
                    image: {
                      id: "media_1",
                      caption: "2 BHK for rent in Wakad",
                    },
                  },
                  {
                    id: "wamid_2",
                    from: "919822052388",
                    type: "image",
                    image: {
                      id: "media_2",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(
      expect.objectContaining({
        id: "wamid_1",
        text: "2 BHK for rent in Wakad",
        media: [{ id: "media_1", url: "", type: "image" }],
      }),
    );
    expect(messages[1]).toEqual(
      expect.objectContaining({
        id: "wamid_2",
        text: "",
        media: [{ id: "media_2", url: "", type: "image" }],
      }),
    );
  });

  it("parses OTP delivery statuses from status-only callbacks", async () => {
    const { parseMetaDeliveryStatuses } = await import("./meta-provider");

    expect(
      parseMetaDeliveryStatuses({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    { id: "wamid_otp", status: "sent", timestamp: "1783521000" },
                    { id: "wamid_otp", status: "delivered", timestamp: "1783521002" },
                    { id: "wamid_otp", status: "read", timestamp: "1783521005" },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { messageId: "wamid_otp", status: "sent", occurredAt: "2026-07-08T14:30:00.000Z", error: null },
      { messageId: "wamid_otp", status: "delivered", occurredAt: "2026-07-08T14:30:02.000Z", error: null },
      { messageId: "wamid_otp", status: "read", occurredAt: "2026-07-08T14:30:05.000Z", error: null },
    ]);
  });

  it("captures Meta delivery failure details without message contents", async () => {
    const { parseMetaDeliveryStatuses } = await import("./meta-provider");

    expect(
      parseMetaDeliveryStatuses({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    {
                      id: "wamid_failed",
                      status: "failed",
                      timestamp: "1783521000",
                      errors: [{ code: 131026, title: "Message undeliverable" }],
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      {
        messageId: "wamid_failed",
        status: "failed",
        occurredAt: "2026-07-08T14:30:00.000Z",
        error: { code: 131026, title: "Message undeliverable" },
      },
    ]);
  });
});
