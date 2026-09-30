# ☀️ Solar Energy Monitoring System Dashboard — Deskripsi Fitur & Database

Dokumentasi komprehensif mengenai **deskripsi fitur**, **struktur data dalam database**, dan **komponen antarmuka (UI Display)** pada sistem monitoring panel surya (*Solar Energy Monitoring System Dashboard*).

---

## 🚀 1. Deskripsi Fitur Utama

Aplikasi web ini dibangun berbasis **React** (Vite), **Apache ECharts**, dan **Tailwind CSS**, terintegrasi dengan **Google Sheets API** sebagai *Cloud Database time-series* untuk mikrokontroler ESP32.

### Fitur-Fitur Utama:
1. **Monitoring Real-Time Telemetri Energi**:
   - Pemantauan nilai tegangan, arus, dan daya listrik pada Panel Surya (PV) dan Baterai (BAT) secara real-time.
   - Deteksi otomatis status pengisian/pengosongan baterai (`CHARGING` atau `DISCHARGING`).

2. **Integrasi Cloud Database & Multi-Sheet Support**:
   - Terkoneksi otomatis dengan Google Sheets API (`Log_YYYY_MM`).
   - Pilihan sheet bulanan dinamis (contoh: `Log_2026_09`, `Log_2026_10`, dst.) serta opsi *Auto Sheet*.

3. **Auto-Refresh & Toast Notification Data Baru**:
   - Pembaruan data otomatis di latar belakang (*background polling*) setiap 10 detik.
   - Dilengkapi notifikasi *Toast (New Data Notice)* melayang saat data log baru terdeteksi.

4. **Kesehatan & Diagnostik Sistem (ESP32 Health Panel)**:
   - Pantauan kondisi perangkat keras: Status Online/Offline, durasi aktif (*Uptime*), suhu internal box (°C), memori RAM bebas (*Free Heap*), kekuatan sinyal Wi-Fi (RSSI dBm), dan status kartu MicroSD.

5. **Akumulasi Energi Multi-Periode & Konversi Satuan**:
   - Perhitungan otomatis akumulasi energi listrik dalam periode **Harian** (reset otomatis 00:00 WIB), **Mingguan**, dan **Bulanan**.
   - Konversi otomatis satuan dari Watt-hour (**Wh**) ke Kilowatt-hour (**kWh**) apabila nilai energi $\ge 1000\text{ Wh}$.

6. **Visualisasi Grafik Interaktif Apache ECharts**:
   - **Power Curve**: Grafik kurva daya $P_{PV}$ vs $P_{BAT}$ (Watt) dengan *area gradient fill*.
   - **Voltage Curve**: Grafik kurva tegangan $V_{PV}$ vs $V_{BAT}$ (Volt).
   - **Bar Chart Energi**: Grafik batang akumulasi produksi energi (Wh / kWh).
   - Setiap grafik dilengkapi sakelar filter periode (Harian, Mingguan, Bulanan).

7. **Tabel Data Log & Exporter CSV Identik Log SD Card**:
   - Pencarian kata kunci bebas (*Search*) dan filter rentang tanggal (*Date Range Filter*).
   - Paginasi interaktif (15, 50, atau 100 baris per halaman).
   - **Export CSV**: Mengunduh data log dalam format `.csv` dengan header dan susunan kolom 100% presisi sesuai berkas log bawaan MicroSD Card ESP32.

8. **Automatic Fallback Local Mock Generator**:
   - Beralih otomatis ke generator data tiruan (*mock time-series*) 24 jam apabila koneksi ke Google Sheets mengalami error/offline untuk memastikan UI tidak crash.

---

## 🗄️ 2. Struktur & Isi Database

Database menggunakan **Google Sheets** sebagai *Cloud Time-Series Database* dan **MicroSD Card** sebagai *Local Storage Log*. Terdiri dari 16 kolom data (*fields*) sebagai berikut:

| No | Nama Field (Database) | Tipe Data | Satuan / Format | Deskripsi & Fungsi |
|---|---|---|---|---|
| 1 | `timestamp` | String / Datetime | `YYYY-MM-DD HH:mm:ss` | Waktu pencatatan log (WIB / UTC). |
| 2 | `v_pv` | Float | Volt (V) | Tegangan keluaran Panel Surya ($V_{PV}$). |
| 3 | `i_pv` | Float | Ampere (A) | Arus listrik dari Panel Surya ($I_{PV}$). |
| 4 | `p_pv` | Float | Watt (W) | Daya listrik Panel Surya ($P_{PV} = V_{PV} \times I_{PV}$). |
| 5 | `wh_pv_daily` | Float | Watt-Hour (Wh) | Akumulasi energi harian panel surya (reset tiap jam 00:00). |
| 6 | `v_bat` | Float | Volt (V) | Tegangan pada terminal Baterai ($V_{BAT}$). |
| 7 | `i_bat` | Float | Ampere (A) | Arus pengisian/pengosongan Baterai ($I_{BAT}$). |
| 8 | `p_bat` | Float | Watt (W) | Daya Baterai ($P_{BAT} = V_{BAT} \times I_{BAT}$). |
| 9 | `pv_normalized` | Float | Persen (%) / Index | Normalisasi daya/output Panel Surya (PV Normalized). |
| 10 | `load_status` | String | `OFF` / `PWM X%` | Status Duty Cycle PWM MOSFET saat membuang kelebihan daya ke beban bohlam paralel (misal: `OFF`, `PWM 45%`, `PWM 100%`). |
| 11 | `uptime_sec` | Integer | Detik (s) | Total waktu ESP32 aktif sejak booting terakhir. |
| 12 | `esp_temp` | Float | °C | Suhu internal/box mikrokontroler ESP32. |
| 13 | `free_heap` | Integer | Bytes | Sisa memori RAM bebas (*Free Heap Memory*) ESP32. |
| 14 | `wifi_rssi` | Integer | dBm | Kekuatan sinyal jaringan Wi-Fi (*RSSI*). |
| 15 | `sd_status` | String | `MOUNTED` / `ERROR` | Status ketersediaan dan akses MicroSD Card. |
| 16 | `lux_val` | Float | Lux (lx) | Intensitas cahaya matahari dari sensor cahaya untuk komparasi produksi energi. |

---

## 🖥️ 3. Komponen & Informasi yang Ditampilkan di UI Dashboard

Tampilan antarmuka terbagi menjadi beberapa bagian utama:

### A. Header Bar (Navigasi Atas)
- **Identitas Proyek**: Logo, Nama Sistem (*Solar Energy Monitoring System*), dan Subtitle.
- **Real-Time Clocks Widget**: Ticker jam digital berjalan dalam zona **WIB (UTC+7)** dan **UTC**.
- **Sheet Selector**: Dropdown pemilih sheet bulanan (`Log_YYYY_MM`).
- **Connection Badge**: Indikator koneksi data (`Sheets Live` hijau atau `Mock Data Active` oranye).
- **Refresh Button**: Tombol pembaharuan data manual.
- **Tab Switcher**: Navigasi halaman **Dashboard** & **Data Energi**.

---

### B. Halaman Tab 1: "Dashboard"

#### 1. System Diagnostic & Health Panel (Top Panel)
- **Status Koneksi**: Badge status `ONLINE` (jika log terbaru $\le 30$ menit) atau `OFFLINE`.
- **Uptime Device**: Format durasi aktif dalam format `X Hari, Y Jam, Z Mnt`.
- **Suhu Device**: Angka suhu (°C) dan badge indikator kesehatan (`NORMAL`, `WARM`, `HIGH`).
- **Free Memory**: Kapasitas sisa RAM mikrokontroler (KB).
- **Wi-Fi Signal**: Kuat sinyal (dBm) dan mutu jaringan (`Excellent`, `Good`, `Fair`, `Weak`).
- **SD Card Status**: Kondisi ketersediaan kartu memori MicroSD (`MOUNTED`).
- **Last Log Timestamp**: Waktu pencatatan log data terbaru (WIB & UTC).

#### 2. Real-Time Summary Cards (Metrik Telemetri)
- **Card Panel Surya (PV)**: Daya $P_{PV}$ (Watt), Tegangan $V_{PV}$ (V), Arus $I_{PV}$ (A), serta **Intensitas Cahaya Matahari (`lux_val` Lux)** dilengkapi badge status kondisi cahaya (`Sangat Cerah`, `Cerah`, `Sedang`, `Redup`, `Gelap`).
- **Card Baterai (BAT)**: Daya $P_{BAT}$ (Watt), Status (`CHARGING`/`DISCHARGING`), Tegangan $V_{BAT}$ (V), Arus $I_{BAT}$ (A).
- **Card Akumulasi Energi & Kontrol**:
  - Total akumulasi energi (Wh/kWh) dengan opsi switcher periode (**Harian**, **Mingguan**, **Bulanan**).
  - Efisiensi SCC (%).
  - Status Dump Load (`Dump Load Status`: `DUMP LOAD: PWM X%` atau `DUMP LOAD: OFF`).

#### 3. Interactive Apache ECharts Section
- **Power EChart (Line Chart)**: Grafik daya $P_{PV}$ vs $P_{BAT}$ (Watt).
- **Voltage EChart (Line Chart)**: Grafik perbandingan tegangan $V_{PV}$ vs $V_{BAT}$ (Volt).
- **Lux Comparison EChart (Dual Y-Axis Full Width Chart)**: Grafik komparasi Intensitas Cahaya Matahari (Lux, sumbu Y kanan) terhadap parameter pilihan ($P_{PV}$ Watt, $P_{BAT}$ Watt, $V_{PV}$ Volt, atau $V_{BAT}$ Volt, sumbu Y kiri) membentang penuh (*full-width*) dengan sakelar pemilih (*metric selector*).
- **Daily Wh EChart (Bar Chart)**: Grafik batang akumulasi energi (Wh / kWh) per periode.
- **Filter Periode Harian**: Pada mode Harian, grafik memulai visualisasi secara presisi dari entri data pertama hari tersebut (sejak 00:00 WIB).

---

### C. Halaman Tab 2: "Data Energi"

#### 1. Filter & Action Control Bar
- **Search Bar**: Pencarian kata kunci bebas pada kolom timestamp, status, lux, dll.
- **Date Range Filter**: Filter tanggal *Dari* dan *Sampai*.
- **Reset Filter**: Mengembalikan filter ke kondisi default.
- **Tombol Export CSV**: Mengunduh data log dalam format `.csv` berstandar SD Card (16 kolom).

#### 2. Log Data Table
Tabel interaktif yang menampilkan 15 kolom data teknis lengkap (termasuk kolom Lux) dari seluruh riwayat pengukuran sensor.

#### 3. Pagination Controls
- Informasi jumlah baris data yang ditampilkan.
- Selector jumlah baris per halaman (**15**, **50**, **100** data per halaman).
- Tombol navigasi halaman *Previous* ($\leftarrow$) dan *Next* ($\rightarrow$).

---

*Dokumentasi ini dibuat untuk proyek Solar Energy Monitoring System — NGR Media & Universitas Putra Bangsa.*
