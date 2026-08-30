import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_FALLBACK_AFTER_MS,
  DB_POLL_OFFSETS_MS,
  RECONCILE_OFFSETS_MS,
  getCheckoutPollingState,
  getDbPollOffset,
  getReconcileOffset,
} from '../src/pages/checkout-result/paymentPollingPolicy';
import { mapDokuCheckoutPaymentStatus } from '../supabase/functions/_shared/dokuPaymentStatus';

describe('checkout payment polling policy', () => {
  it('uses absolute, increasing database poll offsets', () => {
    expect(DB_POLL_OFFSETS_MS[0]).toBe(0);
    expect([...DB_POLL_OFFSETS_MS]).toEqual([...DB_POLL_OFFSETS_MS].sort((a, b) => a - b));
    expect(DB_POLL_OFFSETS_MS.at(-1)).toBeGreaterThanOrEqual(90_000);
    expect(getDbPollOffset(3)).toBe(10_000);
  });

  it('stops database polling after the bounded schedule', () => {
    expect(getDbPollOffset(DB_POLL_OFFSETS_MS.length)).toBeNull();
    expect(getDbPollOffset(-1)).toBeNull();
    expect(getDbPollOffset(1.5)).toBeNull();
  });

  it('never reconciles with the provider before 60 seconds', () => {
    expect(RECONCILE_OFFSETS_MS[0]).toBeGreaterThanOrEqual(60_000);
    expect(RECONCILE_OFFSETS_MS.every((offset) => offset >= 60_000)).toBe(true);
  });

  it('does not show the fallback before the webhook/reconcile window', () => {
    expect(CHECKOUT_FALLBACK_AFTER_MS).toBeGreaterThanOrEqual(90_000);
  });

  it('uses bounded reconciliation backoff', () => {
    expect(RECONCILE_OFFSETS_MS).toHaveLength(3);
    expect(getReconcileOffset(0)).toBe(60_000);
    expect(getReconcileOffset(1)).toBe(75_000);
    expect(getReconcileOffset(2)).toBe(105_000);
    expect(getReconcileOffset(3)).toBeNull();
  });

  it.each([
    [undefined, undefined, 'pending'],
    ['pending', 'pending_payment', 'pending'],
    ['success', 'pending_pickup', 'success'],
    ['success', 'picked_up', 'success'],
    ['success', 'paid', 'success'],
    ['cancelled', 'cancelled', 'final'],
    ['expired', 'expired', 'final'],
    ['not_found', undefined, 'inaccessible'],
    ['not_owner', 'pending_payment', 'inaccessible'],
  ])('classifies kind=%s status=%s as %s', (kind, status, expected) => {
    expect(getCheckoutPollingState(kind, status)).toBe(expected);
  });
});

describe('DOKU Checkout status mapping', () => {
  it.each(['SUCCESS', 'settlement', 'CAPTURE', 'paid'])(
    'maps %s to paid',
    (status) => expect(mapDokuCheckoutPaymentStatus(status)).toBe('paid'),
  );

  it.each(['FAILED', 'DENY', 'REDIRECT', 'TIMEOUT', 'REFUNDED', 'unknown'])(
    'keeps non-final status %s pending',
    (status) => expect(mapDokuCheckoutPaymentStatus(status)).toBe('pending'),
  );

  it('maps only true expiry and cancellation to terminal states', () => {
    expect(mapDokuCheckoutPaymentStatus('EXPIRED')).toBe('expired');
    expect(mapDokuCheckoutPaymentStatus('CANCELED')).toBe('cancelled');
  });
});
