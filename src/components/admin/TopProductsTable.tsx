import { formatIdr } from '../../services/reports';
import type { TopProductRow } from '../../services/reports';
import { MetricSkeleton } from './AdminSkeleton';

type TopProductsTableProps = {
  products: TopProductRow[];
  isLoading: boolean;
};

export function TopProductsTable({ products, isLoading }: TopProductsTableProps) {
  if (isLoading) {
    return (
      <div className="admin-reports-section">
        <p className="admin-eyebrow">Produk Terlaris</p>
        <div className="admin-panel" style={{ padding: 20 }}>
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="admin-reports-section">
        <p className="admin-eyebrow">Produk Terlaris</p>
        <div className="admin-top-empty">Belum ada data penjualan</div>
      </div>
    );
  }

  return (
    <div className="admin-reports-section">
      <p className="admin-eyebrow">Produk Terlaris</p>
      <div className="admin-top-table-wrap">
        <table className="admin-top-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>Rank</th>
              <th>Produk</th>
              <th>SKU</th>
              <th style={{ textAlign: 'right' }}>Qty Terjual</th>
              <th style={{ textAlign: 'right' }}>Omzet</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={`${p.sku}-${i}`}>
                <td>
                  <span className={`admin-top-rank${i < 3 ? ` admin-top-rank--top${i + 1}` : ''}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="admin-top-product-name">{p.productName}</td>
                <td className="admin-top-sku">{p.sku}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.quantitySold}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatIdr(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
