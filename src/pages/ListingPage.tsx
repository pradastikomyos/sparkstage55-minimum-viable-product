import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pause, Play } from '@phosphor-icons/react';
import { useUIState } from '../components/ui/UIStateContext';
import { ListingHeader } from '../components/layout/ListingHeader';
import { ListingPageSkeleton } from '../components/ui/Skeletons';
import { CatalogState } from '../components/ui/CatalogState';
import { listingHeroVideo } from '../data/heroSections';
import { isSupabaseConfigured } from '../lib/supabase';
import { listProductsByCategory } from '../services/commerce';
import { useSiteAssets } from '../hooks/useSiteAssets';
import type { ListingProduct } from '../types/catalog';
import type { PublicProduct } from '../types/commerce';

type ListingKind = 'men' | 'women';

const LISTING_CATEGORY: Record<ListingKind, string> = {
  men: 'MEN_NEW_ARRIVALS',
  women: 'WOMEN_NEW_ARRIVALS',
};

/**
 * Map a Supabase `PublicProduct` into the lightweight `ListingProduct` shape
 * the grid already renders. Color swatches are not in Supabase yet; we fall
 * back to a single neutral swatch so the UI stays stable.
 */
function toListingProduct(product: PublicProduct): ListingProduct {
  const image = product.product_images?.[0]?.image_url ?? '';
  const note = product.description ?? 'NEW';
  return {
    name: product.name,
    note,
    image,
    alt: product.product_images?.[0]?.alt ?? product.name,
  };
}

export function ListingPage({ kind }: { kind: ListingKind }) {
  const { skeletonMode } = useUIState();
  const isMen = kind === 'men';

  useEffect(() => {
    document.title = isMen
      ? 'New-in Apparel for Men | Spark Stage'
      : 'New Arrivals | Spark Stage';
  }, [isMen]);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { assetMap, isReady: assetsReady } = useSiteAssets();
  const heroVideoSrc = assetsReady
    ? (isMen
        ? (assetMap['men.new-arrivals.hero.video'] ?? listingHeroVideo.men)
        : (assetMap['women.new-arrivals.hero.video'] ?? listingHeroVideo.women))
    : null;
  const heroVideoType = heroVideoSrc?.endsWith('.mp4') ? 'video/mp4' : 'video/webm';

  const productsQuery = useQuery({
    queryKey: ['listing', kind],
    queryFn: () => listProductsByCategory(LISTING_CATEGORY[kind]),
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  });

  const products: ListingProduct[] = useMemo(() => {
    return (productsQuery.data ?? []).map(toListingProduct);
  }, [productsQuery.data]);

  const productSlugByName = useMemo(() => {
    const map = new Map<string, string>();
    productsQuery.data?.forEach((product) => map.set(product.name, product.slug));
    return map;
  }, [productsQuery.data]);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return undefined;

    const handlePlay = () => setIsHeroPaused(false);
    const handlePause = () => setIsHeroPaused(true);

    setIsHeroPaused(video.paused);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [isMen]);

  const toggleHeroPlayback = async () => {
    const video = heroVideoRef.current;
    if (!video) return;

    // Sync state with user intent immediately so the UI reflects the click
    // even if the underlying <video> does not fire a `pause`/`play` event
    // reliably (e.g. headless chromium with certain WebM codecs).
    if (video.paused) {
      setIsHeroPaused(false);
      try {
        await video.play();
      } catch {
        setIsHeroPaused(true);
      }
    } else {
      video.pause();
      setIsHeroPaused(true);
    }
  };

  if (skeletonMode || (isSupabaseConfigured && productsQuery.isLoading)) {
    return (
      <>
        <ListingHeader />
        <ListingPageSkeleton />
      </>
    );
  }

  const productCount = products.length;
  const countLabel = productCount;
  const hasCatalogError = productsQuery.isError;
  const showEmptyCatalog = isSupabaseConfigured && !productsQuery.isLoading && !hasCatalogError && productCount === 0;

  return (
    <div className="listing-page">
      <ListingHeader />

      {/* Filter Drawer — Coming Soon */}
      <div className={`filter-drawer-container ${isFilterOpen ? 'active' : ''}`}>
        <div className="filter-drawer-scrim" onClick={() => setIsFilterOpen(false)} />
        <div className="filter-drawer">
          <div className="filter-drawer-header">
            <h2>FILTERS</h2>
            <button className="filter-close-btn" onClick={() => setIsFilterOpen(false)}>&times;</button>
          </div>
          <div className="filter-drawer-body">
            <div className="filter-group">
              <h3 className="filter-group-title">Category</h3>
              <div className="filter-options">
                <label className="filter-option"><input type="checkbox" disabled /> Clothing</label>
                <label className="filter-option"><input type="checkbox" disabled /> Shoes</label>
                <label className="filter-option"><input type="checkbox" disabled /> Bags</label>
                <label className="filter-option"><input type="checkbox" disabled /> Accessories</label>
              </div>
            </div>
            <div className="filter-group">
              <h3 className="filter-group-title">Color</h3>
              <div className="filter-options">
                <label className="filter-option"><input type="checkbox" disabled /> Black</label>
                <label className="filter-option"><input type="checkbox" disabled /> White</label>
                <label className="filter-option"><input type="checkbox" disabled /> Beige</label>
              </div>
            </div>
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
              Coming soon
            </p>
          </div>
        </div>
      </div>

      <main className="listing-main">
        <div className="listing-toolbar">
          <p>{countLabel} PRODUCTS</p>
          <div className="listing-actions">
            <button type="button" onClick={() => setIsFilterOpen(true)}>FILTERS</button>
            <span aria-hidden="true">&middot;</span>
            <button type="button" disabled title="Coming soon">SORT BY</button>
          </div>
        </div>

        <section className="listing-hero">
          {heroVideoSrc ? (
            <video ref={heroVideoRef} autoPlay muted loop playsInline className="listing-hero-media">
              <source src={heroVideoSrc} type={heroVideoType} />
            </video>
          ) : (
            <div className="listing-hero-media skeleton-media" aria-hidden="true" />
          )}
          <button className="listing-pause" type="button" data-state={isHeroPaused ? 'paused' : 'playing'} aria-label={isHeroPaused ? 'Play video' : 'Pause video'} onClick={toggleHeroPlayback}>
            {isHeroPaused ? <Play weight="fill" size={18} /> : <Pause weight="fill" size={18} />}
          </button>
        </section>

        <section className="listing-intro">
          <h1>{isMen ? "Men's New Arrivals" : "Women's New Arrivals"}</h1>
          <p>{isMen
            ? "Prada's new menswear arrivals bring a decisive shift: a free, modern attitude that breaks the rules, evoking boundless, instinctive elegance."
            : "Explore Prada's new womenswear arrivals: surprising pieces come together with ease, shaping a fluid style that adapts to the wearer and fits every moment."
          }</p>
        </section>

        {!isSupabaseConfigured ? (
          <CatalogState
            title="Database katalog belum dikonfigurasi"
            message="Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk memuat produk."
          />
        ) : hasCatalogError ? (
          <CatalogState
            title="Gagal memuat produk terbaru"
            message="Periksa koneksi Supabase dan coba lagi."
          />
        ) : showEmptyCatalog ? (
          <CatalogState
            title={`Belum ada produk ${isMen ? 'pria' : 'wanita'} terbaru`}
            message={`Tambahkan produk aktif ke ${LISTING_CATEGORY[kind]}.`}
          />
        ) : (
          <section className="prada-product-grid">
            {products.map((product) => {
            const slug = productSlugByName.get(product.name);
          const href = slug ? `/product/${encodeURIComponent(slug)}` : '/';
            return (
              <Link to={href} className="prada-product-card" key={product.name}>
                <div className="prada-product-image">
                  <img src={product.image} alt={product.alt ?? product.name} loading="lazy" />
                </div>
                <div className="prada-product-info">
                  <p>{product.name}</p>
                  {product.colors && (
                    <div className="prada-color-swatches">
                      {product.colors.map((color) => (
                        <div key={color} className="prada-swatch" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
