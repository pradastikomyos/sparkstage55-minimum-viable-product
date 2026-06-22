import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { normalizeQrPayload } from '../../utils/orderHelpers';
import type { CheckoutResultOrder } from '../../services/orders';
import { AnimatedCheckmark } from './StatusIcon';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function QRCodeCanvas({ payload }: { payload: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 180,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [payload]);

  return <canvas ref={canvasRef} aria-label="Pickup QR code" />;
}

export function CheckoutSuccessView({
  order,
  pickupCode,
}: {
  order: CheckoutResultOrder;
  pickupCode: { code: string; qr_payload: string } | null;
}) {
  const isPickedUp = order.status === 'picked_up';

  return (
    <div className="checkout-result-success-section">
      <AnimatedCheckmark />
      <p className="checkout-result-eyebrow checkout-result-eyebrow--success">Pembayaran Berhasil</p>
      <h1 className="checkout-result-title checkout-result-title--success">
        Terima kasih telah memilih Spark Stage
      </h1>
      <p className="checkout-result-body">
        {isPickedUp ? (
          <>Halo <strong>{order.customer_name}</strong>, pesanan Anda sudah berhasil diambil.</>
        ) : (
          <>
            Halo <strong>{order.customer_name}</strong>, pesanan Anda sudah dikonfirmasi dan siap diambil.
            Kode QR dan instruksi pickup tersedia di bawah.
          </>
        )}
      </p>
      <p className="checkout-result-body checkout-result-body--muted">
        {order.customer_email
          ? <>Bukti pembayaran telah dikirim ke <strong>{order.customer_email}</strong>.</>
          : 'Simpan nomor invoice Anda sebagai referensi.'}
      </p>

      {pickupCode && (
        <section className="checkout-result-pickup">
          <p className="checkout-result-pickup-label">Kode Pickup Anda</p>
          <p className="checkout-result-pickup-code">{pickupCode.code}</p>
          <p className="checkout-result-pickup-hint">
            Tunjukkan QR code ini saat mengambil barang di toko kami.
          </p>
          <div className="checkout-result-qr">
            <QRCodeCanvas payload={normalizeQrPayload(pickupCode.qr_payload)} />
          </div>
        </section>
      )}

      <section className="checkout-result-summary">
        <p className="checkout-result-summary-label">Ringkasan Pesanan</p>
        <p className="checkout-result-invoice">Invoice: <strong>{order.invoice_number}</strong></p>
        <ul className="checkout-result-items">
          {order.order_items?.map((item, i) => (
            <li key={i} className="checkout-result-item">
              <span className="checkout-result-item-name">{item.product_name}</span>
              <span className="checkout-result-item-qty">x{item.quantity}</span>
              <span className="checkout-result-item-price">{IDR.format(item.line_total_idr)}</span>
            </li>
          ))}
        </ul>
        <div className="checkout-result-total">
          <span>Total Dibayar</span>
          <strong>{IDR.format(order.total_amount_idr)}</strong>
        </div>
      </section>

      <div className="checkout-result-actions">
        <Link to="/my-orders" className="checkout-result-cta-secondary">
          Lihat Semua Pesanan
        </Link>
        <Link to="/" className="checkout-result-cta">Lanjutkan Belanja</Link>
      </div>
    </div>
  );
}
