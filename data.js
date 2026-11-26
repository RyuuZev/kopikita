/* ==========================================================================
   KopiKita — Data Produk Awal, Kategori & Generator Gambar Placeholder SVG
   Menggunakan namespace global window.KopiKitaData agar berjalan lancar baik
   melalui server lokal maupun protokol file:// tanpa ES module.
   ========================================================================== */

(function (global) {
    'use strict';

    /**
     * Mengamankan teks sebelum dimasukkan ke dalam markup SVG XML.
     */
    function escapeXml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Memotong teks label agar muat rapi di dalam kartu ilustrasi SVG.
     */
    function truncateLabel(text, maxLength) {
        var clean = String(text || '').trim();
        if (clean.length <= maxLength) {
            return clean;
        }
        return clean.slice(0, maxLength - 1).trim() + '...';
    }

    /**
     * Mengembalikan vektor ikon bertema kopi berdasarkan nama ikon atau kategori.
     */
    function getIllustrationIcon(iconName, category, accent) {
        var key = iconName;
        if (!key) {
            if (category === 'Biji Kopi') key = 'beans';
            else if (category === 'Alat Seduh') key = 'dripper';
            else key = 'mug';
        }

        switch (key) {
            case 'beans':
                return (
                    '<g transform="translate(200,150)">' +
                    '<ellipse cx="-26" cy="8" rx="34" ry="48" transform="rotate(-22 -26 8)" fill="' + accent + '" opacity="0.92"/>' +
                    '<path d="M-40,-30 C-18,-8 -30,18 -14,44" fill="none" stroke="#FFF8F0" stroke-width="4" stroke-linecap="round" opacity="0.75"/>' +
                    '<ellipse cx="30" cy="-6" rx="32" ry="45" transform="rotate(18 30 -6)" fill="#FFF8F0" opacity="0.22"/>' +
                    '<ellipse cx="26" cy="-10" rx="31" ry="44" transform="rotate(18 26 -10)" fill="none" stroke="#FFF8F0" stroke-width="3.5" opacity="0.9"/>' +
                    '<path d="M36,-46 C16,-20 34,8 14,28" fill="none" stroke="#FFF8F0" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>' +
                    '</g>'
                );

            case 'dripper':
                return (
                    '<g transform="translate(200,148)">' +
                    '<polygon points="-58,-44 58,-44 26,20 -26,20" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linejoin="round"/>' +
                    '<path d="M44,-28 C68,-28 68,6 42,6" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round"/>' +
                    '<line x1="-42" y1="24" x2="42" y2="24" stroke="' + accent + '" stroke-width="7" stroke-linecap="round"/>' +
                    '<line x1="-22" y1="-42" x2="-10" y2="12" stroke="#FFF8F0" stroke-width="2.5" opacity="0.55"/>' +
                    '<line x1="0" y1="-42" x2="0" y2="12" stroke="#FFF8F0" stroke-width="2.5" opacity="0.55"/>' +
                    '<line x1="22" y1="-42" x2="10" y2="12" stroke="#FFF8F0" stroke-width="2.5" opacity="0.55"/>' +
                    '<path d="M-24,34 L24,34 L30,54 C30,60 -30,60 -30,54 Z" fill="' + accent + '" opacity="0.88"/>' +
                    '</g>'
                );

            case 'kettle':
                return (
                    '<g transform="translate(200,152)">' +
                    '<path d="M-34,-26 L30,-26 L42,42 C42,48 -46,48 -46,42 Z" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linejoin="round"/>' +
                    '<ellipse cx="-2" cy="-26" rx="32" ry="7" fill="' + accent + '"/>' +
                    '<circle cx="-2" cy="-38" r="6" fill="#FFF8F0"/>' +
                    '<path d="M-40,26 C-68,20 -66,-22 -84,-34" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round"/>' +
                    '<path d="M34,-12 C64,-14 66,30 40,34" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round"/>' +
                    '</g>'
                );

            case 'grinder':
                return (
                    '<g transform="translate(200,152)">' +
                    '<rect x="-26" y="-22" width="52" height="72" rx="10" fill="none" stroke="#FFF8F0" stroke-width="5"/>' +
                    '<rect x="-18" y="4" width="36" height="22" rx="4" fill="' + accent + '" opacity="0.88"/>' +
                    '<line x1="0" y1="-22" x2="0" y2="-44" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round"/>' +
                    '<path d="M0,-44 L48,-44 L48,-30" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '<circle cx="48" cy="-24" r="8" fill="' + accent + '"/>' +
                    '</g>'
                );

            case 'press':
                return (
                    '<g transform="translate(200,152)">' +
                    '<rect x="-32" y="-26" width="64" height="74" rx="8" fill="none" stroke="#FFF8F0" stroke-width="5"/>' +
                    '<line x1="-32" y1="20" x2="32" y2="20" stroke="' + accent + '" stroke-width="5"/>' +
                    '<line x1="0" y1="-48" x2="0" y2="20" stroke="#FFF8F0" stroke-width="4" stroke-linecap="round"/>' +
                    '<circle cx="0" cy="-52" r="7" fill="' + accent + '"/>' +
                    '<rect x="-36" y="-32" width="72" height="10" rx="5" fill="#FFF8F0"/>' +
                    '<path d="M32,-12 C56,-12 56,28 32,28" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round"/>' +
                    '</g>'
                );

            case 'tumbler':
                return (
                    '<g transform="translate(200,152)">' +
                    '<path d="M-26,-36 L26,-36 L20,48 C20,53 -20,53 -20,48 Z" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linejoin="round"/>' +
                    '<rect x="-28" y="-48" width="56" height="14" rx="5" fill="' + accent + '"/>' +
                    '<rect x="-18" y="-12" width="36" height="28" rx="6" fill="' + accent + '" opacity="0.85"/>' +
                    '<line x1="-10" y1="2" x2="10" y2="2" stroke="#FFF8F0" stroke-width="3" stroke-linecap="round"/>' +
                    '</g>'
                );

            case 'tote':
                return (
                    '<g transform="translate(200,154)">' +
                    '<path d="M-38,-22 L38,-22 L44,48 L-44,48 Z" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linejoin="round"/>' +
                    '<path d="M-22,-22 C-22,-54 22,-54 22,-22" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round"/>' +
                    '<circle cx="0" cy="14" r="16" fill="' + accent + '" opacity="0.9"/>' +
                    '<path d="M-5,6 C2,10 -2,18 5,22" fill="none" stroke="#FFF8F0" stroke-width="3" stroke-linecap="round"/>' +
                    '</g>'
                );

            case 'apron':
                return (
                    '<g transform="translate(200,152)">' +
                    '<path d="M-24,-34 L24,-34 L28,-6 L42,48 L-42,48 L-28,-6 Z" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linejoin="round"/>' +
                    '<path d="M-18,-34 C-18,-56 18,-56 18,-34" fill="none" stroke="#FFF8F0" stroke-width="4" stroke-linecap="round"/>' +
                    '<rect x="-22" y="10" width="44" height="24" rx="4" fill="' + accent + '" opacity="0.9"/>' +
                    '<line x1="-28" y1="-6" x2="-48" y2="-6" stroke="#FFF8F0" stroke-width="4" stroke-linecap="round"/>' +
                    '<line x1="28" y1="-6" x2="48" y2="-6" stroke="#FFF8F0" stroke-width="4" stroke-linecap="round"/>' +
                    '</g>'
                );

            case 'mug':
            default:
                return (
                    '<g transform="translate(200,154)">' +
                    '<path d="M-32,-24 L26,-24 L26,28 C26,42 -32,42 -32,28 Z" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linejoin="round"/>' +
                    '<path d="M26,-12 C48,-12 48,18 26,18" fill="none" stroke="#FFF8F0" stroke-width="5" stroke-linecap="round"/>' +
                    '<path d="M-16,-40 C-12,-50 -20,-54 -14,-62" fill="none" stroke="' + accent + '" stroke-width="3.5" stroke-linecap="round"/>' +
                    '<path d="M2,-38 C6,-48 -2,-52 4,-60" fill="none" stroke="' + accent + '" stroke-width="3.5" stroke-linecap="round"/>' +
                    '<line x1="-38" y1="44" x2="34" y2="44" stroke="' + accent + '" stroke-width="5" stroke-linecap="round"/>' +
                    '</g>'
                );
        }
    }

    /**
     * Membuat data URI gambar SVG placeholder bertema specialty coffee.
     * Wajib di-encode dengan encodeURIComponent agar karakter '#' warna valid.
     */
    function createProductImage(options) {
        var opts = options || {};
        var category = opts.category || 'Biji Kopi';
        var title = truncateLabel(opts.title || 'KopiKita Pilihan', 26);
        var subtitle = truncateLabel(opts.subtitle || category, 32);

        var paletteByCategory = {
            'Biji Kopi': { bgStart: '#3D2314', bgEnd: '#6F3E22', accent: '#E59F62' },
            'Alat Seduh': { bgStart: '#1D352E', bgEnd: '#355E52', accent: '#E4A86F' },
            'Merchandise': { bgStart: '#332924', bgEnd: '#5D4B41', accent: '#E9B37E' }
        };
        var defaults = paletteByCategory[category] || paletteByCategory['Biji Kopi'];

        var bgStart = opts.bgStart || defaults.bgStart;
        var bgEnd = opts.bgEnd || defaults.bgEnd;
        var accent = opts.accent || defaults.accent;
        var iconMarkup = getIllustrationIcon(opts.icon, category, accent);

        var svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320">' +
            '<defs>' +
            '<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="' + escapeXml(bgStart) + '"/>' +
            '<stop offset="100%" stop-color="' + escapeXml(bgEnd) + '"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<rect width="400" height="320" fill="url(#bgGrad)"/>' +
            '<circle cx="340" cy="48" r="76" fill="' + escapeXml(accent) + '" opacity="0.12"/>' +
            '<circle cx="56" cy="280" r="88" fill="#FFF8F0" opacity="0.06"/>' +
            '<rect x="20" y="20" width="128" height="28" rx="14" fill="#FFF8F0" opacity="0.16"/>' +
            '<text x="84" y="38" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="11.5" font-weight="700" letter-spacing="0.8" fill="#FFF8F0">' +
            escapeXml(category.toUpperCase()) +
            '</text>' +
            iconMarkup +
            '<text x="200" y="256" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="#FFF8F0">' +
            escapeXml(title) +
            '</text>' +
            '<text x="200" y="280" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12.5" fill="' + escapeXml(accent) + '" opacity="0.95">' +
            escapeXml(subtitle) +
            '</text>' +
            '</svg>';

        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }

    var CATEGORIES = [
        {
            slug: 'Biji Kopi',
            nama: 'Biji Kopi',
            deskripsi: 'Single origin Nusantara dan house blend segar sangrai setiap pekan.',
            ikon: 'beans'
        },
        {
            slug: 'Alat Seduh',
            nama: 'Alat Seduh',
            deskripsi: 'Peralatan manual brew presisi untuk ritual seduh kopi di rumah.',
            ikon: 'dripper'
        },
        {
            slug: 'Merchandise',
            nama: 'Merchandise',
            deskripsi: 'Tumbler, mug keramik, dan perlengkapan gaya hidup penikmat kopi.',
            ikon: 'mug'
        }
    ];

    var BASE_TIME = 1763900000000; // Titik waktu dasar agar urutan "Terbaru" konsisten

    var INITIAL_PRODUCTS = [
        {
            id: 'prd-001',
            nama: 'Arabika Aceh Gayo Wine',
            harga: 125000,
            kategori: 'Biji Kopi',
            spesifikasi: '200g • Medium Roast • Winey & Dark Berry',
            deskripsi: 'Diproses dengan fermentasi anaerobik di dataran tinggi Gayo 1.500 mdpl. Menghasilkan aroma buah beri gelap, sentuhan cokelat hitam, dan aftertaste manis yang panjang.',
            stok: 18,
            unggulan: true,
            createdAt: BASE_TIME + 12000,
            gambar: createProductImage({
                title: 'Arabika Aceh Gayo Wine',
                subtitle: '200g • Winey & Dark Berry',
                category: 'Biji Kopi',
                bgStart: '#3B1F14',
                bgEnd: '#703820',
                accent: '#F0A868',
                icon: 'beans'
            })
        },
        {
            id: 'prd-002',
            nama: 'Arabika Toraja Sapan Washed',
            harga: 115000,
            kategori: 'Biji Kopi',
            spesifikasi: '200g • Light-Medium • Rempah & Gula Aren',
            deskripsi: 'Biji arabika khas Toraja Utara dengan proses full washed yang bersih. Profil rasa seimbang dengan aroma rempah lembut, jeruk manis, dan karamel gula aren.',
            stok: 14,
            unggulan: true,
            createdAt: BASE_TIME + 11000,
            gambar: createProductImage({
                title: 'Toraja Sapan Washed',
                subtitle: '200g • Rempah & Gula Aren',
                category: 'Biji Kopi',
                bgStart: '#432818',
                bgEnd: '#7B4B2A',
                accent: '#E9B472',
                icon: 'beans'
            })
        },
        {
            id: 'prd-003',
            nama: 'House Blend KopiKita Espresso',
            harga: 95000,
            kategori: 'Biji Kopi',
            spesifikasi: '250g • Medium-Dark • Cokelat & Kacang Sangrai',
            deskripsi: 'Racikan 70% Arabika Jawa Barat dan 30% Robusta Temanggung untuk krema tebal, body mantap, serta rasa cokelat susu yang cocok untuk kopi susu kekinian maupun espresso.',
            stok: 25,
            unggulan: false,
            createdAt: BASE_TIME + 10000,
            gambar: createProductImage({
                title: 'House Blend Espresso',
                subtitle: '250g • Cokelat & Hazelnut',
                category: 'Biji Kopi',
                bgStart: '#2C1B14',
                bgEnd: '#5B3726',
                accent: '#E29E63',
                icon: 'beans'
            })
        },
        {
            id: 'prd-004',
            nama: 'Arabika Flores Bajawa Honey',
            harga: 145000,
            kategori: 'Biji Kopi',
            spesifikasi: '200g • Medium • Madu Hutan & Aprikot',
            deskripsi: 'Edisi panen terbatas dari lereng Gunung Inerie dengan proses honey. Memberikan tekstur lembut, manis alami madu hutan, dan keasaman buah batu yang cerah.',
            stok: 0,
            unggulan: false,
            createdAt: BASE_TIME + 9000,
            gambar: createProductImage({
                title: 'Flores Bajawa Honey',
                subtitle: '200g • Madu & Aprikot',
                category: 'Biji Kopi',
                bgStart: '#4E2A14',
                bgEnd: '#8B5023',
                accent: '#F5C16C',
                icon: 'beans'
            })
        },
        {
            id: 'prd-005',
            nama: 'Dripper V60 Keramik KopiKita 02',
            harga: 165000,
            kategori: 'Alat Seduh',
            spesifikasi: 'Keramik Tahan Panas • Kapasitas 1-4 Cangkir',
            deskripsi: 'Dripper pour-over berbahan keramik porselen tebal yang menjaga kestabilan suhu ekstraksi. Alur spiral bagian dalam membantu aliran air merata untuk hasil seduhan jernih.',
            stok: 12,
            unggulan: true,
            createdAt: BASE_TIME + 8000,
            gambar: createProductImage({
                title: 'Dripper V60 Keramik 02',
                subtitle: 'Manual Brew • 1-4 Cangkir',
                category: 'Alat Seduh',
                bgStart: '#1D3730',
                bgEnd: '#356155',
                accent: '#E7B079',
                icon: 'dripper'
            })
        },
        {
            id: 'prd-006',
            nama: 'Teko Leher Angsa Stainless 600ml',
            harga: 245000,
            kategori: 'Alat Seduh',
            spesifikasi: 'Baja Tahan Karat 304 • Moncong Presisi',
            deskripsi: 'Teko tuang berkapasitas 600 ml dengan leher angsa presisi untuk kontrol debit air yang halus saat menyeduh V60 atau Kalita. Gagang ergonomis tetap nyaman dan sejuk digenggam.',
            stok: 8,
            unggulan: true,
            createdAt: BASE_TIME + 7000,
            gambar: createProductImage({
                title: 'Teko Leher Angsa 600ml',
                subtitle: 'Stainless 304 • Kontrol Presisi',
                category: 'Alat Seduh',
                bgStart: '#1F2F33',
                bgEnd: '#39555B',
                accent: '#E2A66D',
                icon: 'kettle'
            })
        },
        {
            id: 'prd-007',
            nama: 'Grinder Kopi Manual Burr Baja',
            harga: 320000,
            kategori: 'Alat Seduh',
            spesifikasi: 'CNC Steel Burr • 36 Klik Pengaturan Gilingan',
            deskripsi: 'Penggiling kopi manual portabel dengan conical burr baja tahan karat untuk hasil gilingan konsisten dari espresso hingga French press. Dilengkapi bantalan ganda yang ringan diputar.',
            stok: 6,
            unggulan: true,
            createdAt: BASE_TIME + 6000,
            gambar: createProductImage({
                title: 'Grinder Manual Burr Baja',
                subtitle: '36 Klik • Gilingan Konsisten',
                category: 'Alat Seduh',
                bgStart: '#23312C',
                bgEnd: '#3C544B',
                accent: '#EAB875',
                icon: 'grinder'
            })
        },
        {
            id: 'prd-008',
            nama: 'French Press Kaca Borosilikat 600ml',
            harga: 140000,
            kategori: 'Alat Seduh',
            spesifikasi: 'Kaca Borosilikat • Filter Jaring Ganda',
            deskripsi: 'Alat seduh imersi berkapasitas 600 ml dari kaca borosilikat tahan panas tinggi. Filter ganda stainless steel menahan ampas halus sekaligus mempertahankan minyak alami kopi.',
            stok: 3,
            unggulan: false,
            createdAt: BASE_TIME + 5000,
            gambar: createProductImage({
                title: 'French Press 600ml',
                subtitle: 'Kaca Borosilikat • Filter Ganda',
                category: 'Alat Seduh',
                bgStart: '#203835',
                bgEnd: '#3B665F',
                accent: '#E9AE72',
                icon: 'press'
            })
        },
        {
            id: 'prd-009',
            nama: 'Tumbler Vakum KopiKita 350ml',
            harga: 175000,
            kategori: 'Merchandise',
            spesifikasi: 'Dinding Ganda • Panas 6 Jam / Dingin 12 Jam',
            deskripsi: 'Tumbler insulasi vakum berlapis keramik di bagian dalam sehingga rasa kopi tidak terpengaruh bau logam. Tutup anti bocor, pas untuk dibawa ke kantor maupun perjalanan.',
            stok: 20,
            unggulan: true,
            createdAt: BASE_TIME + 4000,
            gambar: createProductImage({
                title: 'Tumbler Vakum 350ml',
                subtitle: 'Insulasi Ganda • Anti Bocor',
                category: 'Merchandise',
                bgStart: '#2F2520',
                bgEnd: '#5B463B',
                accent: '#EAB37C',
                icon: 'tumbler'
            })
        },
        {
            id: 'prd-010',
            nama: 'Mug Keramik Artisan 280ml',
            harga: 85000,
            kategori: 'Merchandise',
            spesifikasi: 'Stoneware Bakar Tinggi • Glasir Matte Hangat',
            deskripsi: 'Mug keramik buatan perajin lokal dengan bibir cangkir yang nyaman dan pegangan kokoh. Cocok untuk sajian filter coffee, cappuccino, ataupun latte harian Anda.',
            stok: 16,
            unggulan: false,
            createdAt: BASE_TIME + 3000,
            gambar: createProductImage({
                title: 'Mug Keramik Artisan',
                subtitle: '280ml • Glasir Stoneware',
                category: 'Merchandise',
                bgStart: '#3A2A22',
                bgEnd: '#694C3D',
                accent: '#F0BC86',
                icon: 'mug'
            })
        },
        {
            id: 'prd-011',
            nama: 'Tote Bag Kanvas "Seduh Pelan"',
            harga: 65000,
            kategori: 'Merchandise',
            spesifikasi: 'Kanvas Tebal 12oz • Sablon Eksklusif',
            deskripsi: 'Tas belanja dan harian berbahan kanvas katun 12oz yang kuat menampung beberapa kantong biji kopi dan laptop 14 inci. Dilengkapi saku dalam untuk dompet dan kunci.',
            stok: 30,
            unggulan: false,
            createdAt: BASE_TIME + 2000,
            gambar: createProductImage({
                title: 'Tote Bag "Seduh Pelan"',
                subtitle: 'Kanvas 12oz • Saku Dalam',
                category: 'Merchandise',
                bgStart: '#342A23',
                bgEnd: '#5C4A3E',
                accent: '#E7B079',
                icon: 'tote'
            })
        },
        {
            id: 'prd-012',
            nama: 'Apron Barista Kanvas Waxed',
            harga: 195000,
            kategori: 'Merchandise',
            spesifikasi: 'Kanvas Tahan Percikan • Tali Silang Nyaman',
            deskripsi: 'Celemek barista dengan tali silang di punggung agar tidak membebani leher saat menyeduh lama. Dilengkapi dua saku depan fungsional untuk termometer, lap, atau sendok cupping.',
            stok: 9,
            unggulan: false,
            createdAt: BASE_TIME + 1000,
            gambar: createProductImage({
                title: 'Apron Barista Waxed',
                subtitle: 'Kanvas Tahan Percikan',
                category: 'Merchandise',
                bgStart: '#2B221E',
                bgEnd: '#4F3F36',
                accent: '#E8B178',
                icon: 'apron'
            })
        }
    ];

    global.KopiKitaData = {
        CATEGORIES: CATEGORIES,
        INITIAL_PRODUCTS: INITIAL_PRODUCTS,
        createProductImage: createProductImage
    };
})(typeof window !== 'undefined' ? window : globalThis);
