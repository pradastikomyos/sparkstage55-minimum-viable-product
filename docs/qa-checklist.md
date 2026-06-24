# Visual / Manual QA Checklist

## Account Routes (`/my-orders`, `/my-orders/:invoice`)
- [ ] Header shows back arrow on `/my-orders` (mode="back-home")
- [ ] Header shows hamburger menu on `/my-orders/:invoice` (mode="menu")
- [ ] Hamburger menu click opens mega menu / navigation panel
- [ ] Logo centered in header on both pages
- [ ] Search button ("CARI") works and opens search overlay
- [ ] Sidebar navigation renders (My Orders, Settings, etc.)
- [ ] Sidebar group expand/collapse works
- [ ] Tabs (Menunggu Pembayaran / Siap Diambil / Selesai) render and switch correctly
- [ ] Tab active state has underline indicator
- [ ] Order cards render with invoice, customer, date, total, status
- [ ] Pickup QR code renders for ready orders
- [ ] "Lihat Detail" link navigates to detail page
- [ ] Footer renders with language selector, links, copyright
- [ ] Language active state (BAHASA INDONESIA) is bold
- [ ] Page is scrollable and not clipped

## Product Page (`/product/:slug`)
- [ ] Product header renders with back arrow, logo, utility links (CARI, LOG IN, BANTUAN, KERANJANG)
- [ ] Back arrow navigates to previous page
- [ ] Utility links are clickable and not blocked by `pointer-events: none`
- [ ] Image gallery renders full-height images in left column
- [ ] Multiple images stack vertically
- [ ] Right column is sticky on desktop
- [ ] Product title is small (~15px), NOT huge (not 80px/64px)
- [ ] Product price displays correctly
- [ ] SKU displays if available
- [ ] Size picker renders when variants exist
- [ ] Size selection highlights selected size (black bg)
- [ ] Sold-out sizes are dimmed and not clickable
- [ ] "PILIH UKURAN" / "TAMBAH" button renders
- [ ] Add to cart works for authenticated users
- [ ] Add to cart redirects to login for unauthenticated users
- [ ] Product description renders
- [ ] Expandable section buttons render (LENGKAPI TAMPILAN, UKURAN PRODUK, etc.)
- [ ] Product page builds successfully
- [ ] Title does NOT change size at tablet/mobile breakpoints (stays 15px)

## Global / Cross-Route
- [ ] No `zara-*` CSS classes referenced in source (run `npm run check:architecture`)
- [ ] Navigating from `/product/:slug` to `/my-orders` does NOT break header layout
- [ ] Navigating from `/my-orders/:invoice` to `/product/:slug` does NOT break header layout
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes (known hugeicons warnings acceptable)

## Common Regressions to Watch
- [ ] Footer does not appear on pages where it shouldn't (AccountLayout does NOT render SiteFooter; StorefrontLayout does)
- [ ] Account page does not inherit `pointer-events: none` from PDP header
- [ ] Back/home link in AccountHeader uses native `<a href="/">` and navigates correctly
- [ ] MCP / third-party overlays (cart drawer, search overlay) open correctly from all routes
