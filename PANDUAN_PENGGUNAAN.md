# APLIKASI KASIR POS & QR ORDER DINAMIS
## Rumah Makan Ayam Goreng Kampung BUMI ABDI
*Tagline: Asli. Gurih. Berkah.*

---

## 🌟 Fitur Aplikasi Dinamis & Real-Time

Aplikasi telah ditingkatkan menjadi **Aplikasi Dinamis PWA (Progressive Web App)** dengan **Server Real-Time & Database Terintegrasi**:

1. **Jaringan Real-Time (Server-Sent Events / SSE)**:
   - Pesanan yang di-submit pelanggan melalui scan Barcode QR di meja akan **langsung muncul seketika (real-time)** di layar Kasir dan layar Koki Dapur tanpa perlu reload halaman.
   - Dilengkapi bunyi alarm notifikasi lonceng kasir & kitchen secara otomatis.
   - Panggilan pelayan (*Call Waiter*) dari meja langsung memunculkan pop-up alert ke kasir.

2. **Mode Standalone Desktop App (Tanpa Address Bar)**:
   - Disediakan file **`Buka_Aplikasi_Dinamis.bat`** yang akan membuka aplikasi dalam mode jendela aplikasi tersendiri (*Frameless App Mode*), serasa memakai software kasir desktop profesional.

3. **PWA (Progressive Web App) & Mobile Installable**:
   - Dapat diinstal di HP Android, iPhone/iPad, dan Tablet kasir ("Tambahkan ke Layar Utama" / "Install App").
   - Mendukung caching offline melalui Service Worker (`sw.js`).

4. **Penyimpanan Database Fisik Otomatis**:
   - File database tersimpan di **`database/database.json`**.
   - Setiap transaksi dan perubahan harga menu tersimpan permanen ke disk komputer.
   - Dilengkapi Skema Relasional SQL di **`database/schema.sql`** (kompatibel SQLite & MySQL).

---

## 🚀 Cara Menjalankan Aplikasi Dinamis

### 1. Di Komputer Kasir (Utama):
Klik ganda file:
👉 **`Buka_Aplikasi_Dinamis.bat`**

Aplikasi akan otomatis menyalakan server dinamis dan membuka jendela POS Kasir.

### 2. Di HP / Tablet Customer & Dapur (Jaringan Wi-Fi):
Saat server berjalan, buka browser di HP atau Tablet yang terhubung ke Wi-Fi restoran yang sama, lalu ketik alamat IP yang tertera pada layar server, contoh:
- **Layar Dapur (KDS)**: `http://192.168.1.15:8080` (lalu pilih tab Dapur)
- **Menu Scan Barcode Meja 1**: `http://192.168.1.15:8080/order.html?table=Meja%2001`
- **Menu Scan Barcode Meja 2**: `http://192.168.1.15:8080/order.html?table=Meja%2002`

---

## 🖨️ Cetak Kartu Barcode Meja:
Buka tab **"Barcode Menu Meja"** pada navigasi atas kasir, lalu klik **"Cetak Semua Meja (1 - 20)"** untuk mencetak standing tent card berlogo resmi BUMI ABDI.
