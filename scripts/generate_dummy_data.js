import fs from 'fs';
import path from 'path';

function generateDummySolarData() {
  const rows = [];
  // Header row matching exact database schema
  const headers = [
    'timestamp', 'v_pv', 'i_pv', 'p_pv', 'wh_pv_daily',
    'v_bat', 'i_bat', 'p_bat', 'scc_eff', 'load_status',
    'uptime_sec', 'esp_temp', 'free_heap', 'wifi_rssi', 'sd_status'
  ];

  rows.push(headers);

  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let uptimeCounter = 172800; // 48 hours uptime
  let whAccumulator = 0.0;

  for (let i = 0; i < 144; i++) {
    const timestamp = new Date(startTime.getTime() + i * 10 * 60 * 1000);
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();

    if (hour === 0 && minute === 0) {
      whAccumulator = 0.0;
    }

    let v_pv, i_pv, p_pv, v_bat, i_bat, p_bat, scc_eff;

    if (hour >= 6 && hour <= 18) {
      const sunFactor = Math.max(0, Math.sin(((hour - 6 + minute / 60) / 12) * Math.PI));
      const noise = 0.94 + Math.random() * 0.12;

      v_pv = (16.5 + 2.5 * sunFactor * noise).toFixed(2);
      i_pv = (4.8 * sunFactor * noise).toFixed(2);
      p_pv = (v_pv * i_pv).toFixed(2);

      v_bat = (12.6 + 1.6 * sunFactor * noise).toFixed(2);
      scc_eff = (92.5 + 5.5 * sunFactor).toFixed(1);
      p_bat = (p_pv * (scc_eff / 100)).toFixed(2);
      i_bat = v_bat > 0 ? (p_bat / v_bat).toFixed(2) : '0.00';
    } else {
      v_pv = (0.2 + Math.random() * 0.1).toFixed(2);
      i_pv = '0.00';
      p_pv = '0.00';

      v_bat = (12.4 - Math.random() * 0.2).toFixed(2);
      i_bat = '-0.35';
      p_bat = (v_bat * i_bat).toFixed(2);
      scc_eff = '0.0';
    }

    whAccumulator += parseFloat(p_pv) / 6;
    uptimeCounter += 600;

    const esp_temp = (32.0 + (parseFloat(p_pv) > 10 ? parseFloat(p_pv) / 8 : 0) + (Math.random() * 2 - 1)).toFixed(1);
    const free_heap = Math.floor(215000 + Math.random() * 12000);
    const wifi_rssi = -62 + Math.floor(Math.random() * 8 - 4);

    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hoursStr = String(timestamp.getHours()).padStart(2, '0');
    const minStr = String(timestamp.getMinutes()).padStart(2, '0');
    const secStr = String(timestamp.getSeconds()).padStart(2, '0');
    const formattedTs = `${year}-${month}-${day} ${hoursStr}:${minStr}:${secStr}`;

    rows.push([
      formattedTs,
      v_pv,
      i_pv,
      p_pv,
      whAccumulator.toFixed(2),
      v_bat,
      i_bat,
      p_bat,
      scc_eff,
      'ON',
      uptimeCounter,
      esp_temp,
      free_heap,
      wifi_rssi,
      'MOUNTED'
    ]);
  }

  // Write CSV
  const csvContent = rows.map(r => r.join(',')).join('\n');
  fs.writeFileSync('dummy_solar_data.csv', csvContent, 'utf8');

  // Write TSV (Pasts cleanly into Google Sheets cell A1)
  const tsvContent = rows.map(r => r.join('\t')).join('\n');
  fs.writeFileSync('dummy_solar_data.tsv', tsvContent, 'utf8');

  console.log(`Generated ${rows.length - 1} dummy log entries in dummy_solar_data.csv and dummy_solar_data.tsv`);
}

generateDummySolarData();
