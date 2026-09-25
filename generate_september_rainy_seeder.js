import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output paths
const outputPath = path.join(__dirname, 'Log_2026_09_Seeder.csv');
const outputPathRainy = path.join(__dirname, 'Log_2026_09_Musim_Hujan.csv');

// Header matching ESP32 SD Card & Google Sheets schema (16 columns)
const headers = [
  'TIMESTAMP',
  'V_PV',
  'I_PV',
  'P_PV',
  'WH_DAILY',
  'LUX',
  'SUNSHINE_JAM',
  'V_BAT',
  'I_BAT',
  'P_BAT',
  'SCC_EFF',
  'DUMP_LOAD_PWM',
  'UPTIME_SEC',
  'ESP_TEMP',
  'FREE_HEAP',
  'SD_STATUS'
];

// Define Weather Profiles for each day of September (1 to 30)
// 'heavy_rain' : Badai / Hujan Deras seharian (Lux < 15k, P_pv < 18W)
// 'afternoon_rain' : Hujan Sore / Mendung (Cerah pagi, hujan jam 12-16)
// 'partly_cloudy' : Cerah Berawan (Diselingi awan mendung singkat)
const septemberWeather = {
  1: 'afternoon_rain',
  2: 'heavy_rain',
  3: 'partly_cloudy',
  4: 'afternoon_rain',
  5: 'heavy_rain',
  6: 'partly_cloudy',
  7: 'afternoon_rain',
  8: 'heavy_rain',
  9: 'heavy_rain',
  10: 'partly_cloudy',
  11: 'afternoon_rain',
  12: 'afternoon_rain',
  13: 'partly_cloudy',
  14: 'heavy_rain',
  15: 'heavy_rain',
  16: 'afternoon_rain',
  17: 'partly_cloudy',
  18: 'afternoon_rain',
  19: 'afternoon_rain',
  20: 'heavy_rain',
  21: 'heavy_rain',
  22: 'partly_cloudy',
  23: 'afternoon_rain',
  24: 'heavy_rain',
  25: 'afternoon_rain',
  26: 'heavy_rain',
  27: 'heavy_rain',
  28: 'afternoon_rain',
  29: 'heavy_rain',
  30: 'afternoon_rain',
};

const rows = [headers.join(',')];

// September 1, 2026 00:00:00 WIB to September 30, 2026 23:50:00 WIB
// Note: WIB is UTC+7. So 2026-09-01 06:00 WIB is 2026-08-31 23:00 UTC.
const startWibMs = Date.UTC(2026, 8, 1, 0, 0, 0) - 7 * 3600 * 1000; // Sept 1 00:00 WIB in UTC ms
const endWibMs = Date.UTC(2026, 8, 30, 23, 50, 0) - 7 * 3600 * 1000;   // Sept 30 23:50 WIB in UTC ms

const stepMinutes = 10;
let currentMs = startWibMs;

let uptimeSec = 518400; // Starting ESP32 uptime
let whDaily = 0.0;
let sunshineAccumulator = 0.0;
let lastWibDay = -1;

while (currentMs <= endWibMs) {
  // Determine WIB time for weather & daily reset logic
  const wibTime = new Date(currentMs + 7 * 3600 * 1000);
  const wibYear = wibTime.getUTCFullYear();
  const wibMonth = wibTime.getUTCMonth() + 1; // 9 for September
  const wibDay = wibTime.getUTCDate();
  const wibHour = wibTime.getUTCHours();
  const wibMin = wibTime.getUTCMinutes();

  // Reset daily energy accumulator on a new WIB day
  if (lastWibDay !== -1 && wibDay !== lastWibDay) {
    whDaily = 0.0;
    sunshineAccumulator = 0.0;
  }
  lastWibDay = wibDay;

  // Daytime logging only (06:00 WIB to 18:00 WIB)
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

    const weatherType = septemberWeather[wibDay] || 'afternoon_rain';

    let cloudAttenuation = 1.0;
    if (weatherType === 'heavy_rain') {
      // Very heavy cloud cover & rain all day long (Lux down to 5-15%)
      cloudAttenuation = 0.08 + Math.random() * 0.12;
    } else if (weatherType === 'afternoon_rain') {
      // Bright in morning, rain starts around 12:00 - 16:30 WIB
      if (wibHour >= 12 && wibHour <= 16) {
        cloudAttenuation = 0.10 + Math.random() * 0.15; // Rain storm afternoon
      } else {
        cloudAttenuation = 0.55 + Math.random() * 0.30; // Moderate morning
      }
    } else if (weatherType === 'partly_cloudy') {
      // Mostly sunny with passing rain clouds
      if ((wibHour === 10 || wibHour === 14) && Math.random() > 0.4) {
        cloudAttenuation = 0.25 + Math.random() * 0.20; // Brief cloud cover
      } else {
        cloudAttenuation = 0.80 + Math.random() * 0.18; // Sunny
      }
    }

    const effectiveSun = theoreticalSun * cloudAttenuation;

    // Electrical physics calculations based on solar irradiance
    const v_pv = parseFloat((12.0 + 7.2 * Math.pow(effectiveSun, 0.25)).toFixed(2));
    const i_pv = parseFloat((5.4 * effectiveSun).toFixed(2));
    const p_pv = parseFloat((v_pv * i_pv).toFixed(2));

    // Lux calculation (Max ~90,000 lux on clear day)
    const lux_val = parseFloat((effectiveSun * 88000 + Math.random() * 300).toFixed(1));

    // Daily Wh accumulator (+ P * 10/60 hrs)
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
    let dump_load_pwm = 0;
    if (p_pv > 40) {
      dump_load_pwm = Math.min(100, Math.max(15, Math.round(((p_pv - 40) / 50) * 85 + 15)));
    } else if (p_pv > 18) {
      dump_load_pwm = Math.min(40, Math.max(10, Math.round(((p_pv - 18) / 22) * 30 + 10)));
    }

    // Ambient/ESP temperature drops during rain
    const tempBase = weatherType === 'heavy_rain' ? 28.5 : 31.0;
    const esp_temp = parseFloat((tempBase + (p_pv / 8) + (Math.random() * 1.2 - 0.6)).toFixed(1));
    const free_heap = Math.floor(211000 + Math.random() * 15000);

    const row = [
      timestampUtcStr,
      v_pv.toFixed(2),
      i_pv.toFixed(2),
      p_pv.toFixed(2),
      whDaily.toFixed(2),
      Math.round(lux_val),
      sunshineAccumulator.toFixed(2),
      v_bat.toFixed(2),
      i_bat.toFixed(2),
      p_bat.toFixed(2),
      scc_eff.toFixed(1),
      dump_load_pwm,
      uptimeSec,
      esp_temp.toFixed(1),
      free_heap,
      'OK'
    ];

    rows.push(row.join(','));
  }

  currentMs += stepMinutes * 60 * 1000;
  uptimeSec += stepMinutes * 60;
}

const csvContent = rows.join('\n');
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

safeWrite(outputPath, csvContent);
safeWrite(outputPathRainy, csvContent);

console.log(`[SUCCESS] Generated ${rows.length - 1} September Rainy Season logs to:`);
console.log(` - ${outputPath}`);
console.log(` - ${outputPathRainy}`);
