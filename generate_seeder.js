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
  'sd_status'
];

const rows = [headers.join(',')];

// Period: Sept 1, 2026 00:00:00 UTC to Sept 10, 2026 02:35:00 UTC (09:35 WIB)
const startUtc = new Date(Date.UTC(2026, 8, 1, 0, 0, 0)); // Sept 1 2026 00:00 UTC
const endUtc = new Date(Date.UTC(2026, 8, 10, 2, 35, 0));  // Sept 10 2026 02:35 UTC

const stepMinutes = 10;
let currentMs = startUtc.getTime();
const endMs = endUtc.getTime();

let uptimeSec = 86400; // start with 1 day uptime
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

  // Determine WIB Hour and Minute for Solar Generation Curve
  // WIB = UTC + 7 Hours
  const wibTime = new Date(currentMs + 7 * 60 * 60 * 1000);
  const wibDay = wibTime.getUTCDate();
  const wibHour = wibTime.getUTCHours();
  const wibMinute = wibTime.getUTCMinutes();

  // Reset daily energy at 00:00 WIB
  if (lastWibDay !== -1 && wibDay !== lastWibDay) {
    whDaily = 0.0;
  }
  lastWibDay = wibDay;

  let v_pv = 0.0;
  let i_pv = 0.0;
  let p_pv = 0.0;
  let v_bat = 12.4;
  let i_bat = -0.3;
  let p_bat = -3.72;
  let scc_eff = 0.0;

  // Daytime in WIB: 06:00 WIB to 18:00 WIB
  if (wibHour >= 6 && wibHour < 18) {
    const timeInHours = (wibHour - 6) + (wibMinute / 60);
    const sunFactor = Math.max(0, Math.sin((timeInHours / 12) * Math.PI));
    
    // Add realistic solar fluctuation noise (+/- 8%)
    const noise = 0.92 + Math.random() * 0.16;

    v_pv = parseFloat((16.2 + 3.2 * sunFactor * noise).toFixed(2));
    i_pv = parseFloat((5.1 * sunFactor * noise).toFixed(2));
    p_pv = parseFloat((v_pv * i_pv).toFixed(2));

    // Daily Wh accumulation (Power * 10/60 hours)
    whDaily += p_pv * (stepMinutes / 60);

    v_bat = parseFloat((12.5 + 1.7 * sunFactor * noise).toFixed(2));
    scc_eff = parseFloat((91.5 + 6.5 * sunFactor).toFixed(1));
    p_bat = parseFloat((p_pv * (scc_eff / 100)).toFixed(2));
    i_bat = v_bat > 0 ? parseFloat((p_bat / v_bat).toFixed(2)) : 0.0;
  } else {
    // Nighttime
    v_pv = parseFloat((0.15 + Math.random() * 0.1).toFixed(2));
    i_pv = 0.0;
    p_pv = 0.0;
    
    v_bat = parseFloat((12.45 - Math.random() * 0.15).toFixed(2));
    i_bat = -0.32;
    p_bat = parseFloat((v_bat * i_bat).toFixed(2));
    scc_eff = 0.0;
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
    'ON',
    uptimeSec,
    esp_temp.toFixed(1),
    free_heap,
    wifi_rssi,
    'MOUNTED'
  ];

  rows.push(row.join(','));

  currentMs += stepMinutes * 60 * 1000;
  uptimeSec += stepMinutes * 60;
}

fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
console.log(`Successfully generated ${rows.length - 1} log records to ${outputPath}`);
