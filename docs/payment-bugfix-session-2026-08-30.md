# Payment Bug Fix - 30 Agustus 2026

## Problem

- Timer polling terus di-reset oleh render setiap detik.
- Check Status DOKU dipanggil terlalu cepat dan hanya sekali.
- Webhook tanpa signature dibalas sukses tetapi tidak diproses.
- Beberapa error backend dan database tidak terlihat jelas.
- UI terlihat terus mengecek walaupun request tidak selalu berjalan.
- Timer browser tertunda saat DOKU Checkout berada di atas halaman hasil, sehingga status sukses baru tampil 6-8 detik setelah kembali.

## Root Cause And Fix

- Polling memakai jadwal absolut dan tidak lagi bergantung pada objek query yang tidak stabil.
- Database dicek bertahap, sedangkan DOKU baru dicek mulai detik ke-60 dengan retry terbatas.
- Tab yang aktif kembali memicu refresh status.
- Jika check DOKU sudah jatuh tempo, halaman yang aktif kembali langsung menjalankan reconcile dengan guard anti-duplikasi.
- Webhook POST tanpa signature sekarang ditolak.
- Status non-final seperti `FAILED`, `REDIRECT`, dan `TIMEOUT` tidak langsung membatalkan order.
- Error Edge Function dibaca dan ditampilkan lebih jelas.
- Backend menambahkan log terstruktur dan memeriksa semua operasi database penting.
- UI menampilkan waktu pengecekan dan jumlah percobaan yang nyata.
- Ditambahkan 27 automated tests untuk policy polling dan status pembayaran.
- Reconcile tidak lagi menyimpan signature DOKU ke `payment_events`; hanya metadata aman dan indikator keberadaan signature yang disimpan.
- RPC SECURITY DEFINER yang dapat mengubah state pembayaran sekarang hanya dapat dieksekusi oleh `service_role`, sehingga akses REST langsung tidak dapat melewati authentication dan ownership check Edge Function.

## Migration Sync

- Remote-only migrations dipulihkan dengan SQL history remote: `20260627104642_add_pimpinan_role`, `20260627104733_update_pimpinan_role`, dan `20260630002258_20260630080000_product_reviews`.
- File lokal `20260630080000_product_reviews.sql` dihapus karena SQL dan schema yang sama sudah diterapkan pada remote dengan timestamp `20260630002258`; SQL review tidak dijalankan dua kali.
- Migration forward-only `20260830104500_restrict_payment_rpc_execution` telah dipush untuk membatasi RPC payment ke `service_role`.

## Verification

- `npm test`: passed, 27 tests.
- `npm run typecheck`: passed.
- `npm run check:architecture`: passed.
- `npm run build`: passed. Warning `INVALID_ANNOTATION` dari dependency Hugeicons tetap ada dan bukan kegagalan payment.
- `deno check --no-lock` untuk tiga Edge Function payment: passed.
- `supabase migration list --linked`: local dan remote sinkron.
- Smoke test webhook: GET 200, HEAD 200, POST unsigned 401. Event payment dan order tidak berubah; structured log `signature_rejected` tercatat.

## Edge Functions

- `create-doku-checkout` deployed version 8, JWT verification enabled.
- `reconcile-doku-payment` deployed version 7, JWT verification enabled.
- `doku-webhook` deployed version 9, JWT verification disabled at gateway and DOKU signature verification enforced in code.

## Remaining Manual Work

- Pastikan Notification URL pada DOKU Back Office memakai path yang sama dengan `DOKU_NOTIFICATION_URL`; transaksi sandbox terakhir tidak mengirim webhook dan selesai lewat reconcile.
- Ulangi satu sandbox checkout setelah frontend terbaru ter-deploy dan ukur waktu dari kembali ke halaman sampai centang sukses.
