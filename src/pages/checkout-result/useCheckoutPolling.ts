import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, type UseQueryResult } from '@tanstack/react-query';
import { reconcileDokuPayment, type CheckoutResultResponse } from '../../services/checkout';
import {
  CHECKOUT_FALLBACK_AFTER_MS,
  getCheckoutPollingState,
  getDbPollOffset,
  getReconcileOffset,
  shouldReconcileOnActivation,
  shouldReconcileImmediatelyOnReturn,
} from './paymentPollingPolicy';

type OrderQueryResult = Pick<UseQueryResult<CheckoutResultResponse, Error>, 'data' | 'isLoading' | 'isFetching' | 'refetch'>;

export function useCheckoutPolling({
  invoice,
  orderQuery,
  providerReturned,
}: {
  invoice: string | null;
  orderQuery: OrderQueryResult;
  providerReturned: boolean;
}) {
  const [pollCount, setPollCount] = useState(0);
  const [reconcileAttemptCount, setReconcileAttemptCount] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [fallbackReached, setFallbackReached] = useState(false);
  const [fallbackCycle, setFallbackCycle] = useState(0);
  const observationStartedAtRef = useRef(Date.now());
  const dbPollingStartedAtRef = useRef(Date.now());
  const lastFocusRefreshAtRef = useRef(0);
  const reconcileInFlightRef = useRef(false);
  const immediateReturnReconciledInvoiceRef = useRef<string | null>(null);
  const { data, isLoading, isFetching, refetch } = orderQuery;
  const pollingState = getCheckoutPollingState(data?.kind, data?.order?.status);
  const isPending = pollingState === 'pending';

  useEffect(() => {
    const startedAt = Date.now();
    observationStartedAtRef.current = startedAt;
    dbPollingStartedAtRef.current = startedAt;
    setPollCount(0);
    setReconcileAttemptCount(0);
    setLastCheckedAt(null);
    setFallbackReached(false);
  }, [invoice]);

  useEffect(() => {
    setFallbackReached(false);
    if (!invoice) return;
    const timeoutId = window.setTimeout(() => setFallbackReached(true), CHECKOUT_FALLBACK_AFTER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [invoice, fallbackCycle]);

  // Absolute offsets keep unrelated renders from postponing checks indefinitely.
  useEffect(() => {
    if (!invoice || !isPending || isLoading || isFetching) return;
    const offset = getDbPollOffset(pollCount);
    if (offset === null) return;
    const dueAt = dbPollingStartedAtRef.current + offset;
    const timeoutId = window.setTimeout(() => {
      setPollCount((current) => current + 1);
      void refetch().finally(() => setLastCheckedAt(new Date()));
    }, Math.max(0, dueAt - Date.now()));

    return () => window.clearTimeout(timeoutId);
  }, [invoice, isPending, isLoading, isFetching, pollCount, refetch]);

  const reconcileMutation = useMutation({
    mutationFn: () => reconcileDokuPayment({ invoice_number: invoice ?? '' }),
    onSettled: async () => {
      reconcileInFlightRef.current = false;
      setLastCheckedAt(new Date());
      if (!invoice) return;
      await refetch();
    },
  });
  const reconcileIsPending = reconcileMutation.isPending;

  // A DOKU callback reloads this page, so local timers start from zero again.
  // Verify once immediately on provider return. The backend operation is
  // authenticated and idempotent; PENDING still follows the bounded schedule.
  useEffect(() => {
    const alreadyAttempted = immediateReturnReconciledInvoiceRef.current === invoice;
    if (!invoice || !shouldReconcileImmediatelyOnReturn(
      providerReturned,
      isPending,
      isLoading,
      reconcileInFlightRef.current,
      alreadyAttempted,
    )) return;

    immediateReturnReconciledInvoiceRef.current = invoice;
    reconcileInFlightRef.current = true;
    setReconcileAttemptCount((current) => current + 1);
    reconcileMutation.mutate();
  }, [invoice, providerReturned, isPending, isLoading, reconcileMutation.mutate]);

  // Provider reconciliation starts at 60 seconds and retries on a bounded
  // absolute schedule, including after transient failures or PENDING responses.
  useEffect(() => {
    if (!invoice || !isPending || reconcileIsPending) return;
    const offset = getReconcileOffset(reconcileAttemptCount);
    if (offset === null) return;
    const dueAt = observationStartedAtRef.current + offset;
    const timeoutId = window.setTimeout(() => {
      if (reconcileInFlightRef.current) return;
      reconcileInFlightRef.current = true;
      setReconcileAttemptCount((current) => current + 1);
      reconcileMutation.mutate();
    }, Math.max(0, dueAt - Date.now()));

    return () => window.clearTimeout(timeoutId);
  }, [invoice, isPending, reconcileAttemptCount, reconcileIsPending, reconcileMutation.mutate]);

  // Background tabs throttle timers, so refresh when the customer returns.
  useEffect(() => {
    if (!invoice || !isPending) return;
    const refreshWhenActive = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 1_000) return;
      lastFocusRefreshAtRef.current = now;

      // DOKU Checkout runs above this page. Browsers may throttle the 60-second
      // reconciliation timer while that hosted UI has focus. When the customer
      // returns, immediately run any provider check that is already due.
      if (shouldReconcileOnActivation(
        now - observationStartedAtRef.current,
        reconcileAttemptCount,
        reconcileInFlightRef.current,
      )) {
        reconcileInFlightRef.current = true;
        setReconcileAttemptCount((current) => current + 1);
        reconcileMutation.mutate();
        return;
      }

      void refetch().finally(() => setLastCheckedAt(new Date()));
    };

    window.addEventListener('focus', refreshWhenActive);
    document.addEventListener('visibilitychange', refreshWhenActive);
    return () => {
      window.removeEventListener('focus', refreshWhenActive);
      document.removeEventListener('visibilitychange', refreshWhenActive);
    };
  }, [invoice, isPending, reconcileAttemptCount, reconcileMutation.mutate, refetch]);

  const resetPolling = useCallback(() => {
    dbPollingStartedAtRef.current = Date.now();
    setPollCount(0);
    setFallbackCycle((current) => current + 1);
  }, []);

  return {
    pollCount,
    reconcileAttemptCount,
    lastCheckedAt,
    isPollingExhausted: isPending && fallbackReached,
    reconcileMutation,
    resetPolling,
  };
}
