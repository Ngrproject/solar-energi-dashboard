import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target CSV output path
const outputPath = path.join(__dirname, 'Log_2026_09_Seeder.csv');

// Header matching Google Sheets schema
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
  'lux_val'
];

const rows = [headers.join(',')];

// Period: Right now (detik ini) going back 1 month (30 days)
const endUtc = new Date(); // Current timestamp
const startUtc = new Date(endUtc.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days prior

const stepMinutes = 10;
let currentMs = startUtc.getTime();
const endMs = endUtc.getTime();

let uptimeSec = 259200; // Starting uptime
let whDaily = 0.0;
let lastWibDay = -1;

while (currentMs <= endMs) {
  const dateObj = new Date(currentMs);

  // Format UTC string: YYYY-MM-DD HH:mm:ss
  const yyyy = dateObj.getUTCFullYear();
  const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getUTCDate()).padStart(2, '0');
  const hh = String(dateObj.getUTCHours()).padStart(2, '0');
  const min = String(dateObj.getUTCMinutes()).padStart(2, '0');
  const ss = String(dateObj.getUTCSeconds()).padStart(2, '0');
  const timestampUtcStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

  // Determine WIB Hour and Minute (WIB = UTC + 7 Hours)
  const wibTime = new Date(currentMs + 7 * 60 * 60 * 1000);
  const wibDay = wibTime.getUTCDate();
  const wibHour = wibTime.getUTCHours();
  const wibMinute = wibTime.getUTCMinutes();

  // Reset daily energy accumulator on a new day
  if (lastWibDay !== -1 && wibDay !== lastWibDay) {
    whDaily = 0.0;
  }
  lastWibDay = wibDay;

  // USER RULE: ONLY include data during daytime (sunrise 06:00 WIB to sunset 18:00 WIB)
  // Skip nighttime (18:01 to 05:59 WIB) completely!
  if (wibHour >= 6 && wibHour <= 18) {
    const timeInHours = (wibHour - 6) + (wibMinute / 60);
    const sunFactor = Math.max(0, Math.sin((timeInHours / 12) * Math.PI));
    
    // Add realistic solar fluctuation noise (+/- 10%)
    const noise = 0.90 + Math.random() * 0.20;

    const v_pv = parseFloat((16.5 + 3.0 * sunFactor * noise).toFixed(2));
    const i_pv = parseFloat((5.2 * sunFactor * noise).toFixed(2));
    const p_pv = parseFloat((v_pv * i_pv).toFixed(2));
    const lux_val = parseFloat((sunFactor * noise * 85000 + Math.random() * 500).toFixed(1));

    // Daily Wh accumulation (Power * 10/60 hours)
    whDaily += p_pv * (stepMinutes / 60);

    const v_bat = parseFloat((12.6 + 1.8 * sunFactor * noise).toFixed(2));
    const scc_eff = parseFloat((92.0 + 6.0 * sunFactor).toFixed(1));
    const p_bat = parseFloat((p_pv * (scc_eff / 100)).toFixed(2));
    const i_bat = v_bat > 0 ? parseFloat((p_bat / v_bat).toFixed(2)) : 0.0;

    // Dump Load Duty Cycle PWM based on solar power generation
    let load_status = 'OFF';
    if (p_pv > 35) {
      const pwmPct = Math.min(100, Math.max(15, Math.round(((p_pv - 35) / 55) * 85 + 15)));
      load_status = `PWM ${pwmPct}%`;
    } else if (p_pv > 15) {
      const pwmPct = Math.min(45, Math.max(10, Math.round(((p_pv - 15) / 20) * 35 + 10)));
      load_status = `PWM ${pwmPct}%`;
    }

    const esp_temp = parseFloat((31.5 + (p_pv > 10 ? p_pv / 7 : 0) + (Math.random() * 1.5 - 0.75)).toFixed(1));
    const free_heap = Math.floor(212000 + Math.random() * 14000);
    const wifi_rssi = -64 + Math.floor(Math.random() * 6 - 3);

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
      lux_val.toFixed(1)
    ];

    rows.push(row.join(','));
  }

  currentMs += stepMinutes * 60 * 1000;
  uptimeSec += stepMinutes * 60;
}

fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
console.log(`Successfully generated ${rows.length - 1} daytime-only log records (last 30 days) to ${outputPath}`);
