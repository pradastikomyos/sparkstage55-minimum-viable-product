export type OrderCategory = 'pending' | 'active' | 'history';

export type PickupCodeLike = {
  code?: string | null;
  qr_payload?: string | null;
  verified_at?: string | null;
};

type OrderLike = {
  payment_status?: string | null;
  status?: string | null;
  pickup_codes?: PickupCodeLike[] | PickupCodeLike | null;
};

const normalize = (value: string | null | undefined) => String(value || '').toLowerCase();

export function classifyOrder(order: OrderLike): OrderCategory {
  const paymentStatus = normalize(order.payment_status);
  const status = normalize(order.status);

  if (paymentStatus !== 'paid') return 'pending';
  if (status === 'pending_pickup') return 'active';
  return 'history';
}

export function isPickupReady(order: OrderLike) {
  const codes = order.pickup_codes;
  const hasCode = Array.isArray(codes)
    ? codes.length > 0
    : codes != null;
  const status = normalize(order.status);
  return Boolean(
    normalize(order.payment_status) === 'paid' &&
      status === 'pending_pickup' &&
      hasCode,
  );
}

export function getFirstPickupCode(codes: PickupCodeLike[] | PickupCodeLike | null | undefined) {
  if (codes == null) return null;
  return Array.isArray(codes) ? (codes[0] ?? null) : codes;
}

/**
 * Normalise a pickup QR payload to a plain string.
 * The DB may store either a raw pickup code string (e.g. "PRX-AB5-480")
 * or a legacy JSON object ({ type, order_id, code }). Both are handled.
 */
export function normalizeQrPayload(payload: string | null | undefined): string {
  const raw = String(payload || '').trim();
  if (!raw) return '';

  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown> | unknown[];
      if (parsed && !Array.isArray(parsed)) {
        const candidate =
          (parsed as Record<string, unknown>).code ??
          (parsed as Record<string, unknown>).pickup_code ??
          (parsed as Record<string, unknown>).pickupCode;
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
    } catch {
      return raw;
    }
  }

  return raw;
}
