import type {
  CustomerActivity,
  CustomerActivityCounts,
  CustomerDirectoryPage,
  CustomerDirectoryQuery,
  CustomerEvent,
  CustomerMessage,
} from "./customer-operations.types";

export interface CustomerOperationsRepository {
  getActivity(contactId: string): Promise<CustomerActivity | null>;
  upsertActivity(contactId: string, patch: Partial<CustomerActivity>): Promise<CustomerActivity>;
  queryActivities(query: CustomerDirectoryQuery): Promise<CustomerDirectoryPage>;
  countActivities(): Promise<CustomerActivityCounts>;
  saveMessage(message: CustomerMessage): Promise<CustomerMessage>;
  getMessage(contactId: string, messageId: string): Promise<CustomerMessage | null>;
  updateMessage(
    contactId: string,
    messageId: string,
    patch: Partial<CustomerMessage>,
  ): Promise<CustomerMessage>;
  updateMessageDelivery(
    providerMessageId: string,
    patch: Pick<CustomerMessage, "deliveryStatus" | "failureSummary">,
  ): Promise<number>;
  listMessages(contactId: string, limit?: number): Promise<CustomerMessage[]>;
  deleteMessages(contactId: string): Promise<number>;
  appendEvent(event: CustomerEvent): Promise<CustomerEvent>;
  listEvents(contactId: string, limit?: number): Promise<CustomerEvent[]>;
}
