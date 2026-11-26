# KopiKita — Toko Online Mini Specialty Coffee

Website e-commerce mini berbahasa Indonesia untuk **KopiKita** yang menjual biji kopi Nusantara, alat seduh manual brew, dan merchandise penikmat kopi. Dibangun menggunakan **HTML, CSS, dan JavaScript vanilla** tanpa framework, dengan seluruh state tersimpan secara persisten di `localStorage`.

- **Live Demo (GitHub Pages):** https://ryuuzev.github.io/kopikita/
- **Repositori GitHub:** https://github.com/RyuuZev/kopikita

---

## Fitur Utama

1. **Halaman Utama (`index.html`)**
   - Hero banner dengan spotlight produk unggulan.
   - Daftar kategori interaktif (`Biji Kopi`, `Alat Seduh`, `Merchandise`) dengan jumlah produk aktual.
   - Grid produk unggulan dan bagian keunggulan KopiKita.
2. **Katalog Produk (`produk.html`)**
   - Pencarian produk berdasarkan nama, kategori, spesifikasi, dan deskripsi.
   - Filter kategori dan filter rentang harga (input minimum/maksimum serta tombol cepat).
   - Pengurutan produk (`Terbaru`, `Harga: Termurah`, `Harga: Termahal`).
3. **Modal Detail Produk**
   - Tampil pada halaman Beranda dan Katalog saat kartu atau tombol **Detail** diklik.
   - Pemilih jumlah dengan batas stok tersedia dan penanganan status `Stok Habis`.
4. **Keranjang Belanja (`keranjang.html`)**
   - Ubah jumlah item, hapus item satuan, atau kosongkan keranjang dengan modal konfirmasi.
   - Bar progres gratis ongkir (minimal belanja `Rp 250.000`), kalkulasi subtotal, estimasi ongkos kirim, dan total bayar.
   - Badge jumlah item pada navbar tersinkron di semua halaman dan antar-tab browser.
5. **Checkout & Konfirmasi Pesanan (`checkout.html`)**
   - Validasi input untuk nama lengkap (min. 3 karakter), nomor HP Indonesia, alamat pengiriman (min. 15 karakter), dan metode pembayaran (`Transfer Bank`, `COD`, atau `E-Wallet`).
   - Validasi ulang stok saat pesanan dibuat; stok berkurang otomatis, keranjang dikosongkan, dan halaman konfirmasi menampilkan nomor pesanan unik (`KK-YYYYMMDD-XXXX`) dengan tombol salin.
6. **Panel Admin (`admin.html`)**
   - Ringkasan KPI (total pesanan, pesanan perlu diproses, total penjualan, jumlah produk).
   - Tab **Daftar Pesanan**: filter status dan ubah status pesanan (`Diproses`, `Dikirim`, `Selesai`).
   - Tab **Kelola Produk & Stok**: pencarian produk, edit stok cepat inline, tambah/edit/hapus produk, serta reset data produk awal.
7. **Dark Mode & Desain Responsif**
   - Tombol toggle mode terang/gelap di navbar yang menyimpan preferensi tema ke `localStorage`.
   - Tata letak responsif untuk tampilan mobile, tablet, dan desktop dengan animasi hover dan transisi halus.

---

## Tech Stack & Struktur File

- **Frontend:** HTML5, CSS3 (Custom Properties, Grid, Flexbox), JavaScript ES5/ES6 Vanilla
- **Penyimpanan State:** `localStorage` (`kopikita_products`, `kopikita_cart`, `kopikita_orders`, `kopikita_theme`)
- **Aset Gambar:** Generator ilustrasi SVG data URI ter-encode di `data.js` (beserta dukungan URL gambar kustom pada Panel Admin)

```text
kopikita/
├── .github/
│   └── workflows/
│       └── deploy.yml    # Workflow deploy otomatis ke GitHub Pages
├── .gitignore
├── .nojekyll
├── index.html            # Halaman utama
├── produk.html           # Katalog produk, filter & urutkan
├── keranjang.html        # Keranjang belanja
├── checkout.html         # Form checkout & konfirmasi pesanan
├── admin.html            # Panel admin pesanan, produk & stok
├── style.css             # Styling, tema terang/gelap & responsivitas
├── data.js               # 12 data produk awal & generator gambar SVG
├── script.js             # Logika keranjang, checkout, admin & sinkronisasi
└── README.md
```

---

## Cara Menjalankan di Lokal

### 1. Buka Langsung di Browser
Cukup unduh/clone repositori ini lalu klik dua kali `index.html` untuk membukanya melalui protokol `file://`. Proyek tidak menggunakan ES module (`type="module"`), sehingga langsung berjalan tanpa server tambahan.

### 2. Menggunakan Server Lokal
```bash
git clone https://github.com/RyuuZev/kopikita.git
cd kopikita
python -m http.server 8000
```
Kemudian buka `http://localhost:8000` di browser.

---

## Deployment Otomatis (GitHub Pages)

Repositori ini sudah dilengkapi workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) yang otomatis memublikasikan situs setiap kali ada perubahan pada branch `main` ke:

**https://ryuuzev.github.io/kopikita/**
