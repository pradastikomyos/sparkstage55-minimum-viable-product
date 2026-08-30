export type DokuPaymentStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

/**
 * DOKU Checkout lets a customer switch payment methods after FAILED/DENY.
 * TIMEOUT and REDIRECT are also non-final. REFUNDED stays non-destructive
 * until the database has an explicit refund state and workflow.
 */
export function mapDokuCheckoutPaymentStatus(providerStatus: string): DokuPaymentStatus {
  const status = providerStatus.trim().toLowerCase();
  if (['success', 'settlement', 'capture', 'paid'].includes(status)) return 'paid';
  if (status === 'expired') return 'expired';
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
  return 'pending';
}
