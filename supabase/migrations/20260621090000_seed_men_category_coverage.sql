-- Ensure storefront categories used by MenPage have database-backed demo data.
-- These rows make /men render from Supabase instead of React runtime fallback data.

with product_seed as (
  insert into public.products (name, slug, sku, description, category, status, base_price_idr, sort_order)
  values
    ('Suede bomber jacket', 'men-outerwear-suede-bomber-jacket', 'MOU001', 'Suede bomber jacket with a clean ribbed trim.', 'MEN_OUTERWEAR', 'active', 49900000, 10),
    ('Bull denim zipper shirt', 'men-outerwear-bull-denim-zipper-shirt', 'MOU002', 'Bull denim zipper shirt with a clean workwear edge.', 'MEN_OUTERWEAR', 'active', 7290000, 20),

    ('Striped cotton pique polo shirt', 'men-tops-striped-cotton-pique-polo-shirt', 'MTO001', 'Cotton pique polo shirt with striped details.', 'MEN_TOPS', 'active', 5290000, 10),
    ('Sunglasses with the iconic metal plaque', 'men-accessories-sunglasses-iconic-metal-plaque', 'MAC001', 'Sunglasses with the iconic metal plaque. Virtual try-on ready.', 'MEN_ACCESSORIES', 'active', 6290000, 10),
    ('Prada Route canvas and leather tote bag', 'men-accessories-prada-route-canvas-leather-tote-bag', 'MAC002', 'Canvas and leather tote bag with a minimal silhouette.', 'MEN_ACCESSORIES', 'active', 24900000, 20),
    ('Prada Explore leather shoulder bag', 'men-accessories-prada-explore-leather-shoulder-bag', 'MAC003', 'Explore leather shoulder bag, compact and travel-ready.', 'MEN_ACCESSORIES', 'active', 27900000, 30),

    ('Old denim five-pocket jeans', 'men-trousers-old-denim-five-pocket-jeans', 'MTR001', 'Vintage denim five-pocket jeans, straight fit.', 'MEN_TROUSERS', 'active', 6890000, 10)
  on conflict (sku) do update
  set
    name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    category = excluded.category,
    status = excluded.status,
    base_price_idr = excluded.base_price_idr,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning id, sku, name, base_price_idr
)
insert into public.product_variants (product_id, name, sku, price_idr, stock_quantity)
select id, name, sku, base_price_idr, 25
from product_seed
on conflict (sku) do update
set
  name = excluded.name,
  price_idr = excluded.price_idr,
  stock_quantity = excluded.stock_quantity,
  updated_at = now();

delete from public.product_images
where product_id in (
  select id
  from public.products
  where sku like 'MOU%' or sku like 'MTO%' or sku like 'MAC%' or sku like 'MTR%'
);

insert into public.product_images (product_id, image_url, alt, sort_order)
select p.id, image_map.image_url, p.name, 0
from public.products p
join (values
  ('MOU001', '/assets/reference/prada/men-new-arrivals/products/suede-bomber-jacket.jpg'),
  ('MOU002', '/assets/reference/prada/men-new-arrivals/products/bull-denim-zipper-shirt.jpg'),
  ('MTO001', '/assets/reference/prada/men-new-arrivals/products/striped-cotton-pique-polo-shirt.jpg'),
  ('MAC001', '/assets/reference/prada/men-new-arrivals/products/sunglasses-iconic-metal-plaque.jpg'),
  ('MAC002', '/assets/reference/prada/men-new-arrivals/products/prada-route-canvas-leather-tote-bag.jpg'),
  ('MAC003', '/assets/reference/prada/men-new-arrivals/products/prada-explore-leather-shoulder-bag.jpg'),
  ('MTR001', '/assets/reference/prada/men-new-arrivals/products/old-denim-five-pocket-jeans.jpg')
) as image_map(sku, image_url) on image_map.sku = p.sku;
