/* ==========================================================================
   KopiKita — Logika Aplikasi Toko Online Mini
   Mengelola tema dark mode, sinkronisasi keranjang, katalog produk, modal detail,
   proses checkout dengan validasi & pengurangan stok, serta panel admin.
   ========================================================================== */

(function () {
    'use strict';

    var STORAGE_KEYS = {
        PRODUCTS: 'kopikita_products',
        CART: 'kopikita_cart',
        ORDERS: 'kopikita_orders',
        THEME: 'kopikita_theme'
    };

    var FREE_SHIPPING_THRESHOLD = 250000;
    var STANDARD_SHIPPING_COST = 20000;
    var VALID_ORDER_STATUSES = ['diproses', 'dikirim', 'selesai'];
    var STATUS_LABELS = {
        diproses: 'Diproses',
        dikirim: 'Dikirim',
        selesai: 'Selesai'
    };

    var currentModalProductId = null;
    var confirmCallback = null;
    var orderConfirmedOnCheckout = false;

    /* ======================================================================
       Utilitas Penyimpanan Aman, Format & Keamanan HTML
       ====================================================================== */

    function safeGetRaw(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (err) {
            return null;
        }
    }

    function safeSetRaw(key, value) {
        try {
            window.localStorage.setItem(key, value);
            return true;
        } catch (err) {
            return false;
        }
    }

    function safeGetJSON(key, fallback) {
        var raw = safeGetRaw(key);
        if (raw === null || raw === '') {
            return fallback;
        }
        try {
            var parsed = JSON.parse(raw);
            return parsed !== null && parsed !== undefined ? parsed : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function safeSetJSON(key, value) {
        try {
            return safeSetRaw(key, JSON.stringify(value));
        } catch (err) {
            return false;
        }
    }

    /**
     * Memformat angka ke format Rupiah konsisten: "Rp 125.000".
     */
    function formatRupiah(angka) {
        var numeric = Math.round(Number(angka) || 0);
        var sign = numeric < 0 ? '-' : '';
        var formatted = String(Math.abs(numeric)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return sign + 'Rp ' + formatted;
    }

    function formatTanggal(isoString) {
        if (!isoString) {
            return '-';
        }
        var date = new Date(isoString);
        if (isNaN(date.getTime())) {
            return '-';
        }
        try {
            return new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (err) {
            return date.toLocaleString();
        }
    }

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isSafeImageUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        var trimmed = url.trim();
        return (
            trimmed.indexOf('data:image/') === 0 ||
            trimmed.indexOf('https://') === 0 ||
            trimmed.indexOf('http://') === 0 ||
            trimmed.indexOf('./') === 0 ||
            trimmed.indexOf('/') === 0
        );
    }

    function showToast(message, type) {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.innerHTML =
            '<span>' + escapeHtml(message) + '</span>' +
            '<button type="button" class="btn btn-ghost btn-sm" aria-label="Tutup notifikasi" style="padding:2px 6px;">&times;</button>';

        var closeBtn = toast.querySelector('button');
        var removeToast = function () {
            if (!toast.parentNode) return;
            toast.classList.add('is-leaving');
            window.setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 200);
        };

        closeBtn.addEventListener('click', removeToast);
        container.appendChild(toast);
        window.setTimeout(removeToast, 3400);
    }

    function calculateShipping(subtotal) {
        if (subtotal <= 0) {
            return 0;
        }
        return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
    }

    /* ======================================================================
       Manajemen Data Produk, Keranjang & Pesanan di localStorage
       ====================================================================== */

    function getSeedProducts() {
        var source = window.KopiKitaData && Array.isArray(window.KopiKitaData.INITIAL_PRODUCTS)
            ? window.KopiKitaData.INITIAL_PRODUCTS
            : [];
        return source.map(function (item) {
            return Object.assign({}, item);
        });
    }

    function generateFallbackImage(nama, kategori, spesifikasi) {
        if (window.KopiKitaData && typeof window.KopiKitaData.createProductImage === 'function') {
            return window.KopiKitaData.createProductImage({
                title: nama,
                subtitle: spesifikasi || kategori,
                category: kategori
            });
        }
        return '';
    }

    function normalizeProduct(raw, index) {
        var nama = String((raw && raw.nama) || 'Produk KopiKita').trim();
        var kategori = String((raw && raw.kategori) || 'Biji Kopi').trim();
        var spesifikasi = String((raw && raw.spesifikasi) || kategori).trim();
        var harga = Math.max(0, Math.round(Number(raw && raw.harga) || 0));
        var stok = Math.max(0, Math.floor(Number(raw && raw.stok) || 0));
        var gambar = raw && isSafeImageUrl(raw.gambar)
            ? raw.gambar.trim()
            : generateFallbackImage(nama, kategori, spesifikasi);

        return {
            id: String((raw && raw.id) || ('prd-' + (index + 1))),
            nama: nama,
            harga: harga,
            kategori: kategori,
            spesifikasi: spesifikasi,
            deskripsi: String((raw && raw.deskripsi) || 'Produk pilihan KopiKita berkualitas tinggi.').trim(),
            stok: stok,
            unggulan: Boolean(raw && raw.unggulan),
            createdAt: Number(raw && raw.createdAt) || Date.now(),
            gambar: gambar
        };
    }

    function getProducts() {
        var raw = safeGetRaw(STORAGE_KEYS.PRODUCTS);
        if (raw === null) {
            var initial = getSeedProducts();
            safeSetJSON(STORAGE_KEYS.PRODUCTS, initial);
            return initial;
        }

        var parsed = safeGetJSON(STORAGE_KEYS.PRODUCTS, null);
        if (!Array.isArray(parsed)) {
            var fallbackSeed = getSeedProducts();
            safeSetJSON(STORAGE_KEYS.PRODUCTS, fallbackSeed);
            return fallbackSeed;
        }

        return parsed.map(normalizeProduct);
    }

    function saveProducts(products) {
        safeSetJSON(STORAGE_KEYS.PRODUCTS, products);
    }

    function getProductById(productId) {
        var products = getProducts();
        for (var i = 0; i < products.length; i += 1) {
            if (products[i].id === productId) {
                return products[i];
            }
        }
        return null;
    }

    function getCart() {
        var rawCart = safeGetJSON(STORAGE_KEYS.CART, []);
        if (!Array.isArray(rawCart)) {
            return [];
        }
        return rawCart
            .filter(function (entry) {
                return entry && typeof entry.productId === 'string' && Number(entry.qty) > 0;
            })
            .map(function (entry) {
                return {
                    productId: entry.productId,
                    qty: Math.max(1, Math.floor(Number(entry.qty)))
                };
            });
    }

    function saveCart(cart) {
        safeSetJSON(STORAGE_KEYS.CART, cart);
    }

    function getCartQtyForProduct(productId) {
        var cart = getCart();
        for (var i = 0; i < cart.length; i += 1) {
            if (cart[i].productId === productId) {
                return cart[i].qty;
            }
        }
        return 0;
    }

    function getCartTotalItems() {
        var cart = getCart();
        return cart.reduce(function (sum, item) {
            return sum + item.qty;
        }, 0);
    }

    /**
     * Memastikan item keranjang tetap valid terhadap daftar produk & stok terkini.
     */
    function syncCartWithProducts() {
        var products = getProducts();
        var productMap = {};
        products.forEach(function (p) {
            productMap[p.id] = p;
        });

        var currentCart = getCart();
        var nextCart = [];
        var removedCount = 0;
        var adjustedCount = 0;

        currentCart.forEach(function (item) {
            var prod = productMap[item.productId];
            if (!prod || prod.stok <= 0) {
                removedCount += 1;
                return;
            }
            if (item.qty > prod.stok) {
                adjustedCount += 1;
                nextCart.push({ productId: item.productId, qty: prod.stok });
            } else {
                nextCart.push(item);
            }
        });

        if (removedCount > 0 || adjustedCount > 0 || nextCart.length !== currentCart.length) {
            saveCart(nextCart);
            updateNavbarCartBadge(false);
        }

        var messages = [];
        if (removedCount > 0) {
            messages.push(removedCount + ' item dihapus dari keranjang karena stok habis atau produk tidak tersedia.');
        }
        if (adjustedCount > 0) {
            messages.push('Jumlah ' + adjustedCount + ' item disesuaikan dengan sisa stok terbaru.');
        }

        return {
            cart: nextCart,
            productMap: productMap,
            messages: messages
        };
    }

    function updateNavbarCartBadge(animate) {
        var totalItems = getCartTotalItems();
        var badges = document.querySelectorAll('[data-cart-badge]');
        badges.forEach(function (badge) {
            badge.textContent = String(totalItems);
            badge.setAttribute('aria-label', totalItems + ' item di keranjang');
            if (animate) {
                badge.classList.remove('bump');
                void badge.offsetWidth;
                badge.classList.add('bump');
            }
        });
    }

    function addToCart(productId, qtyToAdd) {
        var qty = Math.floor(Number(qtyToAdd));
        if (!qty || qty < 1) {
            showToast('Jumlah produk minimal 1.', 'error');
            return false;
        }

        var product = getProductById(productId);
        if (!product) {
            showToast('Produk tidak ditemukan.', 'error');
            return false;
        }

        if (product.stok <= 0) {
            showToast('Maaf, stok "' + product.nama + '" sedang habis.', 'warning');
            return false;
        }

        var cart = getCart();
        var existing = null;
        for (var i = 0; i < cart.length; i += 1) {
            if (cart[i].productId === productId) {
                existing = cart[i];
                break;
            }
        }

        var currentQty = existing ? existing.qty : 0;
        var remaining = product.stok - currentQty;

        if (remaining <= 0) {
            showToast('Stok "' + product.nama + '" di keranjang sudah mencapai batas maksimal (' + product.stok + ').', 'warning');
            return false;
        }

        if (qty > remaining) {
            showToast('Hanya tersisa ' + remaining + ' unit lagi yang bisa ditambahkan untuk "' + product.nama + '".', 'warning');
            return false;
        }

        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ productId: productId, qty: qty });
        }

        saveCart(cart);
        updateNavbarCartBadge(true);
        showToast(qty + 'x "' + product.nama + '" ditambahkan ke keranjang.', 'success');
        return true;
    }

    function updateCartQty(productId, targetQty) {
        var product = getProductById(productId);
        if (!product || product.stok <= 0) {
            removeFromCart(productId, true);
            showToast('Produk dihapus karena stok habis atau tidak tersedia.', 'warning');
            return;
        }

        var parsed = Math.floor(Number(targetQty));
        if (isNaN(parsed) || parsed < 1) {
            parsed = 1;
        }
        if (parsed > product.stok) {
            parsed = product.stok;
            showToast('Maksimal stok tersedia untuk "' + product.nama + '" adalah ' + product.stok + '.', 'warning');
        }

        var cart = getCart();
        var updated = cart.map(function (item) {
            if (item.productId === productId) {
                return { productId: productId, qty: parsed };
            }
            return item;
        });

        saveCart(updated);
        updateNavbarCartBadge(true);
    }

    function removeFromCart(productId, silent) {
        var cart = getCart().filter(function (item) {
            return item.productId !== productId;
        });
        saveCart(cart);
        updateNavbarCartBadge(true);
        if (!silent) {
            showToast('Item dihapus dari keranjang.', 'info');
        }
    }

    function clearCart() {
        saveCart([]);
        updateNavbarCartBadge(true);
    }

    function getOrders() {
        var orders = safeGetJSON(STORAGE_KEYS.ORDERS, []);
        if (!Array.isArray(orders)) {
            return [];
        }
        return orders.slice().sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }

    function saveOrders(orders) {
        safeSetJSON(STORAGE_KEYS.ORDERS, orders);
    }

    function generateOrderNumber() {
        var now = new Date();
        var y = String(now.getFullYear());
        var m = String(now.getMonth() + 1).padStart(2, '0');
        var d = String(now.getDate()).padStart(2, '0');
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var suffix = '';
        for (var i = 0; i < 4; i += 1) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'KK-' + y + m + d + '-' + suffix;
    }

    /**
     * Memvalidasi stok ulang secara atomik sebelum membuat pesanan & mengurangi stok.
     */
    function createOrder(payload) {
        var products = getProducts();
        var cart = getCart();

        if (cart.length === 0) {
            return {
                ok: false,
                reason: 'empty',
                message: 'Keranjang belanja masih kosong.'
            };
        }

        var productMap = {};
        products.forEach(function (p) {
            productMap[p.id] = p;
        });

        var orderItems = [];
        var subtotal = 0;

        for (var i = 0; i < cart.length; i += 1) {
            var item = cart[i];
            var prod = productMap[item.productId];
            if (!prod) {
                return {
                    ok: false,
                    reason: 'stock',
                    message: 'Salah satu produk di keranjang sudah tidak tersedia.'
                };
            }
            if (prod.stok < item.qty) {
                return {
                    ok: false,
                    reason: 'stock',
                    message: 'Stok "' + prod.nama + '" tersisa ' + prod.stok + '. Silakan sesuaikan jumlah di keranjang.'
                };
            }
            var itemSubtotal = prod.harga * item.qty;
            subtotal += itemSubtotal;
            orderItems.push({
                productId: prod.id,
                nama: prod.nama,
                kategori: prod.kategori,
                harga: prod.harga,
                qty: item.qty,
                subtotal: itemSubtotal
            });
        }

        // Kurangi stok produk sesuai jumlah yang dipesan
        var updatedProducts = products.map(function (prod) {
            var ordered = orderItems.find(function (oi) { return oi.productId === prod.id; });
            if (!ordered) {
                return prod;
            }
            return Object.assign({}, prod, {
                stok: Math.max(0, prod.stok - ordered.qty)
            });
        });

        var ongkir = calculateShipping(subtotal);
        var total = subtotal + ongkir;

        var newOrder = {
            id: generateOrderNumber(),
            createdAt: new Date().toISOString(),
            customer: {
                nama: payload.nama,
                hp: payload.hp,
                alamat: payload.alamat,
                catatan: payload.catatan || ''
            },
            metodePembayaran: payload.metodePembayaran,
            items: orderItems,
            subtotal: subtotal,
            ongkir: ongkir,
            total: total,
            status: 'diproses'
        };

        var orders = getOrders();
        orders.unshift(newOrder);

        saveProducts(updatedProducts);
        saveOrders(orders);
        clearCart();

        return {
            ok: true,
            order: newOrder
        };
    }

    function updateOrderStatus(orderId, nextStatus) {
        if (VALID_ORDER_STATUSES.indexOf(nextStatus) === -1) {
            return false;
        }
        var orders = getOrders();
        var updated = false;
        var nextOrders = orders.map(function (order) {
            if (order.id === orderId) {
                updated = true;
                return Object.assign({}, order, { status: nextStatus });
            }
            return order;
        });
        if (updated) {
            saveOrders(nextOrders);
        }
        return updated;
    }

    /* ======================================================================
       Tema Dark Mode & Navigasi Mobile
       ====================================================================== */

    function getThemeIconMarkup(isDark) {
        if (isDark) {
            return (
                '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="4"></circle>' +
                '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>' +
                '</svg>'
            );
        }
        return (
            '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' +
            '</svg>'
        );
    }

    function applyTheme(theme) {
        var isDark = theme === 'dark';
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        safeSetRaw(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');

        var toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = getThemeIconMarkup(isDark);
            toggleBtn.setAttribute(
                'aria-label',
                isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'
            );
            toggleBtn.setAttribute(
                'title',
                isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'
            );
        }
    }

    function initThemeToggle() {
        var saved = safeGetRaw(STORAGE_KEYS.THEME);
        var activeTheme = saved === 'dark' ? 'dark' : 'light';
        applyTheme(activeTheme);

        var toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                var currentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
                applyTheme(currentlyDark ? 'light' : 'dark');
            });
        }
    }

    function initMobileNav() {
        var navToggle = document.getElementById('nav-toggle');
        var navMenu = document.getElementById('nav-menu');
        if (!navToggle || !navMenu) return;

        navToggle.addEventListener('click', function () {
            var isOpen = navMenu.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        navMenu.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                navMenu.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /* ======================================================================
       Komponen Bersama: Kartu Produk & Modal Detail Produk
       ====================================================================== */

    function getStockBadgeHtml(stok) {
        if (stok <= 0) {
            return '<span class="badge badge-out">Stok Habis</span>';
        }
        if (stok <= 5) {
            return '<span class="badge badge-low">Sisa ' + stok + '</span>';
        }
        return '<span class="badge badge-stock">Stok ' + stok + '</span>';
    }

    function createProductCardHtml(product) {
        var isOut = product.stok <= 0;
        var featuredBadge = product.unggulan
            ? '<span class="badge badge-featured">Unggulan</span>'
            : '<span></span>';

        return (
            '<article class="product-card' + (isOut ? ' is-out' : '') + '" data-product-id="' + escapeHtml(product.id) + '">' +
                '<div class="product-media" data-action="open-detail" data-product-id="' + escapeHtml(product.id) + '">' +
                    '<img class="product-card-img" src="' + escapeHtml(product.gambar) + '" alt="' + escapeHtml(product.nama) + '" loading="lazy">' +
                    '<div class="product-badges">' +
                        featuredBadge +
                        getStockBadgeHtml(product.stok) +
                    '</div>' +
                '</div>' +
                '<div class="product-body">' +
                    '<div class="product-meta-row">' +
                        '<span class="badge badge-category">' + escapeHtml(product.kategori) + '</span>' +
                    '</div>' +
                    '<h3 class="product-title" data-action="open-detail" data-product-id="' + escapeHtml(product.id) + '">' +
                        escapeHtml(product.nama) +
                    '</h3>' +
                    '<p class="product-spec">' + escapeHtml(product.spesifikasi || product.deskripsi) + '</p>' +
                    '<div class="product-footer">' +
                        '<div class="product-price-row">' +
                            '<span class="product-price">' + escapeHtml(formatRupiah(product.harga)) + '</span>' +
                            '<span class="product-stock-text">' + (isOut ? 'Habis' : 'Stok: ' + product.stok) + '</span>' +
                        '</div>' +
                        '<div class="product-actions">' +
                            '<button type="button" class="btn btn-outline btn-sm" data-action="open-detail" data-product-id="' + escapeHtml(product.id) + '">Detail</button>' +
                            '<button type="button" class="btn btn-primary btn-sm" data-action="quick-add" data-product-id="' + escapeHtml(product.id) + '"' + (isOut ? ' disabled' : '') + '>' +
                                (isOut ? 'Stok Habis' : '+ Keranjang') +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</article>'
        );
    }

    function refreshProductModalState() {
        var modal = document.getElementById('product-modal');
        if (!modal || !currentModalProductId) return;

        var product = getProductById(currentModalProductId);
        if (!product) {
            closeProductModal();
            return;
        }

        var imgEl = document.getElementById('modal-product-img');
        var catEl = document.getElementById('modal-product-category');
        var stockBadgeEl = document.getElementById('modal-product-stock-badge');
        var titleEl = document.getElementById('modal-product-title');
        var specEl = document.getElementById('modal-product-spec');
        var priceEl = document.getElementById('modal-product-price');
        var descEl = document.getElementById('modal-product-desc');
        var noteEl = document.getElementById('modal-stock-note');
        var qtyInput = document.getElementById('modal-qty-input');
        var minusBtn = document.getElementById('modal-qty-minus');
        var plusBtn = document.getElementById('modal-qty-plus');
        var addBtn = document.getElementById('modal-add-to-cart');

        var inCart = getCartQtyForProduct(product.id);
        var maxAddable = Math.max(0, product.stok - inCart);

        imgEl.src = product.gambar;
        imgEl.alt = product.nama;
        catEl.textContent = product.kategori;
        stockBadgeEl.outerHTML = getStockBadgeHtml(product.stok).replace('<span class="badge', '<span id="modal-product-stock-badge" class="badge');
        titleEl.textContent = product.nama;
        specEl.textContent = product.spesifikasi || '';
        specEl.classList.toggle('hidden', !product.spesifikasi);
        priceEl.textContent = formatRupiah(product.harga);
        descEl.textContent = product.deskripsi;

        if (product.stok <= 0) {
            noteEl.textContent = 'Produk ini sedang habis. Pantau stok terbaru atau tambahkan stok melalui halaman Admin.';
            qtyInput.value = '0';
            qtyInput.disabled = true;
            minusBtn.disabled = true;
            plusBtn.disabled = true;
            addBtn.disabled = true;
            addBtn.textContent = 'Stok Habis';
        } else if (maxAddable <= 0) {
            noteEl.textContent = 'Seluruh stok tersedia (' + product.stok + ' unit) sudah berada di keranjang Anda.';
            qtyInput.value = '0';
            qtyInput.disabled = true;
            minusBtn.disabled = true;
            plusBtn.disabled = true;
            addBtn.disabled = true;
            addBtn.textContent = 'Maksimal di Keranjang';
        } else {
            noteEl.textContent = inCart > 0
                ? 'Stok tersedia: ' + product.stok + ' unit (' + inCart + ' sudah ada di keranjang, maksimal tambah ' + maxAddable + ' lagi).'
                : 'Stok tersedia: ' + product.stok + ' unit siap kirim.';
            qtyInput.disabled = false;
            qtyInput.min = '1';
            qtyInput.max = String(maxAddable);

            var currentVal = Math.floor(Number(qtyInput.value)) || 1;
            if (currentVal < 1) currentVal = 1;
            if (currentVal > maxAddable) currentVal = maxAddable;
            qtyInput.value = String(currentVal);

            minusBtn.disabled = currentVal <= 1;
            plusBtn.disabled = currentVal >= maxAddable;
            addBtn.disabled = false;
            addBtn.textContent = 'Tambah ke Keranjang';
        }
    }

    function openProductModal(productId) {
        var modal = document.getElementById('product-modal');
        if (!modal) return;
        var product = getProductById(productId);
        if (!product) {
            showToast('Produk tidak ditemukan.', 'error');
            return;
        }
        currentModalProductId = productId;
        var qtyInput = document.getElementById('modal-qty-input');
        if (qtyInput) qtyInput.value = '1';

        refreshProductModalState();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeProductModal() {
        var modal = document.getElementById('product-modal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        currentModalProductId = null;
        document.body.style.overflow = '';
    }

    function initProductModal() {
        var modal = document.getElementById('product-modal');
        if (!modal) return;

        var closeBtn = document.getElementById('modal-close-btn');
        var minusBtn = document.getElementById('modal-qty-minus');
        var plusBtn = document.getElementById('modal-qty-plus');
        var qtyInput = document.getElementById('modal-qty-input');
        var addBtn = document.getElementById('modal-add-to-cart');

        closeBtn.addEventListener('click', closeProductModal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeProductModal();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeProductModal();
            }
        });

        function clampModalQty(val) {
            var product = currentModalProductId ? getProductById(currentModalProductId) : null;
            if (!product) return 1;
            var maxAddable = Math.max(1, product.stok - getCartQtyForProduct(product.id));
            var parsed = Math.floor(Number(val));
            if (isNaN(parsed) || parsed < 1) parsed = 1;
            if (parsed > maxAddable) parsed = maxAddable;
            qtyInput.value = String(parsed);
            minusBtn.disabled = parsed <= 1;
            plusBtn.disabled = parsed >= maxAddable;
            return parsed;
        }

        minusBtn.addEventListener('click', function () {
            clampModalQty((Number(qtyInput.value) || 1) - 1);
        });

        plusBtn.addEventListener('click', function () {
            clampModalQty((Number(qtyInput.value) || 1) + 1);
        });

        qtyInput.addEventListener('change', function () {
            clampModalQty(qtyInput.value);
        });

        addBtn.addEventListener('click', function () {
            if (!currentModalProductId) return;
            var qty = clampModalQty(qtyInput.value);
            if (addToCart(currentModalProductId, qty)) {
                closeProductModal();
            } else {
                refreshProductModalState();
            }
        });
    }

    function bindProductGridEvents(containerEl) {
        if (!containerEl) return;
        containerEl.addEventListener('click', function (e) {
            var actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;
            var action = actionEl.getAttribute('data-action');
            var productId = actionEl.getAttribute('data-product-id');
            if (!productId) return;

            if (action === 'open-detail') {
                openProductModal(productId);
            } else if (action === 'quick-add') {
                addToCart(productId, 1);
            }
        });
    }

    /* ======================================================================
       Modal Konfirmasi Bersama (Keranjang & Admin)
       ====================================================================== */

    function openConfirmModal(title, message, confirmLabel, onConfirm) {
        var modal = document.getElementById('confirm-modal');
        if (!modal) {
            if (typeof onConfirm === 'function') onConfirm();
            return;
        }
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        var okBtn = document.getElementById('confirm-modal-ok');
        okBtn.textContent = confirmLabel || 'Ya, Lanjutkan';
        confirmCallback = onConfirm;

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeConfirmModal() {
        var modal = document.getElementById('confirm-modal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        confirmCallback = null;
        document.body.style.overflow = '';
    }

    function initConfirmModal() {
        var modal = document.getElementById('confirm-modal');
        if (!modal) return;

        var cancelBtn = document.getElementById('confirm-modal-cancel');
        var closeBtn = document.getElementById('confirm-modal-close');
        var okBtn = document.getElementById('confirm-modal-ok');

        cancelBtn.addEventListener('click', closeConfirmModal);
        if (closeBtn) closeBtn.addEventListener('click', closeConfirmModal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeConfirmModal();
        });

        okBtn.addEventListener('click', function () {
            var fn = confirmCallback;
            closeConfirmModal();
            if (typeof fn === 'function') fn();
        });
    }

    /* ======================================================================
       Halaman Beranda (index.html)
       ====================================================================== */

    function getCategoryIconSvg(slug) {
        if (slug === 'Biji Kopi') {
            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="12" rx="7" ry="10" transform="rotate(-24 12 12)"/><path d="M9 4c2 5-2 10 2 16"/></svg>';
        }
        if (slug === 'Alat Seduh') {
            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5h14l-4.5 9h-5L5 5z"/><path d="M7 19h10"/><path d="M18 7c2 0 3 1.5 3 3s-1 3-3 3"/></svg>';
        }
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z"/><path d="M16 11h2a3 3 0 0 1 0 6h-2"/><path d="M9 4c0 1.5 1.5 1.5 1.5 3"/><path d="M13 4c0 1.5 1.5 1.5 1.5 3"/></svg>';
    }

    function initHomePage() {
        var products = getProducts();
        var categoriesContainer = document.getElementById('home-categories');
        var featuredContainer = document.getElementById('home-featured-products');
        var heroShowcaseEl = document.getElementById('home-hero-featured');

        // Render showcase hero menggunakan produk unggulan pertama yang tersedia
        if (heroShowcaseEl) {
            var spotlight = products.find(function (p) { return p.unggulan && p.stok > 0; }) || products[0];
            if (spotlight) {
                heroShowcaseEl.innerHTML =
                    '<img class="hero-showcase-img" src="' + escapeHtml(spotlight.gambar) + '" alt="' + escapeHtml(spotlight.nama) + '">' +
                    '<div class="hero-showcase-meta">' +
                        '<div>' +
                            '<span class="badge badge-category">' + escapeHtml(spotlight.kategori) + '</span>' +
                            '<h3 class="hero-showcase-title" style="margin-top:6px;">' + escapeHtml(spotlight.nama) + '</h3>' +
                            '<p class="hero-showcase-sub">' + escapeHtml(spotlight.spesifikasi || '') + '</p>' +
                        '</div>' +
                        '<div style="text-align:right;">' +
                            '<div class="product-price">' + escapeHtml(formatRupiah(spotlight.harga)) + '</div>' +
                            '<button type="button" class="btn btn-outline btn-sm" style="margin-top:6px;" data-action="open-detail" data-product-id="' + escapeHtml(spotlight.id) + '">Lihat Detail</button>' +
                        '</div>' +
                    '</div>';
                bindProductGridEvents(heroShowcaseEl);
            }
        }

        // Render daftar kategori dengan jumlah produk aktif
        if (categoriesContainer) {
            var categories = window.KopiKitaData && Array.isArray(window.KopiKitaData.CATEGORIES)
                ? window.KopiKitaData.CATEGORIES
                : [];

            categoriesContainer.innerHTML = categories.map(function (cat) {
                var count = products.filter(function (p) { return p.kategori === cat.nama; }).length;
                return (
                    '<a class="category-card" href="produk.html?kategori=' + encodeURIComponent(cat.nama) + '">' +
                        '<div>' +
                            '<div class="category-top">' +
                                '<div class="category-icon">' + getCategoryIconSvg(cat.slug) + '</div>' +
                                '<span class="category-count">' + count + ' Produk</span>' +
                            '</div>' +
                            '<h3 class="category-name" style="margin-top:16px;">' + escapeHtml(cat.nama) + '</h3>' +
                            '<p class="category-desc">' + escapeHtml(cat.deskripsi) + '</p>' +
                        '</div>' +
                        '<span class="category-link">Jelajahi ' + escapeHtml(cat.nama) + ' &rarr;</span>' +
                    '</a>'
                );
            }).join('');
        }

        // Render produk unggulan (fallback ke 4 produk pertama bila belum ada yang ditandai unggulan)
        if (featuredContainer) {
            var featured = products.filter(function (p) { return p.unggulan; });
            if (featured.length === 0) {
                featured = products.slice(0, 4);
            }
            if (featured.length === 0) {
                featuredContainer.innerHTML =
                    '<div class="empty-state" style="grid-column:1/-1;">' +
                        '<h3 class="empty-title">Belum Ada Produk</h3>' +
                        '<p class="empty-desc">Tambahkan produk melalui halaman Admin untuk menampilkannya di sini.</p>' +
                        '<a href="admin.html" class="btn btn-primary">Buka Panel Admin</a>' +
                    '</div>';
            } else {
                featuredContainer.innerHTML = featured.slice(0, 8).map(createProductCardHtml).join('');
                bindProductGridEvents(featuredContainer);
            }
        }
    }

    /* ======================================================================
       Halaman Katalog Produk (produk.html)
       ====================================================================== */

    function initProdukPage() {
        var gridEl = document.getElementById('catalog-grid');
        var emptyEl = document.getElementById('catalog-empty');
        var countEl = document.getElementById('catalog-result-count');
        var searchInput = document.getElementById('filter-search');
        var categorySelect = document.getElementById('filter-category');
        var minPriceInput = document.getElementById('filter-min-price');
        var maxPriceInput = document.getElementById('filter-max-price');
        var sortSelect = document.getElementById('filter-sort');
        var resetBtn = document.getElementById('filter-reset-btn');
        var emptyResetBtn = document.getElementById('catalog-empty-reset');
        var presetButtons = document.querySelectorAll('[data-price-preset]');

        // Baca parameter ?kategori= dari URL jika datang dari halaman utama
        var params = new URLSearchParams(window.location.search);
        var initialCategory = params.get('kategori');
        if (initialCategory && categorySelect) {
            for (var i = 0; i < categorySelect.options.length; i += 1) {
                if (categorySelect.options[i].value === initialCategory) {
                    categorySelect.value = initialCategory;
                    break;
                }
            }
        }

        function updatePresetActiveState() {
            var minVal = minPriceInput.value.trim();
            var maxVal = maxPriceInput.value.trim();
            presetButtons.forEach(function (btn) {
                var preset = btn.getAttribute('data-price-preset');
                var isMatch = false;
                if (preset === 'all' && !minVal && !maxVal) isMatch = true;
                else if (preset === 'under-100' && minVal === '' && maxVal === '100000') isMatch = true;
                else if (preset === '100-200' && minVal === '100000' && maxVal === '200000') isMatch = true;
                else if (preset === 'over-200' && minVal === '200000' && maxVal === '') isMatch = true;
                btn.classList.toggle('active', isMatch);
            });
        }

        function applyFiltersAndRender() {
            var allProducts = getProducts();
            var query = searchInput.value.trim().toLowerCase();
            var category = categorySelect.value;
            var minPrice = minPriceInput.value !== '' ? Math.max(0, Number(minPriceInput.value)) : null;
            var maxPrice = maxPriceInput.value !== '' ? Math.max(0, Number(maxPriceInput.value)) : null;
            var sortBy = sortSelect.value;

            var filtered = allProducts.filter(function (product) {
                if (category !== 'Semua' && product.kategori !== category) {
                    return false;
                }
                if (query) {
                    var haystack = (
                        product.nama + ' ' +
                        product.kategori + ' ' +
                        (product.spesifikasi || '') + ' ' +
                        product.deskripsi
                    ).toLowerCase();
                    if (haystack.indexOf(query) === -1) {
                        return false;
                    }
                }
                if (minPrice !== null && !isNaN(minPrice) && product.harga < minPrice) {
                    return false;
                }
                if (maxPrice !== null && !isNaN(maxPrice) && product.harga > maxPrice) {
                    return false;
                }
                return true;
            });

            filtered.sort(function (a, b) {
                if (sortBy === 'termurah') {
                    return a.harga - b.harga;
                }
                if (sortBy === 'termahal') {
                    return b.harga - a.harga;
                }
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            updatePresetActiveState();

            countEl.textContent = 'Menampilkan ' + filtered.length + ' dari ' + allProducts.length + ' produk';

            if (filtered.length === 0) {
                gridEl.innerHTML = '';
                gridEl.classList.add('hidden');
                emptyEl.classList.remove('hidden');
            } else {
                emptyEl.classList.add('hidden');
                gridEl.classList.remove('hidden');
                gridEl.innerHTML = filtered.map(createProductCardHtml).join('');
            }
        }

        function resetAllFilters() {
            searchInput.value = '';
            categorySelect.value = 'Semua';
            minPriceInput.value = '';
            maxPriceInput.value = '';
            sortSelect.value = 'terbaru';
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
            }
            applyFiltersAndRender();
        }

        searchInput.addEventListener('input', applyFiltersAndRender);
        categorySelect.addEventListener('change', applyFiltersAndRender);
        minPriceInput.addEventListener('input', applyFiltersAndRender);
        maxPriceInput.addEventListener('input', applyFiltersAndRender);
        sortSelect.addEventListener('change', applyFiltersAndRender);
        resetBtn.addEventListener('click', resetAllFilters);
        if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);

        presetButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var preset = btn.getAttribute('data-price-preset');
                if (preset === 'all') {
                    minPriceInput.value = '';
                    maxPriceInput.value = '';
                } else if (preset === 'under-100') {
                    minPriceInput.value = '';
                    maxPriceInput.value = '100000';
                } else if (preset === '100-200') {
                    minPriceInput.value = '100000';
                    maxPriceInput.value = '200000';
                } else if (preset === 'over-200') {
                    minPriceInput.value = '200000';
                    maxPriceInput.value = '';
                }
                applyFiltersAndRender();
            });
        });

        bindProductGridEvents(gridEl);
        applyFiltersAndRender();
    }

    /* ======================================================================
       Halaman Keranjang (keranjang.html)
       ====================================================================== */

    function initKeranjangPage() {
        var contentEl = document.getElementById('cart-content');
        var emptyEl = document.getElementById('cart-empty');
        var listEl = document.getElementById('cart-items-list');
        var countLabelEl = document.getElementById('cart-item-count-label');
        var subtotalEl = document.getElementById('summary-subtotal');
        var shippingEl = document.getElementById('summary-shipping');
        var totalEl = document.getElementById('summary-total');
        var progressTextEl = document.getElementById('shipping-progress-text');
        var progressFillEl = document.getElementById('shipping-progress-fill');
        var clearCartBtn = document.getElementById('clear-cart-btn');

        function renderCart() {
            var synced = syncCartWithProducts();
            synced.messages.forEach(function (msg) {
                showToast(msg, 'warning');
            });

            var cart = synced.cart;
            var productMap = synced.productMap;

            if (cart.length === 0) {
                contentEl.classList.add('hidden');
                emptyEl.classList.remove('hidden');
                return;
            }

            emptyEl.classList.add('hidden');
            contentEl.classList.remove('hidden');

            var totalQty = 0;
            var subtotal = 0;

            listEl.innerHTML = cart.map(function (item) {
                var product = productMap[item.productId];
                var lineTotal = product.harga * item.qty;
                totalQty += item.qty;
                subtotal += lineTotal;

                return (
                    '<div class="cart-item" data-product-id="' + escapeHtml(product.id) + '">' +
                        '<img class="cart-item-img" src="' + escapeHtml(product.gambar) + '" alt="' + escapeHtml(product.nama) + '">' +
                        '<div>' +
                            '<span class="badge badge-category" style="margin-bottom:6px;">' + escapeHtml(product.kategori) + '</span>' +
                            '<h3 class="cart-item-title">' + escapeHtml(product.nama) + '</h3>' +
                            '<div class="cart-item-price">' + escapeHtml(formatRupiah(product.harga)) + ' / unit &bull; Stok tersedia: ' + product.stok + '</div>' +
                        '</div>' +
                        '<div class="cart-item-right">' +
                            '<div class="cart-item-subtotal">' + escapeHtml(formatRupiah(lineTotal)) + '</div>' +
                            '<div class="cart-item-actions">' +
                                '<div class="qty-stepper">' +
                                    '<button type="button" class="qty-btn" data-cart-action="minus" data-product-id="' + escapeHtml(product.id) + '"' + (item.qty <= 1 ? ' disabled' : '') + ' aria-label="Kurangi jumlah">-</button>' +
                                    '<input type="number" class="qty-input" data-cart-qty-input data-product-id="' + escapeHtml(product.id) + '" value="' + item.qty + '" min="1" max="' + product.stok + '" aria-label="Jumlah ' + escapeHtml(product.nama) + '">' +
                                    '<button type="button" class="qty-btn" data-cart-action="plus" data-product-id="' + escapeHtml(product.id) + '"' + (item.qty >= product.stok ? ' disabled' : '') + ' aria-label="Tambah jumlah">+</button>' +
                                '</div>' +
                                '<button type="button" class="btn btn-outline btn-sm" data-cart-action="remove" data-product-id="' + escapeHtml(product.id) + '" aria-label="Hapus ' + escapeHtml(product.nama) + '">Hapus</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
            }).join('');

            var ongkir = calculateShipping(subtotal);
            var total = subtotal + ongkir;

            countLabelEl.textContent = totalQty + ' item';
            subtotalEl.textContent = formatRupiah(subtotal);
            shippingEl.textContent = ongkir === 0 ? 'Gratis' : formatRupiah(ongkir);
            totalEl.textContent = formatRupiah(total);

            var progressPct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
            progressFillEl.style.width = progressPct + '%';

            if (subtotal >= FREE_SHIPPING_THRESHOLD) {
                progressTextEl.innerHTML = 'Selamat! Anda mendapatkan <strong>Gratis Ongkir</strong> untuk pesanan ini.';
            } else {
                var selisih = FREE_SHIPPING_THRESHOLD - subtotal;
                progressTextEl.innerHTML = 'Tambah belanja <strong>' + escapeHtml(formatRupiah(selisih)) + '</strong> lagi untuk mendapatkan Gratis Ongkir.';
            }
        }

        listEl.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-cart-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-cart-action');
            var productId = btn.getAttribute('data-product-id');
            var currentQty = getCartQtyForProduct(productId);

            if (action === 'minus') {
                updateCartQty(productId, currentQty - 1);
                renderCart();
            } else if (action === 'plus') {
                updateCartQty(productId, currentQty + 1);
                renderCart();
            } else if (action === 'remove') {
                removeFromCart(productId, false);
                renderCart();
            }
        });

        listEl.addEventListener('change', function (e) {
            if (!e.target.matches('[data-cart-qty-input]')) return;
            var productId = e.target.getAttribute('data-product-id');
            updateCartQty(productId, e.target.value);
            renderCart();
        });

        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', function () {
                openConfirmModal(
                    'Kosongkan Keranjang?',
                    'Semua produk di keranjang belanja Anda akan dihapus.',
                    'Kosongkan',
                    function () {
                        clearCart();
                        showToast('Keranjang belanja telah dikosongkan.', 'info');
                        renderCart();
                    }
                );
            });
        }

        renderCart();
    }

    /* ======================================================================
       Halaman Checkout & Konfirmasi Pesanan (checkout.html)
       ====================================================================== */

    function initCheckoutPage() {
        var emptyEl = document.getElementById('checkout-empty');
        var mainEl = document.getElementById('checkout-main');
        var confirmEl = document.getElementById('checkout-confirmation');

        var form = document.getElementById('checkout-form');
        var nameInput = document.getElementById('checkout-name');
        var phoneInput = document.getElementById('checkout-phone');
        var addressInput = document.getElementById('checkout-address');
        var notesInput = document.getElementById('checkout-notes');
        var paymentInputs = document.querySelectorAll('input[name="metodePembayaran"]');
        var paymentInfoBox = document.getElementById('payment-info-box');

        var summaryItemsEl = document.getElementById('checkout-summary-items');
        var subtotalEl = document.getElementById('checkout-subtotal');
        var shippingEl = document.getElementById('checkout-shipping');
        var totalEl = document.getElementById('checkout-total');

        var paymentDescriptions = {
            'Transfer Bank': 'Transfer ke rekening BCA 8810-2234-55 a.n. PT KopiKita Nusantara. Pesanan langsung diproses setelah verifikasi otomatis.',
            'COD': 'Bayar tunai atau QRIS langsung kepada kurir saat paket kopi tiba di alamat tujuan Anda.',
            'E-Wallet': 'Mendukung GoPay, OVO, DANA, dan ShopeePay melalui kode QRIS instan setelah pesanan dibuat.'
        };

        function setFieldError(inputEl, errorElId, message) {
            var errorEl = document.getElementById(errorElId);
            if (inputEl) {
                inputEl.classList.toggle('is-invalid', Boolean(message));
            }
            if (errorEl) {
                errorEl.textContent = message || '';
            }
        }

        function getSelectedPayment() {
            for (var i = 0; i < paymentInputs.length; i += 1) {
                if (paymentInputs[i].checked) {
                    return paymentInputs[i].value;
                }
            }
            return '';
        }

        function updatePaymentHint() {
            var selected = getSelectedPayment();
            if (!paymentInfoBox) return;
            if (selected && paymentDescriptions[selected]) {
                paymentInfoBox.textContent = paymentDescriptions[selected];
            } else {
                paymentInfoBox.textContent = 'Pilih metode pembayaran untuk melihat instruksi penyelesaian transaksi.';
            }
        }

        function validateName() {
            var val = nameInput.value.trim();
            if (!val) {
                setFieldError(nameInput, 'error-name', 'Nama lengkap wajib diisi.');
                return false;
            }
            if (val.length < 3) {
                setFieldError(nameInput, 'error-name', 'Nama lengkap minimal 3 karakter.');
                return false;
            }
            setFieldError(nameInput, 'error-name', '');
            return true;
        }

        function validatePhone() {
            var raw = phoneInput.value.trim();
            var normalized = raw.replace(/[\s\-()]/g, '');
            if (!raw) {
                setFieldError(phoneInput, 'error-phone', 'Nomor HP wajib diisi.');
                return false;
            }
            if (!/^(\+?62|0)[0-9]{8,13}$/.test(normalized)) {
                setFieldError(phoneInput, 'error-phone', 'Masukkan nomor HP Indonesia yang valid (contoh: 081234567890).');
                return false;
            }
            setFieldError(phoneInput, 'error-phone', '');
            return true;
        }

        function validateAddress() {
            var val = addressInput.value.trim();
            if (!val) {
                setFieldError(addressInput, 'error-address', 'Alamat pengiriman wajib diisi.');
                return false;
            }
            if (val.length < 15) {
                setFieldError(addressInput, 'error-address', 'Mohon isi alamat lengkap (minimal 15 karakter beserta patokan/kode pos).');
                return false;
            }
            setFieldError(addressInput, 'error-address', '');
            return true;
        }

        function validatePayment() {
            var selected = getSelectedPayment();
            var errorEl = document.getElementById('error-payment');
            if (!selected) {
                if (errorEl) errorEl.textContent = 'Silakan pilih salah satu metode pembayaran.';
                return false;
            }
            if (errorEl) errorEl.textContent = '';
            return true;
        }

        function renderCheckoutSummary() {
            if (orderConfirmedOnCheckout) {
                return;
            }

            var synced = syncCartWithProducts();
            synced.messages.forEach(function (msg) {
                showToast(msg, 'warning');
            });

            var cart = synced.cart;
            var productMap = synced.productMap;

            if (cart.length === 0) {
                mainEl.classList.add('hidden');
                confirmEl.classList.add('hidden');
                emptyEl.classList.remove('hidden');
                return;
            }

            emptyEl.classList.add('hidden');
            confirmEl.classList.add('hidden');
            mainEl.classList.remove('hidden');

            var subtotal = 0;
            summaryItemsEl.innerHTML = cart.map(function (item) {
                var product = productMap[item.productId];
                var lineTotal = product.harga * item.qty;
                subtotal += lineTotal;
                return (
                    '<div class="checkout-summary-item">' +
                        '<div>' +
                            '<div class="checkout-summary-name">' + escapeHtml(product.nama) + '</div>' +
                            '<div class="checkout-summary-qty">' + item.qty + ' x ' + escapeHtml(formatRupiah(product.harga)) + '</div>' +
                        '</div>' +
                        '<strong>' + escapeHtml(formatRupiah(lineTotal)) + '</strong>' +
                    '</div>'
                );
            }).join('');

            var ongkir = calculateShipping(subtotal);
            subtotalEl.textContent = formatRupiah(subtotal);
            shippingEl.textContent = ongkir === 0 ? 'Gratis' : formatRupiah(ongkir);
            totalEl.textContent = formatRupiah(subtotal + ongkir);
        }

        function showOrderConfirmation(order) {
            orderConfirmedOnCheckout = true;
            mainEl.classList.add('hidden');
            emptyEl.classList.add('hidden');
            confirmEl.classList.remove('hidden');

            document.getElementById('confirm-order-id').textContent = order.id;

            var detailsEl = document.getElementById('confirm-details-box');
            var itemsHtml = order.items.map(function (item) {
                return (
                    '<div class="summary-row">' +
                        '<span>' + escapeHtml(item.nama) + ' (&times;' + item.qty + ')</span>' +
                        '<strong>' + escapeHtml(formatRupiah(item.subtotal)) + '</strong>' +
                    '</div>'
                );
            }).join('');

            detailsEl.innerHTML =
                '<div class="summary-row"><span>Tanggal Pesanan</span><strong>' + escapeHtml(formatTanggal(order.createdAt)) + '</strong></div>' +
                '<div class="summary-row"><span>Penerima</span><strong>' + escapeHtml(order.customer.nama) + ' (' + escapeHtml(order.customer.hp) + ')</strong></div>' +
                '<div class="summary-row"><span>Alamat Kirim</span><strong style="text-align:right;max-width:65%;">' + escapeHtml(order.customer.alamat) + '</strong></div>' +
                '<div class="summary-row"><span>Metode Pembayaran</span><strong>' + escapeHtml(order.metodePembayaran) + '</strong></div>' +
                '<div class="summary-row"><span>Status Awal</span><span class="badge badge-status-diproses">Diproses</span></div>' +
                '<hr style="border:none;border-top:1px solid var(--border);margin:6px 0;">' +
                itemsHtml +
                '<div class="summary-row"><span>Ongkos Kirim</span><strong>' + (order.ongkir === 0 ? 'Gratis' : escapeHtml(formatRupiah(order.ongkir))) + '</strong></div>' +
                '<div class="summary-row" style="font-size:1.05rem;color:var(--primary);"><strong>Total Pembayaran</strong><strong>' + escapeHtml(formatRupiah(order.total)) + '</strong></div>';

            var copyBtn = document.getElementById('copy-order-id-btn');
            if (copyBtn) {
                copyBtn.onclick = function () {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(order.id).then(function () {
                            showToast('Nomor pesanan disalin ke clipboard.', 'success');
                        }).catch(function () {
                            showToast('Nomor pesanan: ' + order.id, 'info');
                        });
                    } else {
                        showToast('Nomor pesanan: ' + order.id, 'info');
                    }
                };
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        nameInput.addEventListener('blur', validateName);
        phoneInput.addEventListener('blur', validatePhone);
        addressInput.addEventListener('blur', validateAddress);

        paymentInputs.forEach(function (radio) {
            radio.addEventListener('change', function () {
                validatePayment();
                updatePaymentHint();
            });
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var okName = validateName();
            var okPhone = validatePhone();
            var okAddress = validateAddress();
            var okPayment = validatePayment();

            if (!okName || !okPhone || !okAddress || !okPayment) {
                showToast('Mohon lengkapi seluruh kolom checkout dengan benar.', 'error');
                return;
            }

            var result = createOrder({
                nama: nameInput.value.trim(),
                hp: phoneInput.value.trim(),
                alamat: addressInput.value.trim(),
                catatan: notesInput ? notesInput.value.trim() : '',
                metodePembayaran: getSelectedPayment()
            });

            if (!result.ok) {
                showToast(result.message, 'error');
                renderCheckoutSummary();
                return;
            }

            showToast('Pesanan berhasil dibuat!', 'success');
            showOrderConfirmation(result.order);
        });

        updatePaymentHint();
        renderCheckoutSummary();
    }

    /* ======================================================================
       Halaman Admin (admin.html)
       ====================================================================== */

    function initAdminPage() {
        var tabButtons = document.querySelectorAll('[data-admin-tab]');
        var ordersPanel = document.getElementById('admin-orders-panel');
        var productsPanel = document.getElementById('admin-products-panel');

        var kpiOrdersEl = document.getElementById('kpi-orders');
        var kpiPendingEl = document.getElementById('kpi-pending');
        var kpiRevenueEl = document.getElementById('kpi-revenue');
        var kpiProductsEl = document.getElementById('kpi-products');

        var orderFilterEl = document.getElementById('admin-order-filter');
        var ordersListEl = document.getElementById('admin-orders-list');
        var ordersEmptyEl = document.getElementById('admin-orders-empty');

        var productSearchEl = document.getElementById('admin-product-search');
        var productsTbodyEl = document.getElementById('admin-products-tbody');
        var productsTableWrap = document.getElementById('admin-products-table-wrap');
        var productsEmptyEl = document.getElementById('admin-products-empty');

        var addProductBtn = document.getElementById('admin-add-product-btn');
        var resetDemoBtn = document.getElementById('admin-reset-demo-btn');

        var productModal = document.getElementById('admin-product-modal');
        var productModalTitle = document.getElementById('admin-product-modal-title');
        var productModalClose = document.getElementById('admin-product-modal-close');
        var productModalCancel = document.getElementById('admin-product-modal-cancel');
        var productForm = document.getElementById('admin-product-form');

        var fieldId = document.getElementById('admin-prod-id');
        var fieldName = document.getElementById('admin-prod-name');
        var fieldCategory = document.getElementById('admin-prod-category');
        var fieldPrice = document.getElementById('admin-prod-price');
        var fieldStock = document.getElementById('admin-prod-stock');
        var fieldSpec = document.getElementById('admin-prod-spec');
        var fieldImage = document.getElementById('admin-prod-image');
        var fieldDesc = document.getElementById('admin-prod-desc');
        var fieldFeatured = document.getElementById('admin-prod-featured');

        function renderKpis() {
            var orders = getOrders();
            var products = getProducts();
            var pendingCount = orders.filter(function (o) { return o.status === 'diproses'; }).length;
            var totalRevenue = orders.reduce(function (sum, o) { return sum + (Number(o.total) || 0); }, 0);

            kpiOrdersEl.textContent = String(orders.length);
            kpiPendingEl.textContent = String(pendingCount);
            kpiRevenueEl.textContent = formatRupiah(totalRevenue);
            kpiProductsEl.textContent = String(products.length);
        }

        function renderOrders() {
            var orders = getOrders();
            var filter = orderFilterEl.value;
            var filtered = orders.filter(function (order) {
                return filter === 'semua' || order.status === filter;
            });

            if (filtered.length === 0) {
                ordersListEl.innerHTML = '';
                ordersEmptyEl.classList.remove('hidden');
                return;
            }

            ordersEmptyEl.classList.add('hidden');
            ordersListEl.innerHTML = filtered.map(function (order) {
                var statusClass = 'badge-status-' + (VALID_ORDER_STATUSES.indexOf(order.status) !== -1 ? order.status : 'diproses');
                var statusLabel = STATUS_LABELS[order.status] || 'Diproses';
                var itemsHtml = order.items.map(function (item) {
                    return (
                        '<div class="summary-row" style="font-size:0.86rem;">' +
                            '<span>' + escapeHtml(item.nama) + ' &times; ' + item.qty + '</span>' +
                            '<strong>' + escapeHtml(formatRupiah(item.subtotal)) + '</strong>' +
                        '</div>'
                    );
                }).join('');

                return (
                    '<article class="order-card">' +
                        '<div class="order-card-header">' +
                            '<div>' +
                                '<h3 class="order-card-id">' + escapeHtml(order.id) + '</h3>' +
                                '<span class="order-card-date">' + escapeHtml(formatTanggal(order.createdAt)) + ' &bull; ' + escapeHtml(order.metodePembayaran) + '</span>' +
                            '</div>' +
                            '<span class="badge ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>' +
                        '</div>' +
                        '<div class="order-card-body">' +
                            '<div class="order-customer-meta">' +
                                '<div><strong>Pemesan:</strong> ' + escapeHtml(order.customer.nama) + '</div>' +
                                '<div><strong>No. HP:</strong> ' + escapeHtml(order.customer.hp) + '</div>' +
                                '<div><strong>Alamat:</strong> ' + escapeHtml(order.customer.alamat) + '</div>' +
                                (order.customer.catatan ? '<div><strong>Catatan:</strong> ' + escapeHtml(order.customer.catatan) + '</div>' : '') +
                            '</div>' +
                            '<div class="order-items-mini">' +
                                itemsHtml +
                                '<hr style="border:none;border-top:1px solid var(--border);margin:4px 0;">' +
                                '<div class="summary-row" style="font-size:0.85rem;"><span>Ongkir</span><span>' + (order.ongkir === 0 ? 'Gratis' : escapeHtml(formatRupiah(order.ongkir))) + '</span></div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="order-card-footer">' +
                            '<div>Total Pesanan: <strong style="color:var(--primary);font-size:1.05rem;">' + escapeHtml(formatRupiah(order.total)) + '</strong></div>' +
                            '<div class="order-status-control">' +
                                '<label for="status-' + escapeHtml(order.id) + '" class="filter-label">Ubah Status:</label>' +
                                '<select id="status-' + escapeHtml(order.id) + '" class="form-control" style="width:auto;" data-order-status data-order-id="' + escapeHtml(order.id) + '">' +
                                    '<option value="diproses"' + (order.status === 'diproses' ? ' selected' : '') + '>Diproses</option>' +
                                    '<option value="dikirim"' + (order.status === 'dikirim' ? ' selected' : '') + '>Dikirim</option>' +
                                    '<option value="selesai"' + (order.status === 'selesai' ? ' selected' : '') + '>Selesai</option>' +
                                '</select>' +
                            '</div>' +
                        '</div>' +
                    '</article>'
                );
            }).join('');
        }

        function renderProductsTable() {
            var products = getProducts();
            var query = productSearchEl.value.trim().toLowerCase();
            var filtered = products.filter(function (p) {
                if (!query) return true;
                return (p.nama + ' ' + p.kategori + ' ' + (p.spesifikasi || '')).toLowerCase().indexOf(query) !== -1;
            });

            if (filtered.length === 0) {
                productsTbodyEl.innerHTML = '';
                productsTableWrap.classList.add('hidden');
                productsEmptyEl.classList.remove('hidden');
                return;
            }

            productsEmptyEl.classList.add('hidden');
            productsTableWrap.classList.remove('hidden');

            productsTbodyEl.innerHTML = filtered.map(function (product) {
                return (
                    '<tr data-product-id="' + escapeHtml(product.id) + '">' +
                        '<td>' +
                            '<div class="table-product-cell">' +
                                '<img class="table-thumb" src="' + escapeHtml(product.gambar) + '" alt="' + escapeHtml(product.nama) + '">' +
                                '<div>' +
                                    '<strong>' + escapeHtml(product.nama) + '</strong>' +
                                    (product.unggulan ? ' <span class="badge badge-featured" style="margin-left:4px;">Unggulan</span>' : '') +
                                    '<div style="font-size:0.8rem;color:var(--muted);">' + escapeHtml(product.spesifikasi || '-') + '</div>' +
                                '</div>' +
                            '</div>' +
                        '</td>' +
                        '<td><span class="badge badge-category">' + escapeHtml(product.kategori) + '</span></td>' +
                        '<td><strong>' + escapeHtml(formatRupiah(product.harga)) + '</strong></td>' +
                        '<td>' +
                            '<div class="inline-stock-control">' +
                                '<button type="button" class="btn btn-outline btn-sm" data-stock-step="-1" data-product-id="' + escapeHtml(product.id) + '" aria-label="Kurangi stok">-</button>' +
                                '<input type="number" class="inline-stock-input" min="0" value="' + product.stok + '" data-stock-input data-product-id="' + escapeHtml(product.id) + '" aria-label="Stok ' + escapeHtml(product.nama) + '">' +
                                '<button type="button" class="btn btn-outline btn-sm" data-stock-step="1" data-product-id="' + escapeHtml(product.id) + '" aria-label="Tambah stok">+</button>' +
                            '</div>' +
                        '</td>' +
                        '<td>' +
                            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                                '<button type="button" class="btn btn-outline btn-sm" data-admin-edit="' + escapeHtml(product.id) + '">Edit</button>' +
                                '<button type="button" class="btn btn-danger btn-sm" data-admin-delete="' + escapeHtml(product.id) + '">Hapus</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>'
                );
            }).join('');
        }

        function openAdminProductModal(product) {
            productForm.reset();
            document.getElementById('admin-prod-error').textContent = '';

            if (product) {
                productModalTitle.textContent = 'Edit Produk';
                fieldId.value = product.id;
                fieldName.value = product.nama;
                fieldCategory.value = product.kategori;
                fieldPrice.value = String(product.harga);
                fieldStock.value = String(product.stok);
                fieldSpec.value = product.spesifikasi || '';
                fieldImage.value = product.gambar && product.gambar.indexOf('data:image/svg+xml') === 0 ? '' : (product.gambar || '');
                fieldDesc.value = product.deskripsi;
                fieldFeatured.checked = Boolean(product.unggulan);
            } else {
                productModalTitle.textContent = 'Tambah Produk Baru';
                fieldId.value = '';
                fieldStock.value = '10';
                fieldCategory.value = 'Biji Kopi';
            }

            productModal.classList.add('is-open');
            productModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeAdminProductModal() {
            productModal.classList.remove('is-open');
            productModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        function updateStockValue(productId, nextStockValue) {
            var parsed = Math.floor(Number(nextStockValue));
            if (isNaN(parsed) || parsed < 0) {
                showToast('Stok harus berupa angka 0 atau lebih.', 'error');
                renderProductsTable();
                return;
            }
            var products = getProducts();
            var targetName = '';
            var nextProducts = products.map(function (p) {
                if (p.id === productId) {
                    targetName = p.nama;
                    return Object.assign({}, p, { stok: parsed });
                }
                return p;
            });
            saveProducts(nextProducts);
            syncCartWithProducts();
            renderProductsTable();
            renderKpis();
            showToast('Stok "' + targetName + '" diperbarui menjadi ' + parsed + '.', 'success');
        }

        // Switch tab Pesanan vs Produk
        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var target = btn.getAttribute('data-admin-tab');
                tabButtons.forEach(function (b) {
                    var active = b === btn;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                ordersPanel.classList.toggle('hidden', target !== 'orders');
                productsPanel.classList.toggle('hidden', target !== 'products');
            });
        });

        orderFilterEl.addEventListener('change', renderOrders);
        ordersListEl.addEventListener('change', function (e) {
            if (!e.target.matches('[data-order-status]')) return;
            var orderId = e.target.getAttribute('data-order-id');
            var status = e.target.value;
            if (updateOrderStatus(orderId, status)) {
                showToast('Status pesanan ' + orderId + ' diubah ke ' + STATUS_LABELS[status] + '.', 'success');
                renderKpis();
                renderOrders();
            }
        });

        productSearchEl.addEventListener('input', renderProductsTable);

        productsTbodyEl.addEventListener('click', function (e) {
            var stepBtn = e.target.closest('[data-stock-step]');
            if (stepBtn) {
                var prodId = stepBtn.getAttribute('data-product-id');
                var step = Number(stepBtn.getAttribute('data-stock-step'));
                var prod = getProductById(prodId);
                if (prod) {
                    updateStockValue(prodId, Math.max(0, prod.stok + step));
                }
                return;
            }

            var editBtn = e.target.closest('[data-admin-edit]');
            if (editBtn) {
                var editProd = getProductById(editBtn.getAttribute('data-admin-edit'));
                if (editProd) openAdminProductModal(editProd);
                return;
            }

            var delBtn = e.target.closest('[data-admin-delete]');
            if (delBtn) {
                var delId = delBtn.getAttribute('data-admin-delete');
                var delProd = getProductById(delId);
                if (!delProd) return;
                openConfirmModal(
                    'Hapus Produk?',
                    'Produk "' + delProd.nama + '" akan dihapus permanen dari katalog dan keranjang pelanggan.',
                    'Hapus Produk',
                    function () {
                        var nextList = getProducts().filter(function (p) { return p.id !== delId; });
                        saveProducts(nextList);
                        syncCartWithProducts();
                        renderKpis();
                        renderProductsTable();
                        showToast('Produk "' + delProd.nama + '" berhasil dihapus.', 'info');
                    }
                );
            }
        });

        productsTbodyEl.addEventListener('change', function (e) {
            if (!e.target.matches('[data-stock-input]')) return;
            var prodId = e.target.getAttribute('data-product-id');
            updateStockValue(prodId, e.target.value);
        });

        addProductBtn.addEventListener('click', function () {
            openAdminProductModal(null);
        });

        resetDemoBtn.addEventListener('click', function () {
            openConfirmModal(
                'Reset Data Produk Awal?',
                'Daftar produk akan dikembalikan ke 12 produk bawaan KopiKita. Riwayat pesanan tidak dihapus.',
                'Reset Produk',
                function () {
                    var seed = getSeedProducts();
                    saveProducts(seed);
                    syncCartWithProducts();
                    renderKpis();
                    renderProductsTable();
                    showToast('Data produk dikembalikan ke setelan awal.', 'success');
                }
            );
        });

        productModalClose.addEventListener('click', closeAdminProductModal);
        productModalCancel.addEventListener('click', closeAdminProductModal);
        productModal.addEventListener('click', function (e) {
            if (e.target === productModal) closeAdminProductModal();
        });

        productForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var errorBox = document.getElementById('admin-prod-error');
            var id = fieldId.value.trim();
            var nama = fieldName.value.trim();
            var kategori = fieldCategory.value;
            var harga = Math.round(Number(fieldPrice.value));
            var stok = Math.floor(Number(fieldStock.value));
            var spesifikasi = fieldSpec.value.trim();
            var imageInput = fieldImage.value.trim();
            var deskripsi = fieldDesc.value.trim();
            var unggulan = fieldFeatured.checked;

            if (nama.length < 3) {
                errorBox.textContent = 'Nama produk minimal 3 karakter.';
                return;
            }
            if (isNaN(harga) || harga < 1000) {
                errorBox.textContent = 'Harga produk minimal Rp 1.000.';
                return;
            }
            if (isNaN(stok) || stok < 0) {
                errorBox.textContent = 'Stok produk minimal 0.';
                return;
            }
            if (deskripsi.length < 10) {
                errorBox.textContent = 'Deskripsi produk minimal 10 karakter.';
                return;
            }
            if (imageInput && !isSafeImageUrl(imageInput)) {
                errorBox.textContent = 'URL gambar harus diawali http://, https://, atau data:image/.';
                return;
            }

            errorBox.textContent = '';

            var products = getProducts();
            var finalImage = imageInput || generateFallbackImage(nama, kategori, spesifikasi);

            if (id) {
                products = products.map(function (p) {
                    if (p.id !== id) return p;
                    return Object.assign({}, p, {
                        nama: nama,
                        kategori: kategori,
                        harga: harga,
                        stok: stok,
                        spesifikasi: spesifikasi,
                        deskripsi: deskripsi,
                        unggulan: unggulan,
                        gambar: finalImage
                    });
                });
                saveProducts(products);
                syncCartWithProducts();
                showToast('Produk "' + nama + '" berhasil diperbarui.', 'success');
            } else {
                var newProduct = {
                    id: 'prd-' + Date.now(),
                    nama: nama,
                    kategori: kategori,
                    harga: harga,
                    stok: stok,
                    spesifikasi: spesifikasi,
                    deskripsi: deskripsi,
                    unggulan: unggulan,
                    createdAt: Date.now(),
                    gambar: finalImage
                };
                products.unshift(newProduct);
                saveProducts(products);
                showToast('Produk baru "' + nama + '" berhasil ditambahkan.', 'success');
            }

            closeAdminProductModal();
            renderKpis();
            renderProductsTable();
        });

        renderKpis();
        renderOrders();
        renderProductsTable();
    }

    /* ======================================================================
       Inisialisasi Global & Routing Halaman
       ====================================================================== */

    document.addEventListener('DOMContentLoaded', function () {
        // Pastikan produk awal ter-seed saat kunjungan pertama
        getProducts();

        initThemeToggle();
        initMobileNav();
        updateNavbarCartBadge(false);
        initProductModal();
        initConfirmModal();

        var page = document.body.getAttribute('data-page');
        if (page === 'home') initHomePage();
        else if (page === 'produk') initProdukPage();
        else if (page === 'keranjang') initKeranjangPage();
        else if (page === 'checkout') initCheckoutPage();
        else if (page === 'admin') initAdminPage();
    });

    // Sinkronisasi tema dan badge keranjang antar tab secara real-time
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEYS.CART || e.key === STORAGE_KEYS.PRODUCTS) {
            updateNavbarCartBadge(false);
        }
        if (e.key === STORAGE_KEYS.THEME) {
            applyTheme(e.newValue === 'dark' ? 'dark' : 'light');
        }
    });

    // Ekspos helper tertentu untuk kemudahan inspeksi & pengujian
    window.KopiKitaApp = {
        formatRupiah: formatRupiah,
        getProducts: getProducts,
        getCart: getCart,
        getOrders: getOrders
    };
})();
