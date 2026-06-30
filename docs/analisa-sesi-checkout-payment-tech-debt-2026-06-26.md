# Analisa Sesi Checkout Payment dan Tech Debt - 26 Juni 2026

## Ringkasan

Sesi ini berfokus pada perbaikan alur checkout DOKU untuk mencegah payment gateway langsung terbuka saat user menekan tombol checkout dari cart. Alur baru menambahkan halaman review checkout terlebih dahulu, lalu payment gateway hanya dipanggil setelah user menekan tombol `Bayar via DOKU`.

Sesi ini juga memperbaiki fallback saat user membatalkan pembayaran, menutup DOKU, atau refresh browser ketika order masih `pending_payment`. Sebelumnya user dapat terlihat stuck di halaman verifikasi pembayaran. Sekarang halaman result memiliki fallback yang lebih eksplisit dengan opsi lanjut bayar, cek status, cek ulang, atau batalkan pesanan.

## Perubahan Utama

1. Menambahkan halaman `/checkout` sebagai tahap review sebelum payment gateway.
2. Mengubah tombol checkout di cart agar hanya navigate ke `/checkout`, bukan langsung membuat sesi DOKU.
3. Menambahkan UI checkout dua kolom: `Order Summary` dan `Delivery Options` BOPIS.
4. Menambahkan fallback UI di checkout result untuk pembayaran yang belum selesai.
5. Menambahkan tombol `Lanjutkan Pembayaran` dengan reuse `doku_payment_url`.
6. Menambahkan tombol `Batalkan Pesanan` untuk pending payment.
7. Menambahkan Edge Function `cancel-doku-order`.
8. Mengubah `get-checkout-result` agar mengembalikan `doku_payment_url` untuk owner order.
9. Menyelaraskan migration lokal dengan remote Supabase agar `supabase db push --dry-run` kembali bersih.
10. Deploy Edge Functions terkait ke Supabase.
11. Commit dan push ke `origin/main` untuk trigger redeploy Vercel.

## File Frontend Terkait

- `src/app/router.tsx`
- `src/components/cart/CartDrawer.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/pages/CheckoutResultPage.tsx`
- `src/pages/checkout-result/CheckoutResultContent.tsx`
- `src/pages/checkout-result/useCheckoutPolling.ts`
- `src/services/checkout.ts`
- `src/services/orders.ts`
- `public/styles/checkout.css`

## File Supabase Terkait

- `supabase/functions/cancel-doku-order/index.ts`
- `supabase/functions/get-checkout-result/index.ts`
- `supabase/migrations/20260513112546_fix_ambiguous_order_id_in_payment_event.sql`
- `supabase/migrations/20260621065953_seed_men_category_coverage.sql`
- `supabase/migrations/20260621070008_harden_pickup_verification.sql`

## Status Deploy

- Supabase CLI linked ke project `xyhdnprncjvhtdfyovpx`.
- `supabase db push --dry-run` berhasil dengan status remote database up to date.
- Edge Function `cancel-doku-order` berhasil dideploy versi 1.
- Edge Function `get-checkout-result` berhasil dideploy versi 2.
- Commit dibuat: `71bbc83 feat: add checkout review flow`.
- Commit sudah dipush ke `origin/main` untuk trigger redeploy Vercel.

## Verifikasi

- `npm run typecheck` berhasil.
- `npm run build` berhasil.
- Build masih mengeluarkan warning dari dependency `@hugeicons/core-free-icons` terkait `/*#__PURE__*/`, tetapi bukan error aplikasi.
- `supabase db push --dry-run` berhasil setelah migration drift dibereskan.
- `supabase functions list` menampilkan function baru `cancel-doku-order` aktif.

## Catatan Implementasi

### Checkout Review Page

Halaman `/checkout` mengambil cart aktif user, menampilkan ringkasan item, total, opsi BOPIS, pilihan lokasi toko statis, dan tombol `Bayar via DOKU`. Payment gateway baru dipanggil dari halaman ini.

### Pending Payment Fallback

Polling checkout result dipercepat dan fallback muncul setelah sekitar 20 detik atau setelah jumlah polling tertentu. Saat fallback tampil, user dapat:

- Melanjutkan pembayaran melalui DOKU URL yang tersimpan.
- Mengecek status pembayaran ke DOKU.
- Cek ulang halaman.
- Membatalkan pesanan pending.

### Cancel Pending Order

Function `cancel-doku-order` melakukan validasi user, ownership, dan status order. Cancel dilakukan dengan conditional update agar tidak overwrite order yang sudah paid. Setelah update berhasil, reservation inventory dilepas dan payment attempts pending diubah menjadi cancelled.

## Tech Debt

### 1. Atomic RPC Untuk Cancel Order

Cancel order saat ini sudah cukup aman untuk MVP, tetapi belum sepenuhnya atomic di satu transaksi database. Untuk production, disarankan membuat RPC Postgres seperti `cancel_pending_doku_order` dengan `SELECT ... FOR UPDATE`, validasi state, update order, release inventory, update payment attempts, dan audit event dalam satu transaction.

Risiko jika belum dilakukan:

- Ada peluang edge case race condition antar webhook, reconcile, dan cancel request.
- Logic transisi status tersebar di Edge Function dan SQL function.

### 2. State Machine Payment Terpusat

Saat ini beberapa function masih bisa mengubah status order/payment dari jalur berbeda. Untuk production, semua transisi penting sebaiknya lewat RPC/state machine terpusat.

Target ideal:

- `pending_payment -> pending_pickup` hanya lewat payment event paid.
- `pending_payment -> cancelled` hanya lewat cancel RPC.
- `pending_payment -> expired` hanya lewat expiry RPC.
- `pending_pickup -> picked_up` hanya lewat pickup verification RPC.

### 3. Expiry Job Belum Ada

Order pending yang ditinggalkan user masih mengandalkan reservation expiry dan manual action. Idealnya ada scheduled job yang secara berkala:

- Mencari order `pending_payment` yang melewati batas waktu.
- Reconcile status ke DOKU.
- Expire order jika belum paid.
- Release reservation.

### 4. Regenerate Payment Link

Jika `doku_payment_url` sudah expired, user saat ini perlu checkout ulang atau membatalkan pesanan. Untuk UX production, perlu flow `Buat link pembayaran baru` untuk order pending yang belum paid.

### 5. BOPIS Metadata Belum Disimpan

Lokasi pickup saat ini masih statis di frontend dan belum disimpan ke order. Untuk production, tambahkan struktur data:

- `pickup_locations`
- `orders.fulfillment_method`
- `orders.pickup_location_id`

Ini penting agar order result, admin order detail, dan pickup workflow tahu lokasi toko yang dipilih user.

### 6. Security Advisor Supabase

Supabase advisor masih menampilkan warning lama:

- `SECURITY DEFINER` functions dapat dieksekusi role anon/authenticated.
- Beberapa function belum set `search_path` eksplisit.
- Public storage bucket listing terlalu luas.
- Leaked password protection disabled.

Perlu audit terpisah sebelum revoke permission karena beberapa function dipakai oleh Edge Function dan admin flow.

### 7. DOKU Env Naming Belum Diseragamkan

Remote secret saat ini memakai nama lama seperti `DOKU_SECRET_KEY` dan `SITE_URL`, sementara rencana non-MVP sempat menyebut `DOKU_SHARED_KEY` dan `APP_URL`. Perlu standar final agar semua Edge Function konsisten.

### 8. Non-MVP Payment Architecture Belum Ada di Workspace

File yang sempat disebut untuk arsitektur non-MVP belum tersedia di workspace saat sesi ini:

- `202606260001_create_payment_schema.sql`
- `202606260002_create_atomic_rpc.sql`
- `create-doku-order`
- `regenerate-payment-link`
- `sync-doku-status`
- `expiry-job`
- `src/lib/payment/*`
- `src/pages/PaymentResult.tsx`
- `src/pages/admin/AdminOrders.tsx`
- `src/pages/Settings.tsx`

Jika ingin lanjut ke production-grade payment architecture, file tersebut perlu dibuat atau dipulihkan dulu.

## Rekomendasi Prioritas Berikutnya

1. Pantau Vercel deployment untuk commit `71bbc83`.
2. Test manual flow lengkap: cart, checkout review, DOKU, refresh pending, lanjut bayar, cancel order.
3. Tambahkan atomic RPC untuk cancel/expire/paid transitions.
4. Tambahkan cron expiry job untuk pending payment lama.
5. Simpan metadata BOPIS ke database.
6. Audit Supabase security advisor dan buat migration hardening permission.
7. Standarkan nama environment variable DOKU dan app URL.

## Catatan Akhir

Untuk kebutuhan MVP saat ini, flow checkout sudah lebih aman dan lebih jelas bagi user. Untuk production, fokus berikutnya sebaiknya bukan menambah UI, tetapi memperkuat state transition pembayaran di database, membuat expiry automation, dan mengurangi surface area function `SECURITY DEFINER` yang dapat dieksekusi langsung lewat REST RPC.
