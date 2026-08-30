/**
 * Checkout status refresh policy.
 *
 * Offsets are measured from the moment the result page starts observing an
 * invoice. Keeping them absolute prevents UI re-renders from postponing the
 * next check indefinitely.
 */
export const DB_POLL_OFFSETS_MS = [0, 3_000, 6_000, 10_000, 15_000, 20_000, 30_000, 45_000, 60_000, 75_000, 90_000] as const;

/**
 * Provider reconciliation is deliberately delayed until 60 seconds and is
 * bounded. Database polling remains the primary path while the webhook lands.
 */
export const RECONCILE_OFFSETS_MS = [60_000, 75_000, 105_000] as const;

export const CHECKOUT_FALLBACK_AFTER_MS = 90_000;

export type CheckoutPollingState = 'pending' | 'success' | 'final' | 'inaccessible';

export function getDbPollOffset(attempt: number): number | null {
  if (!Number.isInteger(attempt) || attempt < 0) return null;
  return DB_POLL_OFFSETS_MS[attempt] ?? null;
}

export function getReconcileOffset(attempt: number): number | null {
  if (!Number.isInteger(attempt) || attempt < 0) return null;
  return RECONCILE_OFFSETS_MS[attempt] ?? null;
}

export function shouldReconcileOnActivation(
  elapsedMs: number,
  attempt: number,
  isInFlight: boolean,
): boolean {
  if (isInFlight || !Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  const dueOffset = getReconcileOffset(attempt);
  return dueOffset !== null && elapsedMs >= dueOffset;
}

export function getCheckoutPollingState(
  kind: string | null | undefined,
  orderStatus: string | null | undefined,
): CheckoutPollingState {
  if (kind === 'not_found' || kind === 'not_owner') return 'inaccessible';
  if (!orderStatus || orderStatus === 'pending_payment') return 'pending';
  if (orderStatus === 'pending_pickup' || orderStatus === 'picked_up' || orderStatus === 'paid') return 'success';
  return 'final';
}
