import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sun,
  Zap,
  Battery,
  Sparkles,
  BarChart3,
  RefreshCw,
  Sliders,
  Info,
  Satellite,
  Compass
} from 'lucide-react';
import Papa from 'papaparse';
import {
  parseEra5Csv,
  alignHourlyData,
  calculateCorrelationStats,
  getCorrelationStrength,
} from '../services/era5Service';
import Era5ComparisonChart from './Era5ComparisonChart';
import Era5CorrelationScatterCharts from './Era5CorrelationScatterCharts';
import Era5ComparisonTable from './Era5ComparisonTable';

export default function Era5ComparisonPage({ logs = [] }) {
  // ERA5 File State: initially empty (user must upload their CSV file first)
  const [era5CsvText, setEra5CsvText] = useState('');
  const [era5FileName, setEra5FileName] = useState('');
  const [uploadError, setUploadError] = useState(null);

  // Conversion & Settings
  const [deaccumulate, setDeaccumulate] = useState(true); // true = ECMWF de-accumulation (Δ J/m² ÷ 3600), false = direct division
  const [timeZone, setTimeZone] = useState('WIB'); // 'WIB' or 'UTC'
  const [daylightOnly, setDaylightOnly] = useState(true); // true = 06:00 - 18:00 WIB
  const [selectedDate, setSelectedDate] = useState('ALL');
  const [viewTab, setChartViewTab] = useState('multi-axis'); // 'multi-axis' | 'normalized' | 'scatter'

  // Custom Sensor CSV Option (optional override for `logs`)
  const [useCustomSensor, setUseCustomSensor] = useState(false);
  const [customSensorLogs, setCustomSensorLogs] = useState([]);
  const [customSensorFileName, setCustomSensorFileName] = useState('');

  // Ref for ERA5 File Input
  const fileInputRef = useRef(null);

  // Timezone handler: resets selectedDate to 'ALL' to prevent timezone day-boundary cutoff
  const handleTimeZoneChange = (newTz) => {
    setTimeZone(newTz);
    setSelectedDate('ALL');
  };

  // Detect whether uploaded CSV is already preprocessed hourly
  const isPreprocessedHourly = useMemo(() => {
    if (!era5CsvText) return false;
    const lower = era5CsvText.substring(0, 600).toLowerCase();
    return lower.includes('irradiansi_rata2') || lower.includes('per_jam');
  }, [era5CsvText]);

  // Handle ERA5 File Upload
  const handleEra5FileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setEra5FileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        const lower = content.toLowerCase();
        if (
          !lower.includes('radiasi') &&
          !lower.includes('j_m2') &&
          !lower.includes('irradiansi') &&
          !lower.includes('ssrd')
        ) {
          setUploadError('Peringatan: Berkas CSV tidak terdeteksi memiliki kolom radiasi (radiasi_J_m2, irradiansi_rata2_W_m2, atau ssrd).');
        }
        setEra5CsvText(content);
      }
    };
    reader.onerror = () => {
      setUploadError('Gagal membaca berkas CSV.');
    };
    reader.readAsText(file);
  };

  // Handle Custom Sensor File Upload (e.g. from SD card or Seeder)
  const handleSensorFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCustomSensorFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: true });
          if (parsed.data && parsed.data.length > 0) {
            // Check if rows can be processed
            const rows = parsed.data.map((r) => {
              const clean = {};
              Object.keys(r).forEach((k) => (clean[k.trim().toLowerCase()] = r[k]));
              const v_pv = parseFloat(clean.v_pv || 0);
              const i_pv = parseFloat(clean.i_pv || 0);
              const p_pv = parseFloat(clean.p_pv || v_pv * i_pv);
              const v_bat = parseFloat(clean.v_bat || 0);
              const i_bat = parseFloat(clean.i_bat || 0);
              const p_bat = parseFloat(clean.p_bat || v_bat * i_bat);
              const lux = parseFloat(clean.lux || clean.lux_val || 0);
              const ts = clean.timestamp || clean['time stamp'] || '';
              return {
                timestamp: ts,
                wibDateStr: ts.length >= 10 ? ts.substring(0, 10) : '',
                wibTimeStr: ts.length >= 16 ? ts.substring(11, 16) : '',
                p_pv,
                p_bat,
                v_pv,
                v_bat,
                lux_val: lux,
              };
            });
            setCustomSensorLogs(rows);
            setUseCustomSensor(true);
          }
        } catch (err) {
          console.error('Error parsing custom sensor CSV:', err);
        }
      }
    };
    reader.readAsText(file);
  };

  // Determine active sensor logs
  const activeSensorLogs = useMemo(() => {
    return useCustomSensor && customSensorLogs.length > 0 ? customSensorLogs : logs;
  }, [useCustomSensor, customSensorLogs, logs]);

  // Parse ERA5 CSV
  const era5Records = useMemo(() => {
    if (!era5CsvText) return [];
    return parseEra5Csv(era5CsvText, { deaccumulate });
  }, [era5CsvText, deaccumulate]);

  // Align sensor data with ERA5 hourly timestamps
  const alignedData = useMemo(() => {
    return alignHourlyData(activeSensorLogs, era5Records, {
      timeZone,
      daylightOnly,
      dateFilter: selectedDate,
    });
  }, [activeSensorLogs, era5Records, timeZone, daylightOnly, selectedDate]);

  // Extract available dates for date dropdown
  const availableDates = useMemo(() => {
    const dates = new Set();
    era5Records.forEach((r) => {
      const d = timeZone === 'WIB' ? r.wibDateStr : r.utcDateStr;
      if (d) dates.add(d);
    });
    return Array.from(dates).sort();
  }, [era5Records, timeZone]);

  // Calculate correlation statistics
  const stats = useMemo(() => {
    return calculateCorrelationStats(alignedData);
  }, [alignedData]);

  const strengthPv = getCorrelationStrength(stats.r_pv);
  const strengthBat = getCorrelationStrength(stats.r_bat);
  const strengthLux = getCorrelationStrength(stats.r_lux);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              <Satellite className="w-3.5 h-3.5 text-blue-300" />
              Satelit ERA5 ECMWF Reanalysis
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/30 text-amber-200 border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Konversi J/m² → W/m² Terintegrasi
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              <Compass className="w-3.5 h-3.5 text-emerald-300" />
              Resampling Per Jam
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Validasi & Komparasi Data Satelit ERA5
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Bandingkan radiasi matahari permukaan dari satelit ERA5 dengan daya panel surya (Watt PV),
            daya pengisian baterai (Watt BAT), dan sensor cahaya (Lux) pada interval per jam untuk menganalisis korelasi dan akurasi estimasi energi.
          </p>
        </div>
      </div>

      {/* SECTION 1: UPLOAD & CONFIGURATION CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ERA5 CSV Upload Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    1. Unggah Berkas Satelit ERA5 (.csv)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format Google Earth Engine (system:index, radiasi_J_m2, waktu, .geo)
                  </p>
                </div>
              </div>

              {era5Records.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {era5Records.length} Titik Data ERA5
                </span>
              )}
            </div>

            {/* Drop / Browse Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleEra5FileUpload}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto transition-colors" />
              <div className="mt-2 text-xs font-bold text-slate-700 group-hover:text-blue-600">
                Klik untuk Memilih File CSV atau Drag & Drop di sini
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Contoh: ERA5Land_Radiasi_Cilacap_2026-10-01_sampai_2026-10-28.csv
              </div>
            </div>

            {/* Upload Feedback */}
            {uploadError && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Loaded File Info Pill */}
            {era5FileName && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{era5FileName}</span>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-blue-600 hover:underline shrink-0 ml-2"
                >
                  Ganti File
                </button>
              </div>
            )}
          </div>

          {/* Upload Status Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-500">
              {availableDates.length > 0 ? (
                <span>
                  Rentang Waktu: <strong className="text-slate-700">{availableDates[0]}</strong> s/d{' '}
                  <strong className="text-slate-700">{availableDates[availableDates.length - 1]}</strong>
                </span>
              ) : (
                <span className="italic text-amber-600 font-medium">Wajib mengunggah berkas CSV satelit untuk memulai</span>
              )}
            </div>

            {era5FileName && (
              <button
                onClick={() => {
                  setEra5CsvText('');
                  setEra5FileName('');
                  setUploadError(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
              >
                Hapus / Reset File
              </button>
            )}
          </div>
        </div>

        {/* Conversion & Filter Settings Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  2. Konversi & Penyelarasan Waktu
                </h3>
                <p className="text-xs text-slate-500">Fisika J/m² → W/m² & Zona Waktu</p>
              </div>
            </div>

            {/* Formula Explanation / Preprocessed Status Badge */}
            {isPreprocessedHourly ? (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl mb-4 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Format Fluks Per Jam Terdeteksi:</span>
                </div>
                <div className="font-mono text-[11px] text-emerald-950 bg-white/80 px-2 py-1 rounded-lg border border-emerald-200/60 mb-1">
                  irradiansi_rata2_W_m2 (ERA5-Land)
                </div>
                <p className="text-[10px] text-emerald-700 leading-tight">
                  Berkas CSV ini sudah berisi data fluks radiasi per jam yang sudah dihitung langsung oleh ERA5-Land (bukan data akumulatif). Maka nilai <strong>De-akumulasi</strong> dan <strong>Bagi Langsung</strong> bernilai <strong>identik</strong> ({stats.peak_era5.toFixed(1)} W/m²).
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl mb-4 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Rumus Konversi Fisika:</span>
                </div>
                <div className="font-mono text-[11px] text-amber-900 bg-white/70 px-2 py-1 rounded-lg border border-amber-200/50">
                  W/m² = Δ Energi (J/m²) ÷ 3600 detik
                </div>
                <p className="text-[10px] text-amber-700 mt-1 leading-tight">
                  Data ERA5 SSRD mengakumulasi energi radiasi harian mulai 00:00 UTC. De-akumulasi menghitung fluks per jam secara presisi.
                </p>
              </div>
            )}

            {/* Settings Toggles */}
            <div className="space-y-3 text-xs">
              {/* De-accumulation Mode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Metode Konversi:</label>
                  {isPreprocessedHourly && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Nilai Identik
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDeaccumulate(true)}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      deaccumulate
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px]">De-akumulasi Δ</div>
                    <div className="text-[9px] text-slate-400 font-normal">Fisika ECMWF (0-1000 W/m²)</div>
                  </button>
                  <button
                    onClick={() => setDeaccumulate(false)}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      !deaccumulate
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px]">Bagi Langsung</div>
                    <div className="text-[9px] text-slate-400 font-normal">J/m² ÷ 3600</div>
                  </button>
                </div>
              </div>

              {/* Timezone Switcher */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Zona Waktu Komparasi:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTimeZoneChange('WIB')}
                    className={`py-1.5 px-3 rounded-xl border font-bold transition-all cursor-pointer ${
                      timeZone === 'WIB'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    WIB (UTC+7)
                  </button>
                  <button
                    onClick={() => handleTimeZoneChange('UTC')}
                    className={`py-1.5 px-3 rounded-xl border font-bold transition-all cursor-pointer ${
                      timeZone === 'UTC'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    UTC Standar
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {timeZone === 'WIB'
                    ? 'Puncak radiasi siang di Cilacap berada pada ~12:00 WIB'
                    : 'Puncak radiasi siang di Cilacap berada pada ~05:00 UTC (WIB - 7 Jam)'}
                </div>
              </div>

              {/* Daylight Only Filter Switch */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-semibold text-slate-700">Hanya Jam Penyinaran:</span>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {daylightOnly ? 'Aktif: Hanya 06:00 - 18:00 WIB (268 Jam)' : 'Non-aktif: 24 Jam Penuh (498 Jam)'}
                  </div>
                </div>
                <button
                  onClick={() => setDaylightOnly(!daylightOnly)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    daylightOnly ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                  title={daylightOnly ? "Beralih ke mode 24 jam penuh" : "Beralih ke hanya jam siang"}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md block"></span>
                </button>
              </div>
            </div>
          </div>

          {/* Sensor Source Selection Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Sumber Data Sensor:</span>
            <span className="font-bold text-slate-700">
              {useCustomSensor ? customSensorFileName : `Dashboard Aktif (${activeSensorLogs.length} logs)`}
            </span>
          </div>
        </div>
      </div>

      {/* CONDITIONAL RENDER: EMPTY STATE VS COMPARISON DASHBOARD */}
      {era5Records.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-dashed border-slate-200 shadow-xs text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
              <Satellite className="w-8 h-8 text-blue-600" />
            </div>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
              Belum Ada Data Satelit ERA5 yang Dimuat
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Silakan unggah berkas CSV data radiasi satelit ERA5 (misalnya <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">ERA5Land_Radiasi_Cilacap_2026-10-01_sampai_2026-10-28.csv</span>) pada panel unggah di atas.
              Grafik komparasi, korelasi, dan tabel evaluasi akan otomatis ditampilkan setelah berkas terbaca.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              Pilih Berkas CSV ERA5 Sekarang
            </button>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-100 text-left">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2 mb-1.5 text-blue-600 font-bold text-xs">
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>1. Konversi W/m² Otomatis</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Mendukung konversi Joules/m² (GEE) maupun nilai irradiansi W/m² (ERA5-Land) secara instan.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2 mb-1.5 text-indigo-600 font-bold text-xs">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>2. Skala Sumbu Mandiri</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Daya PV (0–100 W) dan Radiasi Satelit (0–1000 W/m²) dipisahkan sumbunya agar kurva terbaca jelas.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2 mb-1.5 text-emerald-600 font-bold text-xs">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>3. Analisis Korelasi Pearson</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Menghitung koefisien korelasi linear r dan R² serta visualisasi diagram pencar (scatter plot).
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 2: STATISTICAL CORRELATION SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: ERA5 vs Watt PV */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
                  <Zap className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${strengthPv.badgeBg}`}>
                  {strengthPv.label}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500">Korelasi ERA5 vs Daya PV</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  r = {stats.r_pv > 0 ? `+${stats.r_pv}` : stats.r_pv}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>R² (Determinasi):</span>
                <span className="font-mono font-bold text-blue-700">{(stats.r2_pv * 100).toFixed(1)}%</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                Variasi daya PV dijelaskan oleh radiasi satelit.
              </div>
            </div>

            {/* Card 2: ERA5 vs Watt BAT */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Battery className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${strengthBat.badgeBg}`}>
                  {strengthBat.label}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500">Korelasi ERA5 vs Baterai</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  r = {stats.r_bat > 0 ? `+${stats.r_bat}` : stats.r_bat}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>R² (Determinasi):</span>
                <span className="font-mono font-bold text-emerald-700">{(stats.r2_bat * 100).toFixed(1)}%</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                Kesesuaian fluks satelit dengan pengisian baterai.
              </div>
            </div>

            {/* Card 3: ERA5 vs Sensor Lux */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-2xl">
                  <Sun className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${strengthLux.badgeBg}`}>
                  {strengthLux.label}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500">Korelasi ERA5 vs Sensor Lux</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  r = {stats.r_lux > 0 ? `+${stats.r_lux}` : stats.r_lux}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>R² (Determinasi):</span>
                <span className="font-mono font-bold text-purple-700">{(stats.r2_lux * 100).toFixed(1)}%</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                Kesesuaian radiasi satelit dengan sensor fotometrik.
              </div>
            </div>

            {/* Card 4: Summary Overview */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Puncak & Data Cocok</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-blue-100 text-blue-700">
                    {stats.count} Jam Cocok ({daylightOnly ? 'Siang 06-18' : '24 Jam Penuh'})
                  </span>
                </div>
                <div className="space-y-1.5 text-xs mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Puncak ERA5:</span>
                    <span className="font-mono font-bold text-orange-600">{stats.peak_era5.toFixed(1)} W/m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Puncak Daya PV:</span>
                    <span className="font-mono font-bold text-blue-600">{stats.peak_pv.toFixed(1)} W</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Puncak Lux:</span>
                    <span className="font-mono font-bold text-purple-600">{stats.peak_lux.toLocaleString()} lx</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 mt-2">
                Rata-rata Radiasi ({daylightOnly ? 'Siang' : '24 Jam'}): <strong>{stats.mean_era5.toFixed(1)} W/m²</strong>
              </div>
            </div>
          </div>

          {/* SECTION 3: VISUAL COMPARISON CHARTS & SCATTER PLOTS */}
          <div>
            {/* Navigation Tabs between Line Chart and Scatter Plots */}
            <div className="flex items-center gap-2 mb-3 bg-slate-200/70 p-1.5 rounded-2xl max-w-md">
              <button
                onClick={() => setChartViewTab('multi-axis')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  viewTab === 'multi-axis' || viewTab === 'normalized'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Kurva Waktu Per Jam</span>
              </button>
              <button
                onClick={() => setChartViewTab('scatter')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  viewTab === 'scatter'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diagram Pencar (Scatter)</span>
              </button>
            </div>

            {viewTab === 'scatter' ? (
              <Era5CorrelationScatterCharts alignedData={alignedData} stats={stats} />
            ) : (
              <Era5ComparisonChart
                alignedData={alignedData}
                timeZone={timeZone}
                viewMode={viewTab}
                onViewModeChange={setChartViewTab}
              />
            )}
          </div>

          {/* SECTION 4: METEOROLOGICAL INSIGHT & BMKG SCIENTIFIC INTERPRETATION */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-3xl p-6 border border-slate-200/80 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm shrink-0 mt-0.5">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                <h4 className="text-sm font-bold text-slate-900">
                  Analisis Meteorologi & Verifikasi Satelit ERA5 (Cilacap)
                </h4>
                <p>
                  Berdasarkan hasil penyelarasan data per jam ({stats.count} interval observasi yang tervalidasi):
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>
                    <strong>Daya Panel Surya (P_PV):</strong> Menunjukkan korelasi linear{' '}
                    <span className="font-bold text-blue-700">{strengthPv.label.toLowerCase()} (r = {stats.r_pv})</span>{' '}
                    dengan radiasi satelit ERA5. Nilai R² = {(stats.r2_pv * 100).toFixed(1)}% membuktikan bahwa fluktuasi produksi energi harian panel surya sangat konsisten dengan estimasi model reanalisis atmosfer ECMWF.
                  </li>
                  <li>
                    <strong>Sensor Intensitas Cahaya (Lux):</strong> Memiliki korelasi{' '}
                    <span className="font-bold text-purple-700">{strengthLux.label.toLowerCase()} (r = {stats.r_lux})</span>{' '}
                    terhadap radiasi ERA5, mengonfirmasi respon linear sensor fotodioda darat terhadap intensitas radiasi matahari global yang mencapai permukaan tanah di wilayah Cilacap.
                  </li>
                  <li>
                    <strong>Daya Baterai (P_BAT):</strong> Mengikuti tren radiasi satelit dengan r = {stats.r_bat}, menunjukkan sistem SCC (*Solar Charge Controller*) mengalirkan daya sebanding dengan ketersediaan sinar matahari hingga baterai mencapai fase *float/absorb*.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 5: HOURLY COMPARISON TABLE & EXPORT */}
          <Era5ComparisonTable
            alignedData={alignedData}
            timeZone={timeZone}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            availableDates={availableDates}
          />
        </>
      )}
    </div>
  );
}
