/**
 * InventorySection — self-contained admin page for product inventory.
 *
 * Owns:
 *  - products TanStack Query
 *  - selectedProductId state
 *  - productForm state
 *  - createProduct / updateStatus / updateStock mutations
 *
 * Rendered by AdminPage when tab === 'inventory'.
 */

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdminBreadcrumb,
  AdminProductListPane,
  InventoryDetailCard,
  ProductFormCard,
} from '../../components/admin';
import {
  createProduct,
  listAdminOrders,
  listAdminProducts,
  updateProductStatus,
  updateVariantStock,
} from '../../services/commerce';
import type { AdminProduct, ProductFormInput } from '../../types/commerce';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const initialForm: ProductFormInput = {
  name: '',
  slug: '',
  sku: '',
  description: '',
  category: 'CLOTHING',
  status: 'active',
  priceIdr: 0,
  stockQuantity: 0,
  imageUrl: '',
};

type InventorySectionProps = {
  /** Whether the parent auth guard has confirmed admin role. */
  isReady: boolean;
};

export function InventorySection({ isReady }: InventorySectionProps) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormInput>(initialForm);

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: listAdminProducts,
    enabled: isReady,
  });

  const selectedProduct = useMemo(
    () =>
      productsQuery.data?.find((p) => p.id === selectedProductId) ??
      productsQuery.data?.[0],
    [productsQuery.data, selectedProductId],
  );

  const activeCount = useMemo(
    () => productsQuery.data?.filter((p) => p.status === 'active').length ?? 0,
    [productsQuery.data],
  );

  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: listAdminOrders,
    enabled: isReady,
    staleTime: 30_000,
  });

  const pendingPickupCount = useMemo(
    () => ordersQuery.data?.filter((o) => o.status === 'pending_pickup').length ?? 0,
    [ordersQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      setProductForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ productId, status }: { productId: string; status: 'draft' | 'active' | 'archived' }) =>
      updateProductStatus(productId, status),
    onMutate: async ({ productId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products'] });
      const prev = queryClient.getQueryData<AdminProduct[]>(['admin-products']);
      queryClient.setQueryData<AdminProduct[]>(['admin-products'], (old) =>
        old?.map((p) => (p.id === productId ? { ...p, status } : p)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['admin-products'], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const stockMutation = useMutation({
    mutationFn: ({ variantId, stockQuantity }: { variantId: string; stockQuantity: number }) =>
      updateVariantStock(variantId, stockQuantity),
    onMutate: async ({ variantId, stockQuantity }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products'] });
      const prev = queryClient.getQueryData<AdminProduct[]>(['admin-products']);
      queryClient.setQueryData<AdminProduct[]>(['admin-products'], (old) =>
        old?.map((p) => ({
          ...p,
          product_variants: p.product_variants?.map((v) =>
            v.id === variantId ? { ...v, stock_quantity: stockQuantity } : v,
          ),
        })),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['admin-products'], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate(productForm);
  };

  const scrollToAddForm = () =>
    document.getElementById('admin-add-product')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <AdminProductListPane
        products={productsQuery.data}
        selectedProductId={selectedProduct?.id}
        activeCount={activeCount}
        pendingPickupCount={pendingPickupCount}
        isLoading={productsQuery.isLoading}
        onRefresh={() => productsQuery.refetch()}
        onSelectProduct={setSelectedProductId}
        onAddProduct={scrollToAddForm}
        formatCurrency={(v) => currency.format(v)}
      />

      <section className="admin-detail-pane">
        <AdminBreadcrumb currentView="inventory" />
        <InventoryDetailCard
          product={selectedProduct}
          onStockChange={(variantId, stockQuantity) =>
            stockMutation.mutate({ variantId, stockQuantity })
          }
          onStatusChange={(productId, status) =>
            statusMutation.mutate({ productId, status })
          }
          onImagesChange={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
          onBack={() => setSelectedProductId(null)}
          formatCurrency={(v) => currency.format(v)}
        />

        <section className="admin-content-grid" id="admin-add-product">
          <ProductFormCard
            form={productForm}
            error={createMutation.error}
            isPending={createMutation.isPending}
            onChange={setProductForm}
            onSubmit={handleSubmit}
          />
        </section>
      </section>
    </>
  );
}
