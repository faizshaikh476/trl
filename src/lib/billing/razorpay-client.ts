import Razorpay from "razorpay";
import type { PaymentOrderClient } from "./payment-service";

export function getRazorpayOrderClient(): PaymentOrderClient {
  return {
    async create(input) {
      const keyId = requiredEnv("RAZORPAY_KEY_ID");
      const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      const order = await razorpay.orders.create({
        amount: input.amount,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
      });
      return { id: order.id };
    },
  };
}

function requiredEnv(name: "RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
