# ☀️ Solar Energy Monitoring System Dashboard (React + Apache ECharts)

Web Dashboard Monitoring Energi Panel Surya (50Wp/100Wp) berbasis **React** (Vite + React), **Apache ECharts** (`echarts` / `echarts-for-react`), dan **Tailwind CSS Dark Mode**, terintegrasi langsung dengan **Google Sheets API** (`1tNRnoSC2yC3ejFei0OsqDqz2w4rHcmbnRGLwnv9aRXc`) sebagai Cloud Database time-series data log mikrokontroler ESP32.

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Apache ECharts](https://img.shields.io/badge/Apache_ECharts-5-AA2116?style=for-the-badge&logo=apache-echarts)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-Dark_Mode-38BDF8?style=for-the-badge&logo=tailwind-css)
![Google Sheets](https://img.shields.io/badge/Google_Sheets_API-v4-34A853?style=for-the-badge&logo=google-sheets)

---

## 🚀 Fitur Utama React Dashboard

1. **System Diagnostic & Health Panel (Top Bar Widget)**
   - Status Koneksi Alat (`ONLINE` / `OFFLINE` otomatis berdasarkan timestamp log terbaru).
   - Format Uptime ESP32 (`uptime_sec` -> `X Hari, Y Jam, Z Menit`).
   - Suhu Internal/Box (`esp_temp` °C) dengan indikator status suhu (Normal, Warm, High).
   - Free Heap RAM (`free_heap` KB).
   - Sinyal Wi-Fi (`wifi_rssi` dBm & indikator kualitas sinyal).
   - Status Penyimpanan SD Card (`sd_status`).

2. **Real-Time Summary Cards**
   - **Panel Surya (PV)**: Tegangan (`v_pv`), Arus (`i_pv`), Daya (`p_pv`).
   - **Pengisian Baterai (BAT)**: Tegangan (`v_bat`), Arus (`i_bat`), Daya (`p_bat`), Status (`CHARGING`/`DISCHARGING`).
   - **Sistem Control & Akumulasi**: Energi Harian (`wh_pv_daily`), Efisiensi SCC (`scc_eff` %), Status Relay Load (`load_status` ON/OFF).

3. **Interactive Apache ECharts Panels**
   - **Line Chart 1 (`PowerEChart.jsx`)**: Kurva Daya Panel (`p_pv`) vs Daya Baterai (`p_bat`) dengan area gradient & glowing curves.
   - **Line Chart 2 (`VoltageEChart.jsx`)**: Kurva Tegangan Panel (`v_pv`) vs Tegangan Baterai (`v_bat`).
   - **Bar Chart 3 (`DailyWhEChart.jsx`)**: Total Akumulasi Energi Wh Harian.

4. **100% Identical SD Card CSV Exporter & History Table**
   - Filter rentang tanggal data log (`date_from` s/d `date_to`).
   - Tombol **Export / Download CSV** (`csvExporter.js`) yang men-stream file `.csv` secara langsung dengan header & format data 100% identik dengan berkas log SD Card ESP32.
   - Paginasi data log interaktif.

5. **Automatic Fallback & Mock Data Preview**
   - Jika koneksi Google Sheets mengalami error/timeout, `solarService.js` secara otomatis beralih ke **Fallback Local Time-Series Mock Generator** 24 jam untuk memastikan UI dashboard tetap dapat di-render dan di-preview 100% sempurna tanpa crash.

---

## ⚙️ Panduan Instalasi & Jalankan Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Jalankan Dev Server
```bash
npm run dev
```
Akses dashboard pada browser melalui: `http://localhost:3000`.

### 3. Build untuk Production
```bash
npm run build
```

---

## 📁 Struktur Berkas Utama

- `src/services/solarService.js` — Service fetching Google Sheets data & fallback mock time-series generator.
- `src/utils/csvExporter.js` — Utility exporter CSV presisi log SD Card.
- `src/components/DiagnosticPanel.jsx` — Widget Top Bar diagnostik & kesehatan alat.
- `src/components/SummaryCards.jsx` — Metric cards real-time (PV, BAT, Energy Daily).
- `src/components/PowerEChart.jsx` — Apache ECharts Line Chart Daya PV vs Bat.
- `src/components/VoltageEChart.jsx` — Apache ECharts Line Chart Tegangan PV vs Bat.
- `src/components/DailyWhEChart.jsx` — Apache ECharts Bar Chart Wh Daily.
- `src/components/DataTable.jsx` — Tabel data log + Date range filter + Pagination + CSV Downloader.
- `src/App.jsx` — Main Layout React App.
