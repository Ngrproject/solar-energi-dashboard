import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output paths
const outputPathAug = path.join(__dirname, 'Log_2026_08_Seeder.csv');
const outputPathSep = path.join(__dirname, 'Log_2026_09_Seeder.csv');
const outputPathRainy = path.join(__dirname, 'Log_2026_09_Musim_Hujan.csv');

// Header matching Google Sheets & ESP32 SD Card schema (17 columns)
const headers = [
  'timestamp',
  'v_pv',
  'i_pv',
  'p_pv',
  'wh_pv_daily',
  'v_bat',
  'i_bat',
  'p_bat',
  'scc_eff',
  'load_status',
  'uptime_sec',
  'esp_temp',
  'free_heap',
  'wifi_rssi',
  'sd_status',
  'lux_val',
  'sunshine_hours_daily'
];

// Weather pattern generator based on day index
function getWeatherProfile(dayNumber, monthNumber) {
  if (monthNumber === 8) {
    // August (Kemarau - Mostly sunny with occasional clouds)
    if ([5, 14, 22].includes(dayNumber)) return 'partly_cloudy';
    if ([18].includes(dayNumber)) return 'afternoon_rain';
    return 'sunny';
  } else {
    // September (Mulai Hujan)
    if ([2, 5, 8, 9, 14, 15, 20, 21, 24, 26, 27, 29].includes(dayNumber)) return 'heavy_rain';
    if ([1, 4, 7, 11, 12, 16, 18, 19, 23, 25, 28, 30].includes(dayNumber)) return 'afternoon_rain';
    return 'partly_cloudy';
  }
}

const rowsAug = [headers.join(',')];
const rowsSep = [headers.join(',')];

// Start: August 1, 2026 00:00:00 WIB (UTC ms: 2026-07-31 17:00:00)
const startWibMs = Date.UTC(2026, 7, 1, 0, 0, 0) - 7 * 3600 * 1000;
// End: Current timestamp (detik ini)
const endWibMs = new Date().getTime();

const stepMinutes = 10;
let currentMs = startWibMs;

let uptimeSec = 518400; // Starting ESP32 uptime
let whDaily = 0.0;
let sunshineAccumulator = 0.0;
let lastWibDay = -1;

while (currentMs <= endWibMs) {
  const wibTime = new Date(currentMs + 7 * 3600 * 1000);
  const wibMonth = wibTime.getUTCMonth() + 1; // 8 for August, 9 for September
  const wibDay = wibTime.getUTCDate();
  const wibHour = wibTime.getUTCHours();
  const wibMin = wibTime.getUTCMinutes();

  // Reset daily accumulators on a new WIB day (00:00 WIB)
  if (lastWibDay !== -1 && wibDay !== lastWibDay) {
    whDaily = 0.0;
    sunshineAccumulator = 0.0;
  }
  lastWibDay = wibDay;

  // USER RULE: ONLY include data during daytime solar activity (sunrise 06:00 WIB to sunset 18:00 WIB)
  // Nighttime (18:01 to 05:59 WIB) is skipped completely!
  if (wibHour >= 6 && wibHour <= 18) {
    // Timestamp for CSV is in UTC (Format: YYYY-MM-DD HH:mm:ss)
    const dateObj = new Date(currentMs);
    const yyyy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    const hh = String(dateObj.getUTCHours()).padStart(2, '0');
    const min = String(dateObj.getUTCMinutes()).padStart(2, '0');
    const ss = String(dateObj.getUTCSeconds()).padStart(2, '0');
    const timestampUtcStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

    const timeInHours = (wibHour - 6) + (wibMin / 60); // 0 at 06:00, 6 at 12:00, 12 at 18:00
    const theoreticalSun = Math.max(0, Math.sin((timeInHours / 12) * Math.PI));

    const weatherType = getWeatherProfile(wibDay, wibMonth);

    let cloudAttenuation = 1.0;
    if (weatherType === 'sunny') {
      cloudAttenuation = 0.88 + Math.random() * 0.12;
    } else if (weatherType === 'heavy_rain') {
      cloudAttenuation = 0.08 + Math.random() * 0.12;
    } else if (weatherType === 'afternoon_rain') {
      if (wibHour >= 12 && wibHour <= 16) {
        cloudAttenuation = 0.10 + Math.random() * 0.15;
      } else {
        cloudAttenuation = 0.60 + Math.random() * 0.28;
      }
    } else if (weatherType === 'partly_cloudy') {
      if ((wibHour === 10 || wibHour === 14) && Math.random() > 0.4) {
        cloudAttenuation = 0.30 + Math.random() * 0.20;
      } else {
        cloudAttenuation = 0.82 + Math.random() * 0.15;
      }
    }

    const effectiveSun = theoreticalSun * cloudAttenuation;

    // Electrical physics calculations based on solar irradiance
    const v_pv = parseFloat((12.0 + 7.5 * Math.pow(effectiveSun, 0.25)).toFixed(2));
    const i_pv = parseFloat((5.4 * effectiveSun).toFixed(2));
    const p_pv = parseFloat((v_pv * i_pv).toFixed(2));

    // Lux calculation (Max ~88,000 lux)
    const lux_val = parseFloat((effectiveSun * 86000 + Math.random() * 300).toFixed(1));

    // Accumulators
    whDaily += p_pv * (stepMinutes / 60);
    if (p_pv > 5 || lux_val > 10000) {
      sunshineAccumulator += stepMinutes / 60;
    }

    // Battery dynamics
    const v_bat = parseFloat((12.4 + 1.9 * effectiveSun).toFixed(2));
    const scc_eff = parseFloat((90.0 + 7.5 * Math.min(1.0, effectiveSun * 1.2)).toFixed(1));
    const p_bat = parseFloat((p_pv * (scc_eff / 100)).toFixed(2));
    const i_bat = v_bat > 0 ? parseFloat((p_bat / v_bat).toFixed(2)) : 0.0;

    // Dump load PWM logic
    let load_status = 'OFF';
    if (p_pv > 40) {
      const pwmPct = Math.min(100, Math.max(15, Math.round(((p_pv - 40) / 50) * 85 + 15)));
      load_status = `PWM ${pwmPct}%`;
    } else if (p_pv > 18) {
      const pwmPct = Math.min(40, Math.max(10, Math.round(((p_pv - 18) / 22) * 30 + 10)));
      load_status = `PWM ${pwmPct}%`;
    }

    const tempBase = weatherType === 'heavy_rain' ? 28.5 : 31.2;
    const esp_temp = parseFloat((tempBase + (p_pv / 8) + (Math.random() * 1.2 - 0.6)).toFixed(1));
    const free_heap = Math.floor(211000 + Math.random() * 15000);
    const wifi_rssi = -65 + Math.floor(Math.random() * 6 - 3);

    const row = [
      timestampUtcStr,
      v_pv.toFixed(2),
      i_pv.toFixed(2),
      p_pv.toFixed(2),
      whDaily.toFixed(2),
      v_bat.toFixed(2),
      i_bat.toFixed(2),
      p_bat.toFixed(2),
      scc_eff.toFixed(1),
      load_status,
      uptimeSec,
      esp_temp.toFixed(1),
      free_heap,
      wifi_rssi,
      'MOUNTED',
      lux_val.toFixed(1),
      sunshineAccumulator.toFixed(2)
    ];

    if (wibMonth === 8) {
      rowsAug.push(row.join(','));
    } else if (wibMonth === 9) {
      rowsSep.push(row.join(','));
    }
  }

  currentMs += stepMinutes * 60 * 1000;
  uptimeSec += stepMinutes * 60;
}

function safeWrite(file, content) {
  try {
    fs.writeFileSync(file, content, 'utf8');
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`File ${file} is busy, retrying in 500ms...`);
      setTimeout(() => safeWrite(file, content), 500);
    } else {
      throw err;
    }
  }
}

safeWrite(outputPathAug, rowsAug.join('\n'));
safeWrite(outputPathSep, rowsSep.join('\n'));
safeWrite(outputPathRainy, rowsSep.join('\n'));

console.log(`[SUCCESS] Generated Daytime Solar Activity logs (1 Agustus 2026 - ${new Date().toISOString()}):`);
console.log(` - August 2026: ${rowsAug.length - 1} records -> ${outputPathAug}`);
console.log(` - September 2026: ${rowsSep.length - 1} records -> ${outputPathSep}`);
