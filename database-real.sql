-- MariaDB dump 10.19  Distrib 10.4.19-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: rab_snaprint
-- ------------------------------------------------------
-- Server version	10.4.19-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `rab_snaprint`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `rab_snaprint` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `rab_snaprint`;

--
-- Table structure for table `business_plan_propositions`
--

DROP TABLE IF EXISTS `business_plan_propositions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_plan_propositions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `proposition` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_plan_propositions`
--

LOCK TABLES `business_plan_propositions` WRITE;
/*!40000 ALTER TABLE `business_plan_propositions` DISABLE KEYS */;
INSERT INTO `business_plan_propositions` VALUES (1,'Dual-Engine Superiority: Mesin Laser A3+ presisi & Mesin Outdoor 3.2m dalam satu atap.',1,'2026-10-20 06:51:12'),(2,'Same-Day Express Service tanpa ketergantungan sub-kontrak pihak ketiga.',2,'2026-10-20 06:51:12'),(3,'Standarisasi Profil Warna ICC untuk akurasi cetak konsisten di setiap media.',3,'2026-10-20 06:51:12'),(4,'Layanan finishing terpadu: laminasi roll panas/dingin, pemotong elektrik, & jilid spiral kawat.',4,'2026-10-20 06:51:12');
/*!40000 ALTER TABLE `business_plan_propositions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_plan_segments`
--

DROP TABLE IF EXISTS `business_plan_segments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_plan_segments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `share_percent` decimal(5,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_plan_segments`
--

LOCK TABLES `business_plan_segments` WRITE;
/*!40000 ALTER TABLE `business_plan_segments` DISABLE KEYS */;
INSERT INTO `business_plan_segments` VALUES (1,'B2B Korporasi & UMKM',40.00,'Brosur, kartu nama, kalender, company profile, sticker label kemasan produk.',1,'2026-10-20 06:51:12'),(2,'Event Organizer & Agensi',30.00,'Spanduk banner 3.2m, backdrop panggung, standing roll-up, merchandise promo.',2,'2026-10-20 06:51:12'),(3,'Institusi, Kampus & Sekolah',15.00,'Sertifikat, buku panduan, modul, laporan tahunan, ID card & lanyard panitia.',3,'2026-10-20 06:51:12'),(4,'Retail & Walk-In Customer',15.00,'Cetak foto, dokumen instan, stiker custom satuan, jilid skripsi & tugas kuliah.',4,'2026-10-20 06:51:12');
/*!40000 ALTER TABLE `business_plan_segments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `capex_items`
--

DROP TABLE IF EXISTS `capex_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `capex_items` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `spec` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `vol` decimal(10,2) NOT NULL DEFAULT 1.00,
  `sat` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unit',
  `price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(15,2) GENERATED ALWAYS AS (`vol` * `price` - `discount`) STORED,
  `status` enum('pending','in_progress','done') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_capex_items_category` (`category_id`),
  CONSTRAINT `fk_capex_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `capex_items`
--

LOCK TABLES `capex_items` WRITE;
/*!40000 ALTER TABLE `capex_items` DISABLE KEYS */;
INSERT INTO `capex_items` VALUES ('item_1_1','cat_1','1.1','Meja Front Counter Kasir & CS','Custom HPL finish, slot 2 PC, display glass kartu nama & brosur',1.00,'Unit',7500000.00,0.00,7500000.00,'pending','Desain ergonomis dengan backdrop logo Snaprint',1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_1_2','cat_1','1.2','Meja Kerja Produksi & Finishing','Rangka besi hollow tebal + multiplek 18mm lapis HPL tahan gores & cutter',2.00,'Unit',2500000.00,0.00,5000000.00,'pending','Ukuran 240x120 cm per unit, dilengkapi cutting mat besar',2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_1_3','cat_1','1.3','Partisi Ruang Mesin & Dinding','Gypsum board 9mm rangka hollow, kedap suara parsial + kaca viewing',1.00,'Paket',6500000.00,0.00,6500000.00,'pending','Memisahkan area produksi bising dengan area customer front office',3,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_1_4','cat_1','1.4','Pengecatan Sesuai Brand Guide','Cat interior dinding kombinasi warna primer Snaprint (Cyan, Dark Slate, Pure White)',1.00,'Paket',3200000.00,0.00,3200000.00,'pending','Termasuk plamir dan cat anti-jamur',4,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_1_5','cat_1','1.5','Rak Showcase & Display Sample','Ambalan rak kayu/besi untuk display kertas & merchandise sampel cetak',1.00,'Set',3500000.00,0.00,3500000.00,'pending','Spotlight LED untuk katalog sampel kertas premium',5,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_1_6','cat_1','1.6','Kursi Kerja & Bangku Tunggu','4 kursi hidrolik operator + 1 bangku tunggu 3 dudukan customer',1.00,'Paket',2800000.00,0.00,2800000.00,'pending','Kursi ergonomis mesh jaring untuk kenyamanan kerja',6,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_1_7','cat_1','1.7','Tata Udara (Air Conditioner)','AC Split 1.5 PK (R. Mesin Suhu Stabil 20-22°C) + AC 1 PK (Front Office)',2.00,'Unit',4250000.00,0.00,8500000.00,'pending','Penting untuk menjaga kelembaban kertas dan stabilitas laser drum',7,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_1','cat_2','2.1','Mesin Digital Printing Laser A3+','Alokasi DP/Commitment Fee Mesin Produksi Laser Warna (Fuji Xerox/Konica Minolta/Canon)',1.00,'Unit',55000000.00,0.00,55000000.00,'pending','Skema KSO/Sewa Beli/DP Mesin dengan klik kontrak resmi',1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_2','cat_2','2.2','Mesin Potong Kertas Elektrik','Digital Guillotine Paper Cutter 45–48 cm auto clamp & safety sensor infrared',1.00,'Unit',18500000.00,0.00,18500000.00,'pending','Kapasitas potong hingga ketebalan 1 rim (500 lembar)',2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_3','cat_2','2.3','Mesin Roll Laminating Panas/Dingin','Lebar 36–45 cm dual roller temperature control & anti-curl system',1.00,'Unit',5500000.00,0.00,5500000.00,'pending','Mendukung roll BOPP Doff, Glossy, dan Hologram 30 micron',3,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_4','cat_2','2.4','Mesin Jilid Spiral Kawat & Plastik','Heavy duty dual pitch puncher & binding machine (Pitch 3:1 & 2:1)',1.00,'Unit',3800000.00,0.00,3800000.00,'pending','Untuk pembuatan kalender, notebook, agenda, dan laporan tahunan',4,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_5','cat_2','2.5','Komputer Desain & RIP Operator','Core i5/Ryzen 5, RAM 16GB, SSD 512GB, Monitor IPS 24 inch 99% sRGB',2.00,'Set',8500000.00,0.00,17000000.00,'pending','1 unit untuk kasir/customer service + 1 unit dedicated RIP Print Server',5,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_6','cat_2','2.6','Sistem Kasir & POS Hardware','Mini PC Kasir, Printer Thermal 80mm Auto-Cutter, Cash Drawer RJ11, Barcode Scanner 2D',1.00,'Set',5200000.00,0.00,5200000.00,'pending','Terintegrasi software kasir nota struk dan pencatatan kas harian',6,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_7','cat_2','2.7','Sistem Keamanan & Network','CCTV 4 Channel Full HD + Router Wi-Fi Mikrotik + Gigabit Switch 8 Port',1.00,'Paket',4500000.00,0.00,4500000.00,'pending','Monitoring via HP 24 jam dan LAN gigabit stabil untuk transfer file besar',7,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_2_8','cat_2','2.8','Pembelian Mesin Outdoor 3,2 m','Mesin Digital Printing Outdoor Solvent Lebar 3.2 Meter (Printhead Industri Konica Minolta 512i / Starfire 1024), Heavy Duty Chassis, Speed 80–120 m²/jam, RIP Software PhotoPrint/MainTop, Triple Heating System (Front-Middle-Rear) & Automatic Take-Up Media Roller',1.00,'Unit',125000000.00,0.00,125000000.00,'pending','Pengadaan mesin cetak outdoor format besar 3.2m untuk spanduk, banner flexi frontlite/backlite, baliho, dan sticker outdoor (termasuk instalasi, training teknisi/operator, dan garansi resmi 1 tahun)',8,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_3_1','cat_3','3.1','Fascia Signboard & Neon Box','Neon Box LED Akrilik Outdoor 300x90 cm + Frame Samping Plat Galvanis & Tiang',1.00,'Paket',8500000.00,0.00,8500000.00,'pending','Visibilitas tinggi malam hari, hemat daya LED Samsung',1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_3_2','cat_3','3.2','Paket Promosi Grand Opening','Spanduk rentang, Standing Banner Roll Up, 2.000 Brosur Promo, Voucher Diskon',1.00,'Paket',2500000.00,0.00,2500000.00,'pending','Kampanye promosi pembukaan 2 minggu awal',2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_3_3','cat_3','3.3','Seragam & ID Card Staff','Polo Shirt Bordir Snaprint (4 personil @ 2 pcs) + Lanyard ID Card Magnetik',8.00,'Stel',150000.00,0.00,1200000.00,'pending','Standard operational penampilan staf profesional',3,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_3_4','cat_3','3.4','Stok Kertas & Media Cetak A3+','Art Paper 120/150g, Art Carton 210/260/310g, Sticker Cromo/Vinyl, HVS 80g, Fancy Textured',1.00,'Paket',9000000.00,0.00,9000000.00,'pending','Buffer stok bahan baku kertas cetak untuk 3-4 minggu awal operasi',4,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_3_5','cat_3','3.5','Consumables & Packaging','Roll laminasi doff/glossy, spiral kawat no 3-8, paper bag Snaprint, lakban, plastik',1.00,'Paket',3800000.00,0.00,3800000.00,'pending','Perlengkapan finishing dan kemasan hasil cetak customer',5,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_4_1','cat_4','4.1','NIB & KBLI Percetakan (OSS)','Nomor Induk Berusaha berbasis risiko via OSS RBA + sertifikat standar percetakan',1.00,'Paket',1000000.00,0.00,1000000.00,'pending','Legalitas perizinan operasional resmi',1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_4_2','cat_4','4.2','Pajak Reklame & Izin Banner','Retribusi pajak daerah papan nama billboard / neon box outdoor 1 tahun pertama',1.00,'Paket',2500000.00,0.00,2500000.00,'pending','Izin dinas pendapatan daerah / BPBD setempat',2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_4_3','cat_4','4.3','Retribusi & Izin Lingkungan','Koordinasi lingkungan sekitar, keamanan, persetujuan tetangga & iuran RT/RW',1.00,'Paket',1500000.00,0.00,1500000.00,'pending','Kemitraan aman dan kondusif dengan lingkungan toko',3,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_4_4','cat_4','4.4','Lisensi Brand & Sistem Snaprint Digital Printing','Hak penggunaan merek Snaprint, Brand Guidelines, Standard Operating Procedure (SOP), Sistem POS Kasir Cloud, dan Pelatihan Operasional Staf',1.00,'Paket',25000000.00,5000000.00,20000000.00,'pending','Paket lisensi kemitraan resmi Snaprint (potongan promo pembukaan cabang Rp 5.000.000)',4,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_5_1','cat_5','5.1','Tambah Daya Listrik PLN & Panel','Biaya pasang / tambah daya ke 7.700 VA / 11.000 VA + Box Panel MCB pembagi per mesin',1.00,'Paket',4500000.00,0.00,4500000.00,'pending','Kebutuhan daya stabil mesin laser fuser heater & AC secara simultan',1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_5_2','cat_5','5.2','Grounding Tembaga Mesin (< 2Ω)','Pemasangan rod tembaga murni 3-4 meter ke tanah, uji impedansi tanah < 2 Ohm',1.00,'Paket',1800000.00,0.00,1800000.00,'pending','Syarat mutlak garansi mesin digital laser & proteksi papan sirkuit utama',2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('item_5_3','cat_5','5.3','Dana Cadangan Renovasi (Contingency)','Dana proteksi biaya tak terduga (bocor atap ruko, fitting pipa AC, perbaikan sanitasi)',1.00,'Paket',4200000.00,0.00,4200000.00,'pending','Alokasi kontingensi 2-3% dari total capex proyek',3,'2026-10-21 02:32:26','2026-10-21 02:32:26');
/*!40000 ALTER TABLE `capex_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_flow_schedules`
--

DROP TABLE IF EXISTS `cash_flow_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cash_flow_schedules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `termin` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `week` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `focus` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `share_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `nominal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('pending','in_progress','done') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_date` date DEFAULT NULL,
  `ref_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_flow_schedules`
--

LOCK TABLES `cash_flow_schedules` WRITE;
/*!40000 ALTER TABLE `cash_flow_schedules` DISABLE KEYS */;
INSERT INTO `cash_flow_schedules` VALUES (1,'Termin I','Minggu 1','DP Interior (50%), Tambah Daya PLN, Biaya Izin Reklame & NIB',25.00,46750000.00,'done','2026-10-18','TRX-SNP-T1-001','Pembayaran DP kontraktor interior & pendaftaran daya PLN',1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),(2,'Termin II','Minggu 2','Pelunasan Interior, DP Mesin Laser A3+, Beli Mesin Potong & PC Desain',40.00,74800000.00,'in_progress','2026-10-25','TRX-SNP-T2-002','Pencairan terbesar untuk unit mesin produksi utama dan finishing potong',2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),(3,'Termin III','Minggu 3','Pemasangan Neon Box, Mesin Finishing Pendukung, Pembelian Stok Bahan',25.00,46750000.00,'pending','2026-11-01','TRX-SNP-T3-003','Pemasangan signage luar ruko, mesin laminasi roll, jilid, stok kertas awal',3,'2026-10-21 02:32:26','2026-10-21 02:32:26'),(4,'Termin IV','Minggu 4','Trial Cetak, Media Promosi Grand Opening, Kas Awal (Petty Cash Outlet)',10.00,18700000.00,'pending','2026-11-08','TRX-SNP-T4-004','Pengujian kalibrasi warna mesin, penyebaran flyer pembukaan dan kas laci kasir',4,'2026-10-21 02:32:26','2026-10-21 02:32:26');
/*!40000 ALTER TABLE `cash_flow_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'blue',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('cat_1','01','Interior dan Furniture (Fit-Out Outlet)','sky',1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('cat_2','02','Equipment dan Inventori (Hardware & Mesin)','blue',2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('cat_3','03','Marketing Tools dan Stok Bahan Awal','amber',3,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('cat_4','04','Biaya Lisensi Brand, Perizinan & Legalitas','emerald',4,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('cat_5','05','Pekerjaan Tambahan & Contingency','purple',5,'2026-10-21 02:32:26','2026-10-21 02:32:26');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discount_settings`
--

DROP TABLE IF EXISTS `discount_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `discount_settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nominal',
  `value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Potongan Khusus Kemitraan / Negosiasi Vendor',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discount_settings`
--

LOCK TABLES `discount_settings` WRITE;
/*!40000 ALTER TABLE `discount_settings` DISABLE KEYS */;
INSERT INTO `discount_settings` VALUES (1,0,'nominal',0.00,'Potongan Khusus Kemitraan / Negosiasi Vendor','2026-10-20 06:51:12','2026-10-20 06:51:12');
/*!40000 ALTER TABLE `discount_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_simulations`
--

DROP TABLE IF EXISTS `financial_simulations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `financial_simulations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `work_days_per_month` int(11) NOT NULL DEFAULT 26,
  `daily_a3_prints` int(11) NOT NULL DEFAULT 450,
  `a3_sell_price` decimal(15,2) NOT NULL DEFAULT 5000.00,
  `a3_hpp_cost` decimal(15,2) NOT NULL DEFAULT 2150.00,
  `daily_outdoor_m2` decimal(10,2) NOT NULL DEFAULT 35.00,
  `outdoor_sell_price` decimal(15,2) NOT NULL DEFAULT 22000.00,
  `outdoor_hpp_cost` decimal(15,2) NOT NULL DEFAULT 9500.00,
  `monthly_other_products_sales` decimal(15,2) NOT NULL DEFAULT 12500000.00,
  `other_products_margin_percent` decimal(5,2) NOT NULL DEFAULT 55.00,
  `target_payback_months` int(11) NOT NULL DEFAULT 18,
  `active_scenario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'moderat',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_simulations`
--

LOCK TABLES `financial_simulations` WRITE;
/*!40000 ALTER TABLE `financial_simulations` DISABLE KEYS */;
INSERT INTO `financial_simulations` VALUES (1,26,450,5000.00,2150.00,35.00,22000.00,9500.00,12500000.00,55.00,18,'moderat','2026-10-20 06:51:12','2026-10-20 06:51:12');
/*!40000 ALTER TABLE `financial_simulations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_meta`
--

DROP TABLE IF EXISTS `project_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_meta` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `document_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `outlet_location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_date` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_status` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Persiapan Fisik',
  `target_duration` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '4 Minggu',
  `standard_area` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '45 – 60 m²',
  `machine_model` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prepared_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checked_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_meta`
--

LOCK TABLES `project_meta` WRITE;
/*!40000 ALTER TABLE `project_meta` DISABLE KEYS */;
INSERT INTO `project_meta` VALUES (1,'RAB-SNP/2026/04-01','Ruko Sentra Bisnis Utama (Target Outlet)','16 Oktober 2026','Persiapan Fisik','4 Minggu','45 – 60 m²','Digital A3+ Color & Mesin Outdoor 3.2m','Tim Proyek & Pengadaan Snaprint','Finance & Operational Manager','Direksi / Owner Snaprint Digital Printing','Anggaran mencakup seluruh investasi aset awal (CAPEX), perizinan, dan termin pencairan dana pembukaan cabang baru.','2026-10-20 06:51:12','2026-10-20 06:51:12');
/*!40000 ALTER TABLE `project_meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `simulation_scenarios`
--

DROP TABLE IF EXISTS `simulation_scenarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `simulation_scenarios` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `scenario_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `daily_a3_prints` int(11) NOT NULL,
  `daily_outdoor_m2` decimal(10,2) NOT NULL,
  `monthly_other_products_sales` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_scenarios_key` (`scenario_key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `simulation_scenarios`
--

LOCK TABLES `simulation_scenarios` WRITE;
/*!40000 ALTER TABLE `simulation_scenarios` DISABLE KEYS */;
INSERT INTO `simulation_scenarios` VALUES (1,'pesimis','Skenario Konservatif (Pesimis)',250,15.00,7000000.00,'2026-10-20 06:51:12','2026-10-20 06:51:12'),(2,'moderat','Skenario Moderat (Target Normal)',450,35.00,12500000.00,'2026-10-20 06:51:12','2026-10-20 06:51:12'),(3,'optimis','Skenario Optimis (High Demand / Peak)',750,70.00,22000000.00,'2026-10-20 06:51:12','2026-10-20 06:51:12');
/*!40000 ALTER TABLE `simulation_scenarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_salaries`
--

DROP TABLE IF EXISTS `staff_salaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_salaries` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `count` int(11) NOT NULL DEFAULT 1,
  `salary_per_month` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_per_month` decimal(15,2) GENERATED ALWAYS AS (`count` * `salary_per_month`) STORED,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_salaries`
--

LOCK TABLES `staff_salaries` WRITE;
/*!40000 ALTER TABLE `staff_salaries` DISABLE KEYS */;
INSERT INTO `staff_salaries` VALUES ('sal_1','Front Officer / Kasir & CS',1,2800000.00,2800000.00,1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('sal_2','Operator Desain Grafis & RIP Cetak',2,3200000.00,6400000.00,2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('sal_3','Operator Finishing, Potong & Packaging',1,2700000.00,2700000.00,3,'2026-10-21 02:32:26','2026-10-21 02:32:26');
/*!40000 ALTER TABLE `staff_salaries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utility_costs`
--

DROP TABLE IF EXISTS `utility_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `utility_costs` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cost_per_month` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utility_costs`
--

LOCK TABLES `utility_costs` WRITE;
/*!40000 ALTER TABLE `utility_costs` DISABLE KEYS */;
INSERT INTO `utility_costs` VALUES ('utl_1','Listrik Bisnis (PLN B2 7.700 VA)',3200000.00,1,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('utl_2','Internet Dedicated & Wi-Fi Customer',550000.00,2,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('utl_3','Air Bersih, Sampah & Keamanan Lingkungan',450000.00,3,'2026-10-21 02:32:26','2026-10-21 02:32:26'),('utl_4','Pemeliharaan AC & Alat Operasional',600000.00,4,'2026-10-21 02:32:26','2026-10-21 02:32:26');
/*!40000 ALTER TABLE `utility_costs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `v_capex_per_category`
--

DROP TABLE IF EXISTS `v_capex_per_category`;
/*!50001 DROP VIEW IF EXISTS `v_capex_per_category`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `v_capex_per_category` (
  `category_id` tinyint NOT NULL,
  `category_code` tinyint NOT NULL,
  `category_name` tinyint NOT NULL,
  `color` tinyint NOT NULL,
  `total_items` tinyint NOT NULL,
  `total_amount` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_capex_summary`
--

DROP TABLE IF EXISTS `v_capex_summary`;
/*!50001 DROP VIEW IF EXISTS `v_capex_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `v_capex_summary` (
  `total_all_items` tinyint NOT NULL,
  `gross_capex_total` tinyint NOT NULL,
  `global_discount` tinyint NOT NULL,
  `net_capex_total` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_monthly_burn_rate`
--

DROP TABLE IF EXISTS `v_monthly_burn_rate`;
/*!50001 DROP VIEW IF EXISTS `v_monthly_burn_rate`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `v_monthly_burn_rate` (
  `total_monthly_salaries` tinyint NOT NULL,
  `total_monthly_utilities` tinyint NOT NULL,
  `monthly_rent_equivalent` tinyint NOT NULL,
  `monthly_marketing` tinyint NOT NULL,
  `total_monthly_opex` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `working_capital_settings`
--

DROP TABLE IF EXISTS `working_capital_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `working_capital_settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `runway_months` int(11) NOT NULL DEFAULT 3,
  `rent_per_year` decimal(15,2) NOT NULL DEFAULT 0.00,
  `rent_payment_months` int(11) NOT NULL DEFAULT 12,
  `rent_deposit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `petty_cash_buffer` decimal(15,2) NOT NULL DEFAULT 0.00,
  `marketing_monthly` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `working_capital_settings`
--

LOCK TABLES `working_capital_settings` WRITE;
/*!40000 ALTER TABLE `working_capital_settings` DISABLE KEYS */;
INSERT INTO `working_capital_settings` VALUES (1,3,42000000.00,12,5000000.00,15000000.00,1500000.00,'2026-10-20 06:51:12','2026-10-20 06:51:12');
/*!40000 ALTER TABLE `working_capital_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'rab_snaprint'
--

--
-- Dumping routines for database 'rab_snaprint'
--

--
-- Current Database: `rab_snaprint`
--

USE `rab_snaprint`;

--
-- Final view structure for view `v_capex_per_category`
--

/*!50001 DROP TABLE IF EXISTS `v_capex_per_category`*/;
/*!50001 DROP VIEW IF EXISTS `v_capex_per_category`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_capex_per_category` AS select `c`.`id` AS `category_id`,`c`.`code` AS `category_code`,`c`.`name` AS `category_name`,`c`.`color` AS `color`,count(`i`.`id`) AS `total_items`,coalesce(sum(`i`.`subtotal`),0) AS `total_amount` from (`categories` `c` left join `capex_items` `i` on(`c`.`id` = `i`.`category_id`)) group by `c`.`id`,`c`.`code`,`c`.`name`,`c`.`color`,`c`.`sort_order` order by `c`.`sort_order` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_capex_summary`
--

/*!50001 DROP TABLE IF EXISTS `v_capex_summary`*/;
/*!50001 DROP VIEW IF EXISTS `v_capex_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_capex_summary` AS select count(`capex_items`.`id`) AS `total_all_items`,sum(`capex_items`.`subtotal`) AS `gross_capex_total`,(select coalesce(`discount_settings`.`value`,0) from `discount_settings` where `discount_settings`.`enabled` = 1 limit 1) AS `global_discount`,sum(`capex_items`.`subtotal`) - coalesce((select case when `discount_settings`.`type` = 'percent' then sum(`capex_items`.`subtotal`) * `discount_settings`.`value` / 100 else `discount_settings`.`value` end from `discount_settings` where `discount_settings`.`enabled` = 1 limit 1),0) AS `net_capex_total` from `capex_items` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_monthly_burn_rate`
--

/*!50001 DROP TABLE IF EXISTS `v_monthly_burn_rate`*/;
/*!50001 DROP VIEW IF EXISTS `v_monthly_burn_rate`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_monthly_burn_rate` AS select (select sum(`staff_salaries`.`total_per_month`) from `staff_salaries`) AS `total_monthly_salaries`,(select sum(`utility_costs`.`cost_per_month`) from `utility_costs`) AS `total_monthly_utilities`,(select `working_capital_settings`.`rent_per_year` / 12 from `working_capital_settings` limit 1) AS `monthly_rent_equivalent`,(select `working_capital_settings`.`marketing_monthly` from `working_capital_settings` limit 1) AS `monthly_marketing`,coalesce((select sum(`staff_salaries`.`total_per_month`) from `staff_salaries`),0) + coalesce((select sum(`utility_costs`.`cost_per_month`) from `utility_costs`),0) + coalesce((select `working_capital_settings`.`rent_per_year` / 12 from `working_capital_settings` limit 1),0) + coalesce((select `working_capital_settings`.`marketing_monthly` from `working_capital_settings` limit 1),0) AS `total_monthly_opex` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-21 11:43:19
