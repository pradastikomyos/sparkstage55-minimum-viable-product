/**
 * BopisSection — self-contained admin page for BOPIS pickup verification.
 */

import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminDetailTop, OrderPreviewModal, PickupVerificationCard } from '../../components/admin';
import { QrScannerModal } from '../../components/admin/QrScannerModal';
import { getOrderByPickupCode, normalizePickupCodeInput, verifyPickupCode } from '../../services/commerce';

export function BopisSection() {
  const queryClient = useQueryClient();
  const [pickupCode, setPickupCode] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ['bopis-order', pickupCode],
    queryFn: () => getOrderByPickupCode(pickupCode),
    enabled: pickupCode.length >= 3,
    retry: false,
    staleTime: 0,
  })

  useEffect(() => {
    if (orderQuery.data) {
      setIsPreviewOpen(true);
      setPreviewError(null);
    }
  }, [orderQuery.data]);

  const pickupMutation = useMutation({
    mutationFn: verifyPickupCode,
    onSuccess: () => {
      setSuccessMessage('Barang berhasil diserahkan.');
      setPickupCode('');
      setIsScannerOpen(false);
      setIsPreviewOpen(false);
      setPreviewError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['bopis-order'] });
    },
    onError: (error) => {
      setPreviewError(error instanceof Error ? error.message : 'Gagal memverifikasi barang');
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    setPreviewError(null);
    if (orderQuery.isLoading || pickupMutation.isPending) return;
    if (orderQuery.data) {
      setIsPreviewOpen(true);
      return;
    }
    if (pickupCode.length >= 3) {
      setPreviewError('Kode pickup tidak ditemukan. Pastikan kode sudah benar.');
    }
  };

  const handleConfirmPickup = () => {
    const order = orderQuery.data;
    if (!order || pickupMutation.isPending) return;
    if (String(order.payment_status || '').toLowerCase() !== 'paid') {
      setPreviewError('Pembayaran belum dikonfirmasi');
      return;
    }
    if (String(order.status || '').toLowerCase() === 'picked_up') {
      setPreviewError('Barang sudah diambil sebelumnya');
      return;
    }
    if (String(order.status || '').toLowerCase() !== 'pending_pickup') {
      setPreviewError(`Pesanan tidak siap pickup (status: ${order.status})`);
      return;
    }
    setPreviewError(null);
    pickupMutation.mutate(pickupCode);
  };

  return (
    <section className="admin-detail-pane">
      <AdminDetailTop view="bopis" />

      {successMessage ? <div className="admin-bopis-feedback admin-bopis-feedback--success">{successMessage}</div> : null}

      <QrScannerModal
        isOpen={isScannerOpen}
        onScan={(code) => {
          setPickupCode(normalizePickupCodeInput(code));
          setSuccessMessage(null);
          setPreviewError(null);
          setIsScannerOpen(false);
        }}
        onClose={() => setIsScannerOpen(false)}
      />

      <OrderPreviewModal
        order={orderQuery.data ?? null}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmPickup}
        isConfirming={pickupMutation.isPending}
        errorMessage={previewError}
      />

      <PickupVerificationCard
        pickupCode={pickupCode}
        error={(pickupMutation.error ?? orderQuery.error ?? null) as Error | null}
        isPending={pickupMutation.isPending}
        isVerified={Boolean(pickupMutation.data)}
        onPickupCodeChange={(value) => {
          setPickupCode(normalizePickupCodeInput(value));
          setSuccessMessage(null);
          setPreviewError(null);
        }}
        onSubmit={handleSubmit}
        onOpenScanner={() => setIsScannerOpen(true)}
        orderDetail={orderQuery.data ?? null}
        isLoadingOrder={orderQuery.isLoading}
      />
    </section>
  )
}
