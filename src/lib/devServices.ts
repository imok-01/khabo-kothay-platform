/**
 * External service mocks for the DEV simulation.
 *
 * The simulation must never call real SMS / payment / notification providers.
 * These helpers stand in for those integrations: they log instead of
 * performing real side effects, so the demo can exercise the full flow (OTP,
 * order, notification) without touching any real vendor. Each helper refuses
 * to run in a real production *environment* — belt-and-braces alongside the
 * repo guards. Note we gate on the project environment (VITE_APP_ENV), not the
 * Vite build MODE: the DEV project ships as a production build.
 */

import { isDevSimulation } from './devSimulation';

function rejectInProduction(service: string): void {
  if (import.meta.env.MODE === 'production' && !isDevSimulation()) {
    throw new Error(`${service} must not be called in a production build.`);
  }
}

/** Stand-in for an SMS gateway (e.g. Twilio/Supabase Phone). Logs only. */
export function mockSendSms(to: string, body: string): void {
  rejectInProduction('mockSendSms');
  console.info(`[DEV SIM] SMS → ${to}: ${body}`);
}

/** Stand-in for a payment processor. No real charge is ever made. */
export function mockProcessPayment(amountBdt: number, reference: string): { ok: true; reference: string } {
  rejectInProduction('mockProcessPayment');
  console.info(`[DEV SIM] Payment ৳${amountBdt} (${reference}) — simulated, no real charge`);
  return { ok: true, reference };
}

/** Stand-in for a push/email notification service. Logs only. */
export function mockSendNotification(userId: string, message: string): void {
  rejectInProduction('mockSendNotification');
  console.info(`[DEV SIM] Notification → user ${userId}: ${message}`);
}
