import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ShopHeader } from '../components/layout/ShopHeader';
import { isSupabaseConfigured } from '../lib/supabase';
import { getOrCreateActiveCart, listCartItems } from '../services/cart';
import { createDokuCheckout } from '../services/commerce';
import { loadDokuCheckoutScript, openDokuCheckout } from '../utils/dokuCheckout';
import { useAuthUser } from '../hooks/useCartSummary';
import type { CartItem } from '../types/commerce';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const PICKUP_LOCATIONS = [
  { id: 'store-jakarta', name: 'SPARK Store Jakarta - Mall Plaza Senayan' },
  { id: 'store-bandung', name: 'SPARK Store Bandung - Paris Van Java' },
  { id: 'store-surabaya', name: 'SPARK Store Surabaya - Tunjungan Plaza' },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { userId, email } = useAuthUser();
  const [selectedLocation, setSelectedLocation] = useState(PICKUP_LOCATIONS[0].id);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Checkout | SPARK';
  }, []);

  const itemsQuery = useQuery({
    queryKey: ['cart', userId],
    queryFn: async (): Promise<CartItem[]> => {
      if (!userId) return [];
      const { id } = await getOrCreateActiveCart(userId);
      return listCartItems(id);
    },
    enabled: isSupabaseConfigured && Boolean(userId),
  });

  const items = itemsQuery.data ?? [];
  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unit_price_idr, 0),
    [items],
  );

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!items.length || !email) throw new Error('Keranjang kosong atau belum login');
      await loadDokuCheckoutScript();
      return createDokuCheckout({
        customer: {
          name: email ?? 'Customer',
          email: email ?? undefined,
        },
        items: items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id ?? undefined,
          quantity: item.quantity,
        })),
      });
    },
    onSuccess: async (result) => {
      if (result?.payment_url) {
        navigate(`/checkout-result?invoice=${encodeURIComponent(result.invoice_number)}&pending=1`);
        await new Promise((resolve) => setTimeout(resolve, 50));
        openDokuCheckout(result.payment_url);
      } else {
        setCheckoutError('Checkout tidak mengembalikan URL pembayaran.');
      }
    },
    onError: (error: Error) => {
      setCheckoutError(error.message || 'Gagal memproses checkout.');
    },
  });

  /* ── Loading ───────────────────────────────────────────────────────── */
  if (itemsQuery.isLoading) {
    return (
      <div className="checkout-page">
        <ShopHeader />
        <main className="checkout-loading">
          <span className="checkout-loading-dot" />
          <span className="checkout-loading-dot" />
          <span className="checkout-loading-dot" />
        </main>
      </div>
    );
  }

  /* ── Empty cart ────────────────────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <ShopHeader />
        <main className="checkout-empty">
          <p className="checkout-empty-label">Keranjang kosong</p>
          <Link to="/" className="checkout-empty-link">Lanjutkan belanja</Link>
        </main>
      </div>
    );
  }

  /* ── Main checkout ─────────────────────────────────────────────────── */
  return (
    <div className="checkout-page">
      <ShopHeader />

      <main className="checkout-shell">
        {/* Page title */}
        <header className="checkout-page-header">
          <h1 className="checkout-page-title">Checkout</h1>
          <Link to="/" className="checkout-back-link">Kembali belanja</Link>
        </header>

        <div className="checkout-body">

          {/* ── Left: Order Summary ─────────────────────────────────── */}
          <section className="checkout-summary-col">
            <h2 className="checkout-section-title">Order Summary</h2>

            <div className="checkout-items">
              {items.map((item) => (
                <div key={item.id} className="checkout-item">
                  {/* Thumbnail */}
                  <div className="checkout-item-thumb">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="checkout-item-img"
                      />
                    ) : (
                      <div className="checkout-item-img-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="checkout-item-info">
                    <p className="checkout-item-name">{item.product_name}</p>
                    <p className="checkout-item-meta">
                      {item.variant_name && (
                        <>
                          {item.variant_name.includes(' - ') ? (
                            <>Size: {item.variant_name.split(' - ')[0]}, Color: {item.variant_name.split(' - ')[1]}</>
                          ) : (
                            <>Size: {item.variant_name}</>
                          )}
                        </>
                      )}
                    </p>
                    <p className="checkout-item-meta">Quantity: {item.quantity}</p>
                    <p className="checkout-item-price">{IDR.format(item.unit_price_idr * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="checkout-totals">
              <div className="checkout-totals-row">
                <span>Subtotal</span>
                <span>{IDR.format(total)}</span>
              </div>
              <div className="checkout-totals-row">
                <span>Shipping</span>
                <span className="checkout-totals-free">Rp 0</span>
              </div>
              <div className="checkout-totals-row checkout-totals-row--grand">
                <span>Total</span>
                <span>{IDR.format(total)}</span>
              </div>
            </div>
          </section>

          {/* ── Right: Delivery Options ─────────────────────────────── */}
          <aside className="checkout-delivery-col">
            <h2 className="checkout-section-title">Delivery Options</h2>

            {/* BOPIS option */}
            <label className="checkout-delivery-option">
              <span className="checkout-delivery-radio">
                <input type="radio" name="delivery" value="bopis" defaultChecked readOnly />
                <span className="checkout-delivery-radio-dot" />
              </span>
              <span className="checkout-delivery-option-text">
                <strong>BOPIS (Ambil di Toko)</strong>
                <span>Pilih lokasi pengambilan di toko terdekat.</span>
              </span>
            </label>

            {/* Location select */}
            <div className="checkout-location-select-wrap">
              <select
                id="pickup-location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="checkout-location-select"
              >
                {PICKUP_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <span className="checkout-location-select-arrow" aria-hidden="true">
                <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 1.5l5 5 5-5" />
                </svg>
              </span>
            </div>

            {/* Spacer + Error */}
            <div className="checkout-cta-area">
              {checkoutError && (
                <p className="checkout-error">{checkoutError}</p>
              )}

              <button
                type="button"
                id="checkout-pay-btn"
                className="checkout-pay-btn"
                disabled={checkoutMutation.isPending || items.length === 0}
                onClick={() => checkoutMutation.mutate()}
              >
                {checkoutMutation.isPending ? (
                  <span className="checkout-pay-btn-loading">
                    <span className="checkout-spinner" />
                    Memproses...
                  </span>
                ) : (
                  'Bayar via DOKU'
                )}
              </button>

              <p className="checkout-secure-note">
                <svg viewBox="0 0 14 16" fill="currentColor" className="checkout-lock-icon" aria-hidden="true">
                  <path d="M7 0a4 4 0 00-4 4v1H1a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2V4a4 4 0 00-4-4zm0 1.5A2.5 2.5 0 019.5 4v1h-5V4A2.5 2.5 0 017 1.5zm0 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
                </svg>
                Pembayaran aman &amp; terenkripsi
              </p>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}
