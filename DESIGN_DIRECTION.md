# Design Direction & Dials: Mohef Tech POS (V1)

Dokumen ini adalah acuan tunggal (*source of truth*) arah visual, interaksi, dan arsitektur antarmuka Frontend React/Vite/Tailwind untuk Mohef Tech POS V1. Wajib dibaca berdampingan dengan `prd_pos_mohef_tech_v1.md` dan `.agents/skills/mohef-skills/SKILL.md` sebelum menulis kode UI apa pun.

---

## 1. Direction & Dials (Mohef-Skills Lock)

- **Product:** Aplikasi kasir (POS) dan manajemen stok ritel berbasis web/PWA untuk pemilik toko dan kasir non-IT di toko kelontong maupun swalayan kecil (1 outlet, *landscape-first*).
- **Character:** Grounded, Tactile, Architectural (Kokoh, Taktil, Terstruktur).
- **World:** Meja kasir ritel kontemporer yang memadukan panel kayu hijau hutan gelap (*deep oiled forest*), kertas struk matte hangat (*warm cream paper*), dan aksen perangkat keras tembaga (*brushed copper*).
- **Moments:**
  1. **Floating Glass Login Console** di atas latar *Sculpted Warm Horizon* sebagai kesan pertama saat membuka aplikasi.
  2. **Master-Detail Split Workspace** pada Manajemen Produk (serta Layar Kasir *split-screen* pada tahap berikutnya) dengan persamaan konversi kemasan dan angka Rupiah berpresisi tinggi.
- **Signature:** Penanda fokus dan status aktif bergaya tembaga (*Copper*) dengan garis tipis (*hairline border*), dipadukan angka `JetBrains Mono` (`tabular-nums`) yang selalu sejajar vertikal pada setiap harga, stok dasar, dan rasio konversi kemasan.
- **Design Read:** `Reading this as: landscape-first retail POS SaaS web app for non-IT store owners and cashiers, style Forest & Copper Selective Glass + solid warm workspace, dial ENERGY 2 / RHYTHM 2 / MOTION 2.`

### Kalibrasi 3 Dials
- **ENERGY = 2 (Tegas & Terkendali):** Kontras tinggi antara *chrome* gelap *Deep Forest* dan kanvas kerja terang *Warm Cream*. Tanpa neon, tanpa gradien mencolok di area kerja.
- **RHYTHM = 2 (Seimbang & Fungsional):** Komposisi *landscape* terstruktur dengan pemisahan panel jelas (60/40 pada Manajemen Produk, panel kiri-kanan pada Layar Kasir), tidak monoton dan tidak penuh kotak hiasan.
- **MOTION = 2 (Transisi Bermakna):** Kurva tunggal `cubic-bezier(0.22, 1, 0.36, 1)`. Umpan balik klik/hover `140ms`, pergeseran *segmented pill* dan buka/tutup modal `240ms - 320ms`. Hanya menganimasikan `color`, `background-color`, `border-color`, `opacity`, dan `transform`. Wajib menghormati `prefers-reduced-motion: reduce`.

---

## 2. Sistem Warna: W1 "Forest & Copper" (Terverifikasi WCAG AA)

Filosofi: **Quiet Chrome, Rich Moments** (60% kanvas terang hangat, 30% struktur *Deep Forest*, 10% aksen *Copper*, *Champagne Gold*, dan *Burgundy* untuk sinyal kritis).

### Token Warna & Rasio Kontras Terukur

| Peran Token | Nama Warna | Hex | Penggunaan | Pasangan & Rasio Kontras |
| --- | --- | --- | --- | --- |
| `--bg-canvas` | Warm Cream | `#F6EFE6` | Latar utama seluruh ruang kerja (solid) | Dasar area kerja |
| `--bg-surface` | Warm Sand | `#EFE6DA` | Permukaan sekunder, header tabel, tab non-aktif | Pembeda blok halus |
| `--bg-card` | Warm Paper | `#FFFDF9` | Kartu data, baris terpilih, panel detail produk, input area kerja | Kontras tinggi dengan teks |
| `--text-primary` | Deep Espresso | `#2B1D14` | Judul, nama produk, angka harga, teks utama | di `#F6EFE6` = **14.29:1** (AAA), di `#FFFDF9` = **16.04:1** (AAA) |
| `--text-secondary` | Roasted Umber | `#5C4B40` | Label form, subjudul, keterangan kemasan | di `#F6EFE6` = **7.26:1** (AAA) |
| `--text-muted` | Muted Earth | `#6A594D` | Metadata, placeholder penting, catatan waktu | di `#F6EFE6` = **5.85:1** (AA), di `#FFFDF9` = **6.56:1** (AA) |
| `--border-subtle` | Hairline Espresso | `rgba(43, 29, 20, 0.10)` | Garis pemisah 1px antar panel, kartu, dan baris tabel | Garis tepi halus |
| `--border-strong` | Border Earth | `rgba(43, 29, 20, 0.22)` | Batas input form agar batas kotak terbaca jelas oleh user awam | Non-text UI boundary |
| `--chrome-bg` | Deep Forest | `#0F2A24` | Top bar kasir, sidebar/header pemilik, tombol aksi utama gelap, dasar latar Login | Jangkar gelap utama |
| `--chrome-raised` | Muted Pine | `#173B32` | Hover item navigasi, kartu elevated di area gelap | Permukaan sekunder gelap |
| `--chrome-text` | Forest Cream | `#F6EFE6` | Teks utama di atas permukaan `#0F2A24` / `#173B32` | di `#0F2A24` = **13.37:1** (AAA) |
| `--chrome-muted` | Soft Sage | `#B4C6BF` | Teks sekunder/status di atas `#0F2A24` | di `#0F2A24` = **8.55:1** (AAA) |
| `--accent-copper` | Copper | `#A8643A` | Tombol CTA aksen, indikator fokus/aktif utama | Teks `#FFFDF9` di `#A8643A` = **4.54:1** (AA) |
| `--accent-copper-hover` | Deep Copper | `#92522B` | State hover tombol Copper & teks tautan aksen di atas latar terang | `#FFFDF9` di `#92522B` = **5.97:1**; `#92522B` di `#F6EFE6` = **5.31:1** (AA) |
| `--accent-gold` | Champagne Gold | `#D8C28A` | Penanda menu aktif, ikon highlight, badge status di atas area `#0F2A24` / `#173B32` | di `#0F2A24` = **8.72:1** (AAA), di `#173B32` = **7.03:1** (AAA) |
| `--status-danger` | Deep Burgundy | `#6E1F2F` | Stok habis, peringatan kritis, error validasi, tombol hapus/retur | `#FFFDF9` di `#6E1F2F` = **10.88:1**; `#6E1F2F` di `#F6EFE6` = **9.69:1** (AAA) |
| `--status-danger-bg` | Soft Rose Tint | `#F7E8EB` | Latar badge/alert error lembut | Dengan teks `#6E1F2F` |
| `--status-warning-text` | Deep Ochre | `#7C4A15` | Teks status stok menipis | Dengan latar `#FBF1DF` |
| `--status-success` | Forest Success | `#14532D` | Status lunas, koneksi server aktif, stok aman | di `#F6EFE6` = **7.99:1** (AAA) |

### Aturan Ketat Material: Selective Glass (2C)
- **Area kerja utama (Tabel Produk, Panel Detail, Layar Kasir, Bar Navigasi) WAJIB 100% SOLID** tanpa `backdrop-filter` agar performa PWA ringan di tablet/laptop kasir dan teks selalu tajam.
- **Efek *frosted glass* dibatasi maksimal 2 momen melayang:**
  1. **Kartu Floating Glass Console pada halaman Login** (`background: rgba(15, 42, 36, 0.74)`, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(216, 194, 138, 0.22)`).
  2. **Overlay backdrop & modal/dialog fokus** (misalnya modal Tambah/Edit Produk atau Penyesuaian Stok Manual: overlay gelap lembut dengan `backdrop-filter: blur(6px)`, sementara bodi modal sendiri tetap solid `#FFFDF9` agar form terbaca sempurna).

---

## 3. Tipografi, Spasi, Sudut, dan Ikon

### Tipografi
- **Interface Sans:** `Plus Jakarta Sans` (bobot `400`, `500`, `600`). Hindari bobot `800-900`.
- **Mono Figures & Meta:** `JetBrains Mono` (bobot `400`, `500`) dengan `font-variant-numeric: tabular-nums`. Wajib dipakai untuk seluruh nominal Rupiah, jumlah stok dasar (`base_stock`), rasio konversi (`conversion_rate`), barcode, kode transaksi, dan jam shift.
- **Gaya Teks:** Gunakan *sentence case* untuk label dan tombol (bukan ALL CAPS dengan spasi lebar). Jangan gunakan *italic* untuk penekanan. Jangan gunakan em-dash atau en-dash pada salinan UI.

### Grid Spasi & Nested Radii
- **Grid Spasi:** Kelipatan ketat `4px` (`4, 8, 12, 16, 20, 24, 32`). Jarak di dalam grup elemen selalu lebih kecil daripada jarak antar grup.
- **Nested Radii (`inner = outer - padding`, minimum `4px`):**
  - Tag/badge kecil: `6px`
  - Input & tombol: `10px`
  - Kartu & panel bagian dalam: `14px`
  - Modal & Kartu Login Floating Glass: `20px`
  - Segmented Pill Toggle: `9999px` (hanya untuk *pill switcher* dan lencana status titik).

### Ikonografi
- Gunakan satu set ikon garis konsisten: **Lucide React** (`16px - 18px`, `strokeWidth={1.75}` atau `1.5`, kotak ikon berukuran tetap).
- **Dilarang menggunakan emoji** pada navigasi, tombol, judul, atau label status.

---

## 4. Arsitektur Navigasi: Pemisahan Tegas Ruang Kasir vs Pemilik (3C)

Aturan ini menjamin kasir awam tidak pernah melihat atau salah membuka menu manajemen toko:

1. **Akun Kasir (`role: "cashier"`):**
   - Begitu login berhasil, langsung mendarat di **Layar Kasir** (`/pos`).
   - **Top Bar sangat ringkas** (`height: 56px`, latar `#0F2A24`, teks `#F6EFE6`):
     - Kiri: Logo/Nama Toko + indikator status sesi kasir aktif (modal awal / shift).
     - Kanan: Akses minimal sesuai PRD V1 (`Riwayat Shift` / `Tutup Sesi`), nama kasir, dan tombol keluar. Tidak ada sidebar atau menu manajemen produk/laporan.
2. **Akun Pemilik (`role: "owner"`):**
   - Memiliki **Workspace Switcher** eksplisit pada Top Bar berupa tombol pengalih tegas: **`Mode Kasir`** | **`Kelola Toko`**.
   - Saat di **`Kelola Toko`**:
     - Menampilkan **Sidebar Kiri Ramping** (`width: 224px` di desktop landscape, dapat diciutkan menjadi *rail* `72px` di tablet) berlatar `#0F2A24` dengan penanda aktif emas `#D8C28A` + latar `#173B32`.
     - Daftar menu strictly sesuai PRD V1:
       1. `Produk & Stok` (halaman default Ruang Pemilik pada Tahap 3)
       2. `Sesi Kasir` (tahap lanjut)
       3. `Retur` (tahap lanjut)
       4. `Laporan` (tahap lanjut)
       5. `Akun Kasir` (tahap lanjut)
     - **Hard Gate:** Menu tahap lanjut yang belum dibangun tidak boleh menjadi tombol mati (*dead link*). Tampilkan hanya rute yang aktif atau beri label status eksplisit yang jujur bila sedang dinonaktifkan, tanpa navigasi rusak.
   - Saat Owner menekan **`Mode Kasir`**: Sidebar menghilang penuh sehingga layar 100% identik dengan Layar Kasir yang bersih, dengan 1 tombol kembali ke `Kelola Toko` di kanan atas.

---

## 5. Blueprint Layar 1: Halaman Login

### Layout & Atmosfer: Floating Glass Console + Latar A (Sculpted Warm Horizon)
- **Latar Layar Penuh (`min-h-dvh`):**
  - Dasar `#0B201B` hingga `#0F2A24` (*Deep Forest*).
  - Komposisi layer organik halus (*Sculpted Warm Horizon*): lengkungan lembut berbasis SVG/CSS radial berlapis memakai warna palet W1 saja (`#173B32` pine, `#A8643A` copper hangat redup di tepi bawah-kanan, dan pendar halus `#D8C28A` beropasitas rendah) sehingga kartu kaca terlihat hidup namun tetap tenang dan tidak norak.
  - Indikator status koneksi backend (`GET /health`) tampil ringkas di pojok bawah layar (misal titik hijau + `Server siap` atau burgundy + `Koneksi terputus`) agar kasir/owner langsung tahu kondisi jaringan.
- **Kartu Tengah (`Floating Glass Console`, `max-width: 440px`):**
  - Efek kaca buram tipis (`rgba(15, 42, 36, 0.74)` + `backdrop-filter: blur(20px)` + border tipis `rgba(216, 194, 138, 0.22)` + radius `20px`).
  - Header kartu: identitas ringkas `Mohef POS` + **Segmented Pill Toggle** di atas form: **`Kasir`** (default) | **`Pemilik`**.
  - Indikator pill aktif bergeser mulus (`220ms`) memakai latar `#A8643A` (Copper) atau `#F6EFE6` dengan teks berasio kontras > 7:1.

### Interaksi Pintar & Ramah Tablet (Tanpa Keypad Layar)
- **Tab `Kasir` (Default):**
  - Input 1: `Username kasir` (`type="text"`, `autoComplete="username"`, tinggi `48px`, `font-size: 16px`).
  - Input 2: `PIN` (`type="password"`, `inputMode="numeric"`, `autoComplete="current-password"`, tombol tampilkan/sembunyikan PIN, tinggi `48px`, `font-size: 16px`). Di tablet, `inputMode="numeric"` otomatis memunculkan keyboard angka bawaan sistem.
- **Tab `Pemilik`:**
  - Input 1: `Email pemilik` (`type="email"`, `inputMode="email"`, `autoComplete="email"`, tinggi `48px`, `font-size: 16px`).
  - Input 2: `Kata sandi` (`type="password"`, tombol tampilkan/sembunyikan sandi, tinggi `48px`, `font-size: 16px`).
- **Mekanisme Anti-Salah Tab (Frontend-only, kompatibel penuh dengan `POST /api/auth/login`):**
  1. **Deteksi real-time:** Jika user sedang di tab `Kasir` lalu mengetik karakter `@` pada kolom akun, tampilkan petunjuk singkat atau geser otomatis ke tab `Pemilik` tanpa menghapus teks yang sudah diketik.
  2. **Smart Auto-Fallback saat submit:** Saat tombol `Masuk` ditekan, kirim payload sesuai tab aktif (`role: "cashier"` pakai `username + pin`, atau `role: "owner"` pakai `email + password`). Jika backend mengembalikan `401 Unauthorized` dan pola input cocok dengan peran pasangannya (mengandung `@` untuk `owner`, atau tanpa `@` untuk `cashier`), frontend otomatis mencoba 1 kali ke peran pasangannya sebelum menampilkan pesan error ke pengguna.
- **Tombol Aksi Utama:** Lebar penuh, tinggi `48px`, warna `#F6EFE6` teks `#0F2A24` (atau `#A8643A` teks `#FFFDF9`), state loading jelas (`Memeriksa akun...`), dan alert error berikon jelas (bukan warna saja).

---

## 6. Blueprint Layar 2: Manajemen Produk (Ruang Pemilik)

### Layout: Model P2 (Master-Detail Split Workspace)
Dioptimalkan untuk layar *landscape* (tablet horizontal & laptop >= `1024px`), dengan transisi bertumpuk/drawer otomatis untuk layar lebih sempit (`< 1024px`).

1. **Header Bar Ruang Kerja (Solid `#F6EFE6`):**
   - Judul halaman (`Produk & Stok`, `<h1>`) + ringkasan 3 angka metrik sejajar (`Total produk`, `Stok menipis`, `Stok habis`) memakai `JetBrains Mono` (`tabular-nums`).
   - Aksi kanan: tombol sekunder `Import Excel` (jika endpoint sudah tersedia/disambungkan) dan tombol utama `+ Tambah produk` (`#0F2A24`, teks `#F6EFE6`, tinggi `44px`).

2. **Panel Kiri (60%): Daftar Produk (Solid `#FFFDF9`, border hairline):**
   - Bar filter atas: kolom pencarian cepat (cari nama produk atau scan barcode) + filter chip sederhana (`Semua`, `Stok menipis`, `Habis`).
   - Daftar baris produk dengan kepadatan nyaman (`min-height: 60px` per baris agar ramah sentuh):
     - Nama produk (`Plus Jakarta Sans` 500, `#2B1D14`) + ringkasan jumlah kemasan (misal `2 kemasan: Pcs, Dus`).
     - Stok dasar (`base_stock`) rata kanan dalam `JetBrains Mono` + lencana status (Aman, Menipis, Habis dengan ikon dan warna berbeda).
   - Baris aktif ditandai latar hangat `#EFE6DA` dan aksen tepi kiri `3px` berwarna `#A8643A` (Copper).
   - State kosong, loading skeleton, dan error fetch wajib ditangani eksplisit (penyebab + tombol `Muat ulang`).

3. **Panel Kanan (40%): Detail Produk Terpilih & Aksi Cepat (Solid `#FFFDF9`, sticky):**
   - **Saat belum ada produk dipilih:** State kosong terarah yang memandu pemilik memilih produk di sebelah kiri atau menambah produk baru.
   - **Saat produk dipilih:**
     - Header detail: Nama produk, tombol `Edit produk` dan `Hapus` (dengan dialog konfirmasi).
     - **Blok Stok Dasar:** Angka besar `base_stock` dalam `JetBrains Mono` + tombol tegas **`Sesuaikan stok`** (membuka modal fokus untuk tambah/kurang stok manual yang **wajib mengisi catatan alasan** sesuai PRD V1).
     - **Daftar Varian Kemasan (Bahasa Non-IT):**
       - Setiap `ProductVariant` ditampilkan sebagai kartu kecil rapi (bukan tabel sempit) yang mencerminkan cara kasir nanti melihatnya:
         - Nama kemasan (`Eceran 1 Kg`, `Karung 25 Kg`)
         - Harga jual dalam `JetBrains Mono` (`Rp 350.000`)
         - Persamaan konversi berbahasa manusia: `Memotong 25 satuan dasar` + estimasi ketersediaan (`Tersedia ~4 Karung`)
         - Kode barcode dalam `JetBrains Mono` (atau keterangan `Tanpa barcode`).

4. **Modal Tambah / Edit Produk & Penyesuaian Stok (Selective Glass Backdrop + Solid Card):**
   - Latar belakang belakang modal memakai overlay gelap dengan `backdrop-filter: blur(6px)`, kartu modal sendiri solid `#FFFDF9` (`border-radius: 20px`).
   - Pada form produk, blok varian kemasan memakai pola kalimat langsung agar pemilik awam tidak bingung:
     - `1 [Nama kemasan] = [Rasio] satuan dasar` | `Harga jual (Rp)` | `Barcode (opsional)`
     - Mendukung angka desimal untuk satuan berat (kg) maupun bulat (pcs) sesuai `numeric(14,4)` di backend.
   - Modal tutup lewat tombol `Batal`, ikon `X` (dengan `aria-label`), atau tombol keyboard `Escape`.

---

## 7. Hard Gates & Delivery Gate (Wajib Lolos Sebelum Selesai)

Setiap halaman dan komponen yang dibangun wajib memenuhi seluruh kriteria `.agents/skills/mohef-skills/SKILL.md`:
- Kontras teks >= `4.5:1`, batas UI dan teks besar >= `3:1`.
- Semua elemen interaktif bisa dioperasikan via `Tab`, `Enter`/`Space`, `Escape`, dengan `:focus-visible` yang terlihat jelas (`>= 3:1` memakai ring `#A8643A` atau `#D8C28A`).
- Target sentuh minimum `44x44px` dengan jarak antar tombol minimal `8px`.
- Semantik HTML murni (`<button>` untuk aksi, `<a href>` untuk tautan, `<label>` terlihat pada setiap input, `aria-label` untuk tombol ikon, `cursor: pointer` untuk elemen aktif).
- Tidak ada data palsu (*hardcoded mock*), tidak ada tombol mati, tidak ada em-dash di teks antarmuka, dan selalu terhubung ke API backend yang valid.
