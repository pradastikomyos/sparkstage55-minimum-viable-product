import { requireSupabaseClient } from '../lib/supabase';
import type { AdminOrder } from '../types/commerce';

// ── Types ────────────────────────────────────────────────────────────────

export type SalesReportRange = {
  startDate: string;
  endDate: string;
  bucket: 'day' | 'week' | 'month';
};

export type SalesSummary = {
  revenue: number;
  paidOrders: number;
  itemsSold: number;
  averageOrderValue: number;
};

export type SalesTimeSeriesPoint = {
  label: string;
  revenue: number;
  orders: number;
  itemsSold: number;
};

export type TopProductRow = {
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
};

export type OrderStatusCount = {
  status: string;
  label: string;
  count: number;
  revenue: number;
  color: string;
};

// ── Indonesian locale helpers ─────────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Menunggu Pembayaran', color: '#A8A29E' },
  paid: { label: 'Dibayar', color: '#16A34A' },
  pending_pickup: { label: 'Menunggu Pengambilan', color: '#D97706' },
  picked_up: { label: 'Sudah Diambil', color: '#2563EB' },
  cancelled: { label: 'Dibatalkan', color: '#DC2626' },
  expired: { label: 'Kedaluwarsa', color: '#A8A29E' },
};

function padZero(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseDate(iso: string): Date {
  return new Date(iso);
}

function getIsoWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0, Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayLabel(iso: string): string {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

function formatWeekLabel(iso: string): string {
  const weekStart = getIsoWeekStart(parseDate(iso));
  return `${weekStart.getDate()} ${MONTH_ABBR[weekStart.getMonth()]}`;
}

function formatMonthLabel(iso: string): string {
  const d = parseDate(iso);
  return `${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

function toDateKey(iso: string): string {
  const d = parseDate(iso);
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

function toWeekKey(iso: string): string {
  const weekStart = getIsoWeekStart(parseDate(iso));
  // ISO week: find Thursday of that week, then get its week number
  const thu = new Date(weekStart);
  thu.setDate(weekStart.getDate() + 3);
  const yearStart = new Date(thu.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${padZero(weekNo)}`;
}

function toMonthKey(iso: string): string {
  const d = parseDate(iso);
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}`;
}

function getBucketKey(iso: string, bucket: 'day' | 'week' | 'month'): string {
  if (bucket === 'day') return toDateKey(iso);
  if (bucket === 'week') return toWeekKey(iso);
  return toMonthKey(iso);
}

function getBucketLabel(iso: string, bucket: 'day' | 'week' | 'month'): string {
  if (bucket === 'day') return formatDayLabel(iso);
  if (bucket === 'week') return formatWeekLabel(iso);
  return formatMonthLabel(iso);
}

// ── Formatting ───────────────────────────────────────────────────────────

const IDR_FMT = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

export function formatIdr(n: number): string {
  return IDR_FMT.format(n);
}

// ── Data fetching ────────────────────────────────────────────────────────

export async function fetchPaidOrders(startDate: string, endDate: string): Promise<AdminOrder[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('orders')
    .select(`
      id,
      invoice_number,
      customer_name,
      customer_email,
      customer_phone,
      status,
      payment_status,
      total_amount_idr,
      paid_at,
      picked_up_at,
      created_at,
      pickup_codes(code, qr_payload, verified_at),
      order_items(product_name, sku, quantity, unit_price_idr, line_total_idr)
    `)
    .eq('payment_status', 'paid')
    .gte('paid_at', startDate)
    .lte('paid_at', endDate)
    .order('paid_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return (data ?? []) as AdminOrder[];
}

export async function fetchOrdersForStatusSummary(startDate: string, endDate: string): Promise<AdminOrder[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('orders')
    .select(`
      id,
      invoice_number,
      customer_name,
      customer_email,
      customer_phone,
      status,
      payment_status,
      total_amount_idr,
      paid_at,
      picked_up_at,
      created_at,
      pickup_codes(code, qr_payload, verified_at),
      order_items(product_name, sku, quantity, unit_price_idr, line_total_idr)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return (data ?? []) as AdminOrder[];
}

// ── Aggregation: summary ─────────────────────────────────────────────────

export function computeSalesSummary(orders: AdminOrder[]): SalesSummary {
  const revenue = orders.reduce((sum, o) => sum + (o.total_amount_idr ?? 0), 0);
  const paidOrders = orders.length;
  const itemsSold = orders.reduce(
    (sum, o) => sum + (o.order_items?.reduce((is, i) => is + i.quantity, 0) ?? 0),
    0,
  );
  const averageOrderValue = paidOrders > 0 ? Math.round(revenue / paidOrders) : 0;

  return { revenue, paidOrders, itemsSold, averageOrderValue };
}

// ── Aggregation: time series ─────────────────────────────────────────────

export function computeTimeSeries(
  orders: AdminOrder[],
  bucket: 'day' | 'week' | 'month',
): SalesTimeSeriesPoint[] {
  const map = new Map<string, { revenue: number; orders: number; itemsSold: number; firstIso: string }>();

  for (const order of orders) {
    const iso = order.paid_at ?? order.created_at;
    if (!iso) continue;

    const key = getBucketKey(iso, bucket);
    const existing = map.get(key);
    const orderItems = order.order_items ?? [];
    const itemsCount = orderItems.reduce((s, i) => s + i.quantity, 0);

    if (existing) {
      existing.revenue += order.total_amount_idr ?? 0;
      existing.orders += 1;
      existing.itemsSold += itemsCount;
    } else {
      map.set(key, {
        revenue: order.total_amount_idr ?? 0,
        orders: 1,
        itemsSold: itemsCount,
        firstIso: iso,
      });
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      label: getBucketLabel(v.firstIso, bucket),
      revenue: v.revenue,
      orders: v.orders,
      itemsSold: v.itemsSold,
    }));
}

// ── Aggregation: top products ────────────────────────────────────────────

export function computeTopProducts(orders: AdminOrder[], limit: number = 10): TopProductRow[] {
  const map = new Map<string, { productName: string; sku: string; quantitySold: number; revenue: number }>();

  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      const key = `${item.product_name}::${item.sku}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += item.line_total_idr ?? 0;
      } else {
        map.set(key, {
          productName: item.product_name,
          sku: item.sku,
          quantitySold: item.quantity,
          revenue: item.line_total_idr ?? 0,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);
}

// ── Aggregation: order status summary ────────────────────────────────────

export function computeOrderStatusSummary(orders: AdminOrder[]): OrderStatusCount[] {
  const map = new Map<string, { count: number; revenue: number }>();

  for (const order of orders) {
    const existing = map.get(order.status);
    if (existing) {
      existing.count += 1;
      existing.revenue += order.total_amount_idr ?? 0;
    } else {
      map.set(order.status, {
        count: 1,
        revenue: order.total_amount_idr ?? 0,
      });
    }
  }

  return Array.from(map.entries())
    .map(([status, v]) => ({
      status,
      label: STATUS_META[status]?.label ?? status,
      count: v.count,
      revenue: v.revenue,
      color: STATUS_META[status]?.color ?? '#A8A29E',
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Period helpers ───────────────────────────────────────────────────────

export function getPeriodRange(
  period: 'today' | '7d' | '30d' | 'this_month' | 'custom',
  customStart?: string,
  customEnd?: string,
): { startDate: string; endDate: string } {
  const now = new Date();
  const today = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`;

  if (period === 'today') {
    return { startDate: `${today}T00:00:00+07:00`, endDate: `${today}T23:59:59+07:00` };
  }

  if (period === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    const start = `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
    return { startDate: `${start}T00:00:00+07:00`, endDate: `${today}T23:59:59+07:00` };
  }

  if (period === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    const start = `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
    return { startDate: `${start}T00:00:00+07:00`, endDate: `${today}T23:59:59+07:00` };
  }

  if (period === 'this_month') {
    const start = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-01`;
    return { startDate: `${start}T00:00:00+07:00`, endDate: `${today}T23:59:59+07:00` };
  }

  // custom
  return {
    startDate: customStart ? `${customStart}T00:00:00+07:00` : `${today}T00:00:00+07:00`,
    endDate: customEnd ? `${customEnd}T23:59:59+07:00` : `${today}T23:59:59+07:00`,
  };
}
