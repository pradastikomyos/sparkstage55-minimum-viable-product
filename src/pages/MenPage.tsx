import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { ShopHeader } from '../components/layout/ShopHeader';
import { WomenCategorySectionSkeleton } from '../components/ui/Skeletons';
import { CatalogState } from '../components/ui/CatalogState';
import { isSupabaseConfigured } from '../lib/supabase';
import { listProductsByCategory } from '../services/commerce';
import type { PublicProduct } from '../types/commerce';

type MenSection = {
  title: string;
  category: string;
  products: Array<{
    key: string;
    name: string;
    priceLabel: string;
    image: string;
    slug?: string;
  }>;
};

const SECTION_BLUEPRINT: Array<{ title: string; category: string }> = [
  { title: 'OUTERWEAR', category: 'MEN_OUTERWEAR' },
  { title: 'SHIRTS AND TOPS', category: 'MEN_TOPS' },
  { title: 'TROUSERS', category: 'MEN_TROUSERS' },
  { title: 'BAGS AND ACCESSORIES', category: 'MEN_ACCESSORIES' },
];

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function toSection(
  blueprint: (typeof SECTION_BLUEPRINT)[number],
  supabaseData: PublicProduct[] | undefined,
): MenSection {
  return {
    title: blueprint.title,
    category: blueprint.category,
    products: (supabaseData ?? []).map((product) => ({
      key: product.id,
      name: product.name,
      priceLabel: IDR.format(product.base_price_idr),
      image: product.product_images?.[0]?.image_url ?? '',
      slug: product.slug,
    })),
  };
}

export function MenPage() {
  useEffect(() => { document.title = 'Spark Stage - Men'; }, []);
  const queries = useQueries({
    queries: SECTION_BLUEPRINT.map((section) => ({
      queryKey: ['men-category', section.category],
      queryFn: () => listProductsByCategory(section.category, 24),
      enabled: isSupabaseConfigured,
      staleTime: 60_000,
    })),
  });

  const sections: MenSection[] = useMemo(
    () => SECTION_BLUEPRINT.map((blueprint, index) => toSection(blueprint, queries[index].data)),
    [queries],
  );

  const showSkeleton =
    isSupabaseConfigured && queries.every((query) => query.isLoading && !query.data);
  const hasAnyProducts = sections.some((section) => section.products.length > 0);
  const hasError = queries.some((query) => query.isError);

  return (
    <>
      <ShopHeader />
      <main className="shop-main">
        <section className="shop-hero">
          <h1>MEN</h1>
          <p>Ready-to-wear collection</p>
        </section>
        {showSkeleton ? (
          <WomenCategorySectionSkeleton rows={SECTION_BLUEPRINT.length} />
        ) : !isSupabaseConfigured ? (
          <CatalogState
            title="Catalog database is not configured"
            message="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load products."
          />
        ) : hasError ? (
          <CatalogState
            title="Catalog could not be loaded"
            message="Please check the Supabase connection and try again."
          />
        ) : !hasAnyProducts ? (
          <CatalogState
            title="No men products found"
            message="Add active products for the men categories in the database."
          />
        ) : (
          sections.map((section) => (
          <div key={section.category}>
            <section className="shop-divider"><h2>{section.title}</h2></section>
            <section className="product-grid product-grid-3">
              {section.products.map((product) =>
                product.slug ? (
                  <Link
                    to={`/product/${encodeURIComponent(product.slug)}`}
                    className="product-card"
                    key={product.key}
                  >
                    <div className="product-image">
                      <img src={product.image} alt={product.name} loading="lazy" />
                    </div>
                    <div className="product-info">
                      <p className="product-name">{product.name}</p>
                      <p className="product-price">{product.priceLabel}</p>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="product-card is-placeholder"
                    aria-disabled="true"
                    data-ui="placeholder"
                    key={product.key}
                  >
                    <div className="product-image">
                      <img src={product.image} alt={product.name} loading="lazy" />
                    </div>
                    <div className="product-info">
                      <p className="product-name">{product.name}</p>
                      <p className="product-price">{product.priceLabel}</p>
                    </div>
                  </button>
                ),
              )}
            </section>
          </div>
          ))
        )}
      </main>
    </>
  );
}
