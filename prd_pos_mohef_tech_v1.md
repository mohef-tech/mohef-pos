# Product Requirements Document (PRD) - POS Mohef Tech V1

## 1. Informasi Umum
*   **Nama Produk:** Mohef Tech POS (Nama Sementara)
*   **Versi:** 1.0
*   **Platform:** Web Responsive & Progressive Web App (PWA)
*   **Model Bisnis:** SaaS (Langganan) dengan opsi Jual Putus (Self-Hosted via Docker).

## 2. Tujuan Produk & Target Pengguna
Aplikasi kasir yang cepat, andal, dan siap jual untuk toko ritel kecil, toko kelontong, dan swalayan kecil (satu outlet). Fokus V1 adalah stabilitas transaksi operasional *online*, manajemen stok absolut dengan konversi kemasan, dan pencatatan kasir yang akurat.

*   **Pengguna Utama:** Kasir toko (kecepatan & kemudahan) dan Pemilik Toko (kontrol stok, laporan, & keamanan dana).

## 3. Arsitektur & Tech Stack
Sistem menggunakan arsitektur terpisah (Frontend dan Backend) untuk mendukung skalabilitas dan mempermudah migrasi jual putus.
*   **Frontend:** React (PWA, dioptimalkan untuk orientasi Landscape/Tablet-Laptop di meja kasir).
*   **Backend:** Golang (REST API - ringan, performa tinggi, efisien untuk *deployment* VPS minim resource).
*   **Database:** PostgreSQL (dipilih untuk kapabilitas *transaction/row-level locking* guna menangani *race condition*).
*   **Deployment:** Docker & Docker Compose.

## 4. Batasan & Ruang Lingkup (Out of Scope V1)
Fitur berikut **TIDAK** masuk dalam V1:
*   Multi-cabang (namun struktur DB disiapkan untuk *tenant/outlet*).
*   Mode transaksi *offline*.
*   Aplikasi *Native* (Android/iOS di luar PWA).
*   Pembuatan & pencetakan label barcode baru.
*   Integrasi timbangan digital otomatis.
*   Diskon manual oleh kasir.
*   Pemesanan pembelian (PO), utang pemasok, dan retur ke pemasok.
*   *Refund* otomatis via *Payment Gateway* dan integrasi akuntansi lengkap.

## 5. Hak Akses, Akun, & Sesi
*   **Pemilik (Owner):** 1 Akun per toko. Memiliki akses penuh (Master data, retur, stok manual, semua laporan, pengaturan, dan bisa berfungsi sebagai kasir).
*   **Kasir:** Maksimal 3 Akun per toko (untuk V1). Hanya dapat mengakses layar transaksi, riwayat transaksi dasar, dan laporan sesinya sendiri.
*   **Sesi (Shift):** Setiap akun kasir hanya memiliki 1 sesi aktif. Tiga kasir dapat bertransaksi secara bersamaan di perangkat masing-masing.

## 6. Kebutuhan Fungsional & Aturan Bisnis

### A. Manajemen Produk & Stok
*   **Input Data:** Manual form dan *import* via Excel (struktur *template* akan disesuaikan saat pengembangan).
*   **Satuan Jual:** Mendukung bilangan bulat (pcs/bungkus) dan desimal (berat/kg). Kasir bisa *input* berat manual.
*   **Konversi Kemasan:** 
    *   Isi kemasan diatur per produk.
    *   Penjualan eceran dan kemasan memotong dari *stok dasar yang sama*.
    *   *UI Layar Kasir:* Varian kemasan (misal: Beras 1Kg vs Beras Karung 25Kg) ditampilkan sebagai **tombol/entri yang terpisah**, bukan *dropdown*, untuk mempercepat klik.
*   **Kontrol Stok:** 
    *   Jika stok kurang dari jumlah di daftar, transaksi item tersebut diblokir. Pemilik harus melakukan penyesuaian stok.
    *   Penyesuaian stok (tambah/kurang manual) wajib menyertakan catatan alasan.
*   **Race Condition:** Saat 2-3 kasir *checkout* item yang sama bersamaan, Backend (Golang) dan DB (PostgreSQL) harus mengunci baris stok agar tidak tembus di bawah nol.

### B. Layar Kasir (POS)
*   **Layout:** *Landscape-first*. Panel kiri untuk area pencarian dan tombol favorit. Panel kanan untuk daftar barang dan tombol bayar.
*   **Pencarian (Unified Input):** Satu kolom teks (*input field*) berfungsi ganda untuk menampung ketikan nama barang ATAU *input* dari *Scanner Barcode* (otomatis enter).
*   **Daftar Barang:** Kasir dapat menambah/mengurangi kuantitas. Total harga otomatis dihitung ulang. Harga barang mutlak dari sistem, tidak bisa diubah kasir.
*   **Scanner Barcode:** Bersifat opsional, sistem tetap jalan tanpa scanner. Barcode harus dipetakan ke data produk terlebih dahulu oleh pemilik.

### C. Pembayaran
*   **Tunai:** Kasir memasukkan uang diterima -> Sistem hitung kembalian -> Kasir konfirmasi bayar.
*   **QRIS (Sandbox Mode untuk V1):**
    *   Menggunakan skema *Platform/Sub-Account* (seperti Xendit).
    *   Sistem memunculkan QR dinamis sesuai nominal.
    *   Status "Lunas" menunggu *callback* dari *payment gateway* (tidak bisa dikonfirmasi hanya dari *screenshot* pelanggan).
    *   *Retry* status tidak boleh menggandakan transaksi.

### D. Penutupan Sesi Kasir
Sistem wajib mencatat dan merekap:
*   Identitas petugas (PIC).
*   Modal uang tunai awal (di-input saat buka sesi).
*   Total penjualan tunai & QRIS (terpisah).
*   Total pengembalian tunai (dari retur).
*   Saldo tunai di sistem vs Uang fisik yang dihitung kasir saat tutup sesi -> Kalkulasi selisih (minus/plus).

### E. Retur & Pengembalian Uang
*   **Otoritas:** Hanya bisa diproses oleh akun Pemilik.
*   **Alur:** Merujuk pada transaksi asal -> Pilih barang & kuantitas -> Isi alasan & kondisi barang.
*   **Stok:** Barang "layak jual" kembali ke stok utama; barang "rusak" dicatat terpisah (tidak masuk stok jual).
*   **Uang:** Pengembalian uang dilakukan secara *manual* oleh pemilik secara tunai (meskipun pembayaran asal memakai QRIS), lalu dicatat di sistem.

### F. Cetak Struk (Printer Opsional)
*   Transaksi tetap tersimpan walau printer gagal/tidak ada.
*   **Batas Cetak Kasir:** Maksimal 3 kali per transaksi (1 asli, 2 cetak ulang dengan *watermark* "SALINAN"). Dihitung per transaksi, bukan per kasir.
*   **Otoritas Lanjut:** Cetak ke-4 dan seterusnya hanya bisa dilakukan oleh akun Pemilik.
*   Aplikasi mencatat setiap *event* permintaan cetak (waktu dan aktor).

### G. Laporan (Khusus Pemilik)
Laporan sederhana dengan filter rentang tanggal:
1.  **Laporan Penjualan:** Total, rincian transaksi, retur, split QRIS vs Tunai.
2.  **Laporan Stok:** Sisa stok *real-time*, riwayat masuk, terjual, retur, dan penyesuaian manual.
3.  **Laporan Sesi Kasir:** Riwayat *shift*, modal awal, selisih tunai.

## 7. Rencana Pengembangan AI (Tahapan Rekomendasi)
Karena akan dibangun menggunakan *AI coding assistant*, direkomendasikan untuk mengeksekusi secara modular:
1.  **Tahap 1:** *Setup* repositori (Go & React) dan *database schema* (PostgreSQL).
2.  **Tahap 2:** CRUD Master Produk & logika konversi satuan stok (Backend) + UI Manajemen Produk (Frontend).
3.  **Tahap 3:** Layar Kasir UI, *state management* (keranjang), dan logika integrasi *barcode/search*.
4.  **Tahap 4:** Logika Transaksi/Checkout di Golang (implementasi *DB locking* & *concurrency*).
5.  **Tahap 5:** Integrasi API QRIS Sandbox.
6.  **Tahap 6:** Sesi Kasir, Manajemen *User*, dan Cetak Struk.