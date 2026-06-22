import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../store/uiStore';
import { PdpSkeleton } from '../components/ui/Skeletons';
import { CatalogState } from '../components/ui/CatalogState';
import { isSupabaseConfigured } from '../lib/supabase';
import { getProductBySlug } from '../services/commerce';
import { addItemToCart, LOGIN_REQUIRED } from '../services/cart';
import { useCartSummary } from '../hooks/useCartSummary';
import type { PublicProductWithVariants } from '../services/commerce';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type ResolvedProduct = {
  id: string;
  name: string;
  description: string;
  priceIdr: number;
  priceLabel: string;
  sku: string;
  image: string;
  alt: string;
};

export function ProductPage() {
  const { setSearchOpen, setCartDrawerOpen } = useUIStore();
  const queryClient = useQueryClient();
  const cartSummary = useCartSummary();
  const navigate = useNavigate();
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Support both /product/:slug (new) and ?slug= / ?name= (legacy redirects)
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const legacySlug = searchParams.get('slug');
  const legacyName = searchParams.get('name') ?? searchParams.get('id');

  const fallbackSlug = paramSlug ?? legacySlug ?? (legacyName ? slugify(legacyName) : null);

  const productQuery = useQuery({
    queryKey: ['product-detail', fallbackSlug],
    queryFn: () => getProductBySlug(fallbackSlug as string),
    enabled: isSupabaseConfigured && Boolean(fallbackSlug),
  });

  // Variants from Supabase — sorted S/M/L/XL
  const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL'];
  const variants = useMemo(() => {
    const raw = (productQuery.data as PublicProductWithVariants | null)?.product_variants ?? [];
    return [...raw].sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.name);
      const bi = SIZE_ORDER.indexOf(b.name);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [productQuery.data]);

  const hasVariants = variants.length > 1;
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  const galleryImages = useMemo(() => {
    return [...((productQuery.data as PublicProductWithVariants | null)?.product_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [productQuery.data]);

  const resolved: ResolvedProduct | null = useMemo(() => {
    if (productQuery.data) {
      const source = productQuery.data;
      return {
        id: source.id,
        name: source.name,
        description:
          source.description ??
          'A modern wardrobe essential. Crafted with precision to offer both comfort and refined elegance.',
        priceIdr: source.base_price_idr,
        priceLabel: IDR.format(source.base_price_idr),
        sku: source.sku,
        image: source.product_images?.[0]?.image_url ?? '',
        alt: source.product_images?.[0]?.alt ?? source.name,
      };
    }

    return null;
  }, [productQuery.data]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!resolved?.id) throw new Error('NO_PRODUCT_ID');
      // If product has size variants, require selection
      if (hasVariants && !selectedVariantId) throw new Error('SIZE_REQUIRED');
      await addItemToCart({
        productId: resolved.id,
        variantId: selectedVariantId ?? undefined,
        quantity: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartSummary.userId] });
      queryClient.invalidateQueries({ queryKey: ['cart-summary', cartSummary.userId] });
      setCartDrawerOpen(true);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === LOGIN_REQUIRED) {
        const redirect = window.location.pathname + window.location.search;
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      if (error instanceof Error && error.message === 'SIZE_REQUIRED') {
        setAddError('Pilih ukuran sebelum menambahkan ke keranjang.');
        return;
      }
      setAddError(error instanceof Error ? error.message : 'Gagal menambahkan ke keranjang.');
    },
  });

  const canAdd = Boolean(resolved?.id) && isSupabaseConfigured;
  const needsSizeSelection = hasVariants && !selectedVariantId;
  const addDisabled = !canAdd || addMutation.isPending;
  const addLabel = addMutation.isPending ? 'MENAMBAHKAN...' : needsSizeSelection ? 'PILIH UKURAN' : 'TAMBAH';
  const addHint = canAdd
    ? undefined
    : 'Tambah ke keranjang hanya tersedia jika Supabase aktif dan produk berasal dari katalog.';

  const showSkeleton =
    isSupabaseConfigured && productQuery.isLoading && !productQuery.data;
  const stateMessage = !isSupabaseConfigured
    ? {
        title: 'Database katalog belum dikonfigurasi',
        message: 'Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk memuat produk.',
      }
    : productQuery.isError
      ? {
          title: 'Gagal memuat produk',
          message: 'Periksa koneksi Supabase dan coba lagi.',
        }
      : !fallbackSlug || (!productQuery.isLoading && !resolved)
        ? {
            title: 'Produk tidak ditemukan',
            message: 'Slug produk ini tidak cocok dengan produk aktif di database.',
          }
        : null;

  return (
    <div className="zara-pdp">
      <header className="zara-header">
        <div className="zara-header-left">
          <button className="zara-back-btn" onClick={() => navigate(-1)}>
            &#8592;
          </button>
        </div>
        <div className="zara-header-right">
          <button className="zara-utility-link" onClick={() => setSearchOpen(true)}>CARI</button>
          <div className="zara-utility-group">
            <Link className="zara-utility-link" to="/login">LOG IN</Link>
            <button className="zara-utility-link">BANTUAN</button>
            <button
              type="button"
              className="zara-utility-link"
              onClick={() => setCartDrawerOpen(true)}
            >
              KERANJANG ({cartSummary.itemCount})
            </button>
          </div>
        </div>
      </header>

      {showSkeleton ? (
        <PdpSkeleton />
      ) : stateMessage ? (
        <main className="zara-pdp-main">
          <CatalogState title={stateMessage.title} message={stateMessage.message} />
        </main>
      ) : (
        <main className="zara-pdp-main">
        <div className="zara-pdp-left">
          <div className="zara-image-gallery">
            {galleryImages.length > 0 ? (
              galleryImages.map((img, index) => (
                <div className="zara-image-item" key={`${img.image_url}-${index}`}>
                  <img src={img.image_url} alt={img.alt ?? resolved!.name} />
                </div>
              ))
            ) : (
              <div className="zara-image-item">
                {resolved!.image ? (
                  <img src={resolved!.image} alt={resolved!.alt} />
                ) : (
                  <span className="zara-product-meta">Gambar produk belum tersedia</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="zara-pdp-right">
          <div className="zara-product-info">
            <h1 className="zara-product-title">{resolved!.name.toUpperCase()}</h1>
            {resolved!.priceLabel ? <p className="zara-product-price">{resolved!.priceLabel}</p> : null}

            <hr className="zara-divider" />

            {resolved!.sku ? <p className="zara-product-meta">SKU {resolved!.sku}</p> : null}

            {/* Size picker — only shown when product has size variants */}
            {hasVariants && (
              <div className="pdp-size-picker">
                <p className="pdp-size-label">SIZE</p>
                <div className="pdp-size-options">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`pdp-size-btn${selectedVariantId === v.id ? ' is-selected' : ''}${v.stock_quantity === 0 ? ' is-sold-out' : ''}`}
                      disabled={v.stock_quantity === 0}
                      aria-pressed={selectedVariantId === v.id}
                      aria-label={`Size ${v.name}${v.stock_quantity === 0 ? ', sold out' : ''}`}
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setAddError(null);
                      }}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="zara-add-btn"
              disabled={addDisabled}
              aria-describedby={addHint ? 'pdp-add-hint' : undefined}
              title={addHint}
              onClick={() => {
                setAddError(null);
                addMutation.mutate();
              }}
            >
              {addLabel}
            </button>
            {addHint ? (
              <p id="pdp-add-hint" className="zara-product-meta" style={{ marginTop: '8px' }}>
                {addHint}
              </p>
            ) : null}
            {addError ? (
              <p className="zara-product-meta" style={{ marginTop: '8px', color: '#a00' }}>
                {addError}
              </p>
            ) : null}

            <div className="zara-product-description">
              <p>{resolved!.description}</p>
            </div>

            <div className="zara-expandable-section">
              <button>LENGKAPI TAMPILAN</button>
              <button>UKURAN PRODUK</button>
              <button>KOMPOSISI, PERAWATAN &amp; ASAL</button>
              <button>CEK KETERSEDIAAN TOKO</button>
            </div>
          </div>
        </div>
      </main>
      )}
    </div>
  );
}
