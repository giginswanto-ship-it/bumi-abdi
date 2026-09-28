-- ==========================================================
-- SKEMA DATABASE RUMAH MAKAN AYAM GORENG KAMPUNG BUMI ABDI
-- Dialect: SQLite / MySQL / PostgreSQL Compatible
-- ==========================================================

-- 1. TABEL PENGATURAN RESTORAN
CREATE TABLE IF NOT EXISTS restaurant_settings (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    address TEXT,
    phone VARCHAR(100),
    tax_rate INT DEFAULT 0,
    service_rate INT DEFAULT 0,
    footer_receipt TEXT,
    qris_merchant VARCHAR(100),
    qris_nmid VARCHAR(100),
    total_tables INT DEFAULT 20,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL KATEGORI MENU
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50)
);

-- 3. TABEL MENU MAKANAN & MINUMAN
CREATE TABLE IF NOT EXISTS menu_items (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50),
    price DECIMAL(12,2) NOT NULL,
    cost DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    image TEXT,
    status VARCHAR(50) DEFAULT 'available', -- 'available' / 'out_of_stock'
    is_best_seller BOOLEAN DEFAULT FALSE,
    variants_json TEXT, -- JSON array varian
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 4. TABEL TRANSAKSI / NOTA PESANAN
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    customer_name VARCHAR(100),
    order_type VARCHAR(50) DEFAULT 'dine_in', -- 'dine_in', 'take_away', 'delivery'
    table_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'kitchen',     -- 'pending', 'kitchen', 'ready', 'completed', 'cancelled'
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid'
    payment_method VARCHAR(50),               -- 'cash', 'qris', 'debit', 'transfer'
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    service DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    change_amount DECIMAL(12,2) DEFAULT 0,
    cashier VARCHAR(100),
    notes TEXT,
    origin VARCHAR(50) DEFAULT 'kasir'        -- 'kasir' / 'customer_qr'
);

-- 5. TABEL RINCIAN ITEM TRANSAKSI
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    menu_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    variant VARCHAR(100),
    notes TEXT,
    subtotal DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ==========================================================
-- DATA AWAL (SEED MASTER DATA)
-- ==========================================================

INSERT INTO restaurant_settings (id, name, tagline, address, phone, tax_rate, total_tables, footer_receipt)
VALUES ('default', 'AYAM GORENG KAMPUNG BUMI ABDI', 'Asli. Gurih. Berkah.', 'Jl. Raya Utama No. 88, Resto Bumi Abdi', '0812-3456-7890', 0, 20, 'Terima kasih telah berkunjung ke BUMI ABDI.\nSemoga berkah & selamat menikmati hidangan!');

INSERT INTO categories (id, name, icon) VALUES
('ayam', 'Ayam Goreng Kampung', 'fa-drumstick-bite'),
('paket', 'Paket Komplit', 'fa-box-open'),
('bebek_ikan', 'Bebek & Ikan', 'fa-fish'),
('sayur_sup', 'Sayur & Sup', 'fa-bowl-rice'),
('sambal', 'Aneka Sambal Khas', 'fa-pepper-hot'),
('pelengkap', 'Nasi & Pelengkap', 'fa-cheese'),
('minuman', 'Minuman Segar', 'fa-glass-water');

INSERT INTO menu_items (id, code, name, category_id, price, cost, description, is_best_seller, status) VALUES
('m1', 'AGK-01', 'Ayam Goreng Kampung (Paha/Dada)', 'ayam', 28000, 18000, 'Ayam kampung asli diungkep rempah bumbu kuning rahasia BUMI ABDI, digoreng garing renyah di luar juicy di dalam.', TRUE, 'available'),
('m2', 'AGK-02', 'Ayam Goreng Kremes BUMI ABDI', 'ayam', 30000, 19000, 'Ayam kampung empuk gurih ditaburi kremesan rempah sarang burung yang super renyah dan wangi.', TRUE, 'available'),
('m3', 'AGK-03', 'Ayam Bakar Madu Kampung', 'ayam', 30000, 19500, 'Ayam kampung dibakar dengan olesan madu hutan dan bumbu kecap rempah gurih manis legit.', FALSE, 'available'),
('m4', 'AGK-04', 'Ayam Goreng 1 Ekor Utuh Kampung', 'ayam', 105000, 72000, '1 Ekor Utuh Ayam Kampung Goreng komplit dengan jeroan, lalapan segar & 2 pilihan sambal khas.', TRUE, 'available'),
('m5', 'PKT-01', 'Paket Berkah 1 (Ayam + Nasi + Sayur Asem + Es Teh)', 'paket', 38000, 23000, 'Ayam Kampung Goreng, Nasi Putih Pulen Wangi, Sayur Asem Segar, Lalapan, Sambal Dadak & Es Teh Manis.', TRUE, 'available'),
('m11', 'SYR-01', 'Sayur Asem Khas Bumi Abdi', 'sayur_sup', 12000, 5000, 'Kuah asam segar dengan jagung manis, labu siam, melinjo, kacang panjang dan kacang tanah.', TRUE, 'available'),
('m14', 'SBL-01', 'Sambal Terasi Dadak Bumi Abdi', 'sambal', 6000, 2000, 'Sambal terasi segar diulek mendadak dengan jeruk limau wangi. Pedas segar nendang!', TRUE, 'available'),
('m22', 'MNM-01', 'Es Teh Manis Jumbo / Hangat', 'minuman', 5000, 1500, 'Teh melati wangi racikan khas Jawa, disajikan dingin segar atau hangat.', TRUE, 'available');
