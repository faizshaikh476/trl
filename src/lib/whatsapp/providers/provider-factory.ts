import { MetaWhatsAppProvider } from "./meta-provider";
import { MockWhatsAppProvider } from "./mock-provider";

export function createWhatsAppProvider() {
  return process.env.WHATSAPP_PROVIDER === "meta"
    ? new MetaWhatsAppProvider()
    : new MockWhatsAppProvider();
}
