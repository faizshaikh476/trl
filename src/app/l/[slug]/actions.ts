"use server";

import { brokerVerificationService } from "@/lib/claims/broker-verification-service";

export async function startBrokerVerificationAction(token: string, formData: FormData) {
  return brokerVerificationService.start(token, formData);
}

export async function completeBrokerVerificationAction(token: string, otp: string, idToken: string) {
  return brokerVerificationService.complete(token, otp, idToken);
}
