# Progress Proyek - Mohef Tech POS

- **Fase Saat Ini:** Tahap 3 Langkah 2 Selesai (App Shell Pemisahan Ruang Kasir vs Ruang Pemilik & Halaman Manajemen Produk Model P2)
- **Telah Selesai:**
  - Tahap 1: Setup Frontend Vite React (TS, Tailwind, Path Alias), Backend Go (Gin, GORM, Postgres, CORS), Docker Compose PostgreSQL, skema dasar database.
  - Tahap 2A: Field autentikasi (`Email`, `PasswordHash`, `Username`) & `BusinessID`, model pendukung (`StockMovement`, `Return`, `ReturnItem`, `PrintAudit`), utilitas JWT (`golang-jwt/jwt/v5`) + bcrypt, endpoint `POST /api/auth/login`, `AutoMigrate`, dan dev seeder awal.
  - Tahap 2B: Controller `CreateProduct`, `GetProducts`, `AdjustStock`, middleware `AuthMiddleware()`, dan rute `/api/products`.
  - Tahap 2C: Controller `OpenSession`, `CloseSession`, `CreateTransaction` (GORM Transaction + `FOR UPDATE` locking + konversi stok + `ExpectedCash`), serta rute `/api/sessions` & `/api/transactions`.
  - Tahap 2D: Controller `CreateReturn` (khusus Owner, transaksi DB, potong subtotal/total, kembalikan stok jika layak jual), `LogPrintReceipt` (limit 3x kasir, tanpa batas owner), `GetSalesReport` (khusus Owner, filter rentang tanggal `start_date`–`end_date`), serta rute `/api/returns`, `/api/audits/print`, dan `/api/reports/sales` di `backend/main.go`.
  - Tahap 3 Langkah 1: Setup font `Plus Jakarta Sans` & `JetBrains Mono`, CSS tokens palet W1 Forest & Copper, auth API client (`POST /api/auth/login` + Smart Auto-Fallback & `GET /health`), dan Halaman Login (Floating Glass Console + Latar A + Smart Segmented Pill + Numpad Native Tablet).
  - Tahap 3 Langkah 2: App Shell dengan pemisahan tegas Ruang Kasir vs Ruang Pemilik (Workspace Switcher, sidebar collapsible desktop & drawer mobile), serta Halaman Manajemen Produk Model P2 (Master-Detail Split Workspace) terhubung penuh ke `GET /api/products`, `POST /api/products`, dan `POST /api/products/adjust-stock` memakai native `<dialog>` modal.
- **Tugas Berikutnya:** Tahap 3 Langkah 3 - Layar Kasir (POS) landscape-first, keranjang belanja, unified search/barcode, tombol kemasan terpisah, dan pembayaran Tunai/QRIS.
