import Papa from 'papaparse';

// User's exact Spreadsheet ID
const SPREADSHEET_IDS = [
  '1tNRnoSC2yC3ejFei0OsqDqz2w4rHcmbnRGLwnv9aRXc', // Primary user spreadsheet ID
  '1ki4BkbqIpI9ZczU3cTeRwgMfEW_ZF_L95ZrZe-W3bfg'
];

/**
 * Format a Date object to WIB string (YYYY-MM-DD HH:mm:ss)
 */
export function formatToWIB(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '-';
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(dateObj); // returns 'YYYY-MM-DD HH:mm:ss'
}

/**
 * Format a Date object to UTC string (YYYY-MM-DD HH:mm:ss)
 */
export function formatToUTC(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '-';
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(dateObj);
}

/**
 * Format energy value: if >= 1000 Wh, convert to kWh (e.g. 6680.79 Wh -> { value: "6.68", unit: "kWh" })
 * Otherwise keep as Wh (e.g. 841.50 Wh -> { value: "841.50", unit: "Wh" })
 */
export function formatEnergy(whValue) {
  const val = Number(whValue || 0);
  if (Math.abs(val) >= 1000) {
    const kwh = val / 1000;
    return {
      value: kwh.toFixed(2),
      unit: 'kWh',
      formatted: `${kwh.toFixed(2)} kWh`,
      rawKwh: kwh,
      isKwh: true,
    };
  }
  return {
    value: val.toFixed(2),
    unit: 'Wh',
    formatted: `${val.toFixed(2)} Wh`,
    rawWh: val,
    isKwh: false,
  };
}

/**
 * Generate monthly sheet options matching user's exact format: Log_YYYY_MM
 */
export function getAvailableSheetOptions() {
  const options = [
    { label: 'Sheet Otomatis (Bulan Ini)', value: 'AUTO' }
  ];

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const projectMonths = [
    { year: 2026, month: 9 },
    { year: 2026, month: 10 },
    { year: 2026, month: 11 },
    { year: 2026, month: 12 },
    { year: 2027, month: 1 },
    { year: 2027, month: 2 },
    { year: 2027, month: 3 },
    { year: 2027, month: 4 },
    { year: 2027, month: 5 },
    { year: 2027, month: 6 },
    { year: 2027, month: 7 },
    { year: 2027, month: 8 },
    { year: 2027, month: 9 },
  ];

  projectMonths.forEach(({ year, month }) => {
    const mm = String(month).padStart(2, '0');
    const value = `Log_${year}_${mm}`;
    const label = `${value} (${monthNames[month - 1]} ${year})`;
    options.push({ label, value });
  });

  return options;
}

/**
 * Fetch solar logs from Google Sheets matching exact Log_YYYY_MM tab format
 */
export async function fetchSolarLogs(selectedSheet = 'AUTO') {
  let lastError = null;

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const currentLogSheet = `Log_${yyyy}_${mm}`;

  let sheetCandidates = [];
  if (selectedSheet && selectedSheet !== 'AUTO') {
    sheetCandidates = [selectedSheet];
  } else {
    sheetCandidates = [
      currentLogSheet,
      'Log_2026_09',
      'Log_2026_10',
      'dummy_solar_data',
      'Sheet1'
    ];
  }

  for (const spreadsheetId of SPREADSHEET_IDS) {
    for (const sheetName of sheetCandidates) {
      const urls = [
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (!response.ok) continue;

          const csvText = await response.text();
          if (!csvText || csvText.trim().startsWith('<!DOCTYPE') || csvText.includes('<html')) {
            lastError = new Error("Spreadsheet is private. Please set sharing to 'Anyone with the link can view'.");
            continue;
          }

          const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          });

          if (parsed.data && parsed.data.length > 0) {
            const logs = parseAndCleanRows(parsed.data);
            if (logs.length > 0) {
              return {
                logs,
                activeSheetName: sheetName,
                isFallback: false,
                errorMessage: null,
              };
            }
          }
        } catch (err) {
          lastError = err;
        }
      }
    }
  }

  console.warn("Google Sheets fetch failed, activating fallback mock data:", lastError?.message);
  const mockLogs = generateMockLogs();
  return {
    logs: mockLogs,
    activeSheetName: selectedSheet === 'AUTO' ? currentLogSheet : selectedSheet,
    isFallback: true,
    errorMessage: lastError?.message || "Google Sheets access restricted or empty.",
  };
}

/**
 * Parse any raw timestamp string from database as UTC Date object.
 * Handles formats like:
 * - "2026-09-09 1:30"
 * - "2026-09-09 1:30:18"
 * - "2026-09-09T01:30:18Z"
 * - "2026/09/09 01:30:00"
 */
export function parseUtcTimestamp(str) {
  if (!str) return new Date(NaN);

  const cleanStr = String(str).trim();

  // If ISO standard with timezone marker
  if (cleanStr.endsWith('Z') || cleanStr.includes('+')) {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;
  }

  // Split date and time: e.g. "2026-09-09 1:30" or "2026-09-09 01:30:18"
  const parts = cleanStr.split(/[\sT]+/);
  if (parts.length >= 1) {
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';

    const dateSegments = datePart.split(/[-/]/).map(n => parseInt(n, 10));
    const timeSegments = timePart.split(':').map(n => parseInt(n, 10));

    if (dateSegments.length === 3 && dateSegments.every(n => !isNaN(n))) {
      let year, month, day;
      if (dateSegments[0] > 1000) {
        // YYYY-MM-DD
        [year, month, day] = dateSegments;
      } else {
        // DD-MM-YYYY or MM-DD-YYYY
        [day, month, year] = dateSegments;
      }

      const hour = timeSegments[0] || 0;
      const minute = timeSegments[1] || 0;
      const second = timeSegments[2] || 0;

      const utcTimeMs = Date.UTC(year, month - 1, day, hour, minute, second);
      const utcDate = new Date(utcTimeMs);
      if (!isNaN(utcDate.getTime())) return utcDate;
    }
  }

  // Fallback to standard Date constructor with ISO 'Z' appended
  const isoUtc = cleanStr.replace(' ', 'T') + 'Z';
  let fallbackDate = new Date(isoUtc);
  if (isNaN(fallbackDate.getTime())) {
    fallbackDate = new Date(cleanStr);
  }
  return fallbackDate;
}

/**
 * Parse raw rows (treating database timestamps as UTC) and convert to WIB
 */
function parseAndCleanRows(rawRows) {
  const validLogs = [];

  rawRows.forEach((row) => {
    if (!row || typeof row !== 'object') return;

    const cleanRow = {};
    Object.keys(row).forEach(k => {
      if (k) cleanRow[k.trim().toLowerCase()] = row[k];
    });

    const rawTimestampStr = String(cleanRow.timestamp || cleanRow['time stamp'] || '').trim();
    if (!rawTimestampStr || rawTimestampStr === 'null' || rawTimestampStr === 'undefined') return;

    // Parse strictly as UTC date
    const dateObj = parseUtcTimestamp(rawTimestampStr);

    const isValidDate = !isNaN(dateObj.getTime());
    const wibTimestamp = isValidDate ? formatToWIB(dateObj) : rawTimestampStr;
    const utcTimestamp = isValidDate ? formatToUTC(dateObj) : rawTimestampStr;

    const v_pv = parseFloat(cleanRow.v_pv || 0);
    const i_pv = parseFloat(cleanRow.i_pv || 0);
    const p_pv = parseFloat(cleanRow.p_pv || (v_pv * i_pv));
    const wh_pv_daily = parseFloat(cleanRow.wh_pv_daily || 0);

    const v_bat = parseFloat(cleanRow.v_bat || 0);
    const i_bat = parseFloat(cleanRow.i_bat || 0);
    const p_bat = parseFloat(cleanRow.p_bat || (v_bat * i_bat));

    const scc_eff = parseFloat(cleanRow.scc_eff || 0);
    const uptime_sec = parseInt(cleanRow.uptime_sec || 0, 10);
    const esp_temp = parseFloat(cleanRow.esp_temp || 0);
    const free_heap = parseFloat(cleanRow.free_heap || 0);
    const wifi_rssi = parseInt(cleanRow.wifi_rssi || -90, 10);

    const load_status = String(cleanRow.load_status || 'ON').toUpperCase();
    const sd_status = String(cleanRow.sd_status || 'MOUNTED').toUpperCase();

    validLogs.push({
      timestamp: wibTimestamp,       // Format Display WIB (UTC+7)
      timestampUtc: utcTimestamp,    // Format Display UTC
      rawTimestamp: rawTimestampStr,
      dateObj: isValidDate ? dateObj : new Date(),
      v_pv,
      i_pv,
      p_pv: parseFloat(p_pv.toFixed(2)),
      wh_pv_daily: parseFloat(wh_pv_daily.toFixed(2)),
      v_bat,
      i_bat,
      p_bat: parseFloat(p_bat.toFixed(2)),
      scc_eff: parseFloat(scc_eff.toFixed(1)),
      load_status,
      uptime_sec,
      esp_temp: parseFloat(esp_temp.toFixed(1)),
      free_heap,
      wifi_rssi,
      sd_status,
    });
  });

  return validLogs;
}

/**
 * Generate 24 hours of realistic time-series mock logs in UTC
 */
export function generateMockLogs() {
  const logs = [];
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let uptimeCounter = 172800;
  let whAccumulator = 0.0;

  for (let i = 0; i < 144; i++) {
    const timestampUtc = new Date(startTime.getTime() + i * 10 * 60 * 1000);
    
    // Check hour in WIB timezone for realistic solar generation curve
    const wibFormatted = formatToWIB(timestampUtc);
    const hourWib = parseInt(wibFormatted.substring(11, 13), 10);
    const minWib = parseInt(wibFormatted.substring(14, 16), 10);

    if (hourWib === 0 && minWib === 0) {
      whAccumulator = 0.0;
    }

    let v_pv, i_pv, p_pv, v_bat, i_bat, p_bat, scc_eff;

    if (hourWib >= 6 && hourWib <= 18) {
      const sunFactor = Math.max(0, Math.sin(((hourWib - 6 + minWib / 60) / 12) * Math.PI));
      const noise = 0.92 + Math.random() * 0.15;

      v_pv = parseFloat((16.5 + 2.5 * sunFactor * noise).toFixed(2));
      i_pv = parseFloat((4.8 * sunFactor * noise).toFixed(2));
      p_pv = parseFloat((v_pv * i_pv).toFixed(2));

      v_bat = parseFloat((12.6 + 1.6 * sunFactor * noise).toFixed(2));
      scc_eff = parseFloat((92.5 + 5.5 * sunFactor).toFixed(1));
      p_bat = parseFloat((p_pv * (scc_eff / 100)).toFixed(2));
      i_bat = v_bat > 0 ? parseFloat((p_bat / v_bat).toFixed(2)) : 0;
    } else {
      v_pv = parseFloat((0.2 + Math.random() * 0.1).toFixed(2));
      i_pv = 0.0;
      p_pv = 0.0;

      v_bat = parseFloat((12.4 - Math.random() * 0.2).toFixed(2));
      i_bat = -0.35;
      p_bat = parseFloat((v_bat * i_bat).toFixed(2));
      scc_eff = 0.0;
    }

    whAccumulator += p_pv / 6;
    uptimeCounter += 600;

    const esp_temp = parseFloat((32.0 + (p_pv > 10 ? p_pv / 8 : 0) + (Math.random() * 2 - 1)).toFixed(1));
    const free_heap = Math.floor(215000 + Math.random() * 12000);
    const wifi_rssi = -62 + Math.floor(Math.random() * 8 - 4);

    logs.push({
      timestamp: wibFormatted,
      timestampUtc: formatToUTC(timestampUtc),
      rawTimestamp: formatToUTC(timestampUtc),
      dateObj: timestampUtc,
      v_pv,
      i_pv,
      p_pv,
      wh_pv_daily: parseFloat(whAccumulator.toFixed(2)),
      v_bat,
      i_bat,
      p_bat,
      scc_eff,
      load_status: 'ON',
      uptime_sec: uptimeCounter,
      esp_temp,
      free_heap,
      wifi_rssi,
      sd_status: 'MOUNTED',
    });
  }

  return logs;
}

/**
 * Format uptime seconds into: X Hari, Y Jam, Z Mnt
 */
export function formatUptime(uptimeSec) {
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  return `${days} Hari, ${hours} Jam, ${minutes} Mnt`;
}

/**
 * Calculate System Diagnostics
 */
export function calculateDiagnostics(latestRecord) {
  if (!latestRecord) {
    return {
      isOnline: false,
      statusLabel: 'OFFLINE',
      uptimeFormatted: '0 Hari, 0 Jam, 0 Mnt',
      espTemp: 0,
      tempStatus: 'NORMAL',
      freeHeapKb: 0,
      wifiRssi: -90,
      wifiQuality: 'Weak',
      sdStatus: 'ERROR',
      lastSeenWib: '-',
      lastSeenUtc: '-',
    };
  }

  const now = new Date();
  const diffMinutes = Math.abs((now.getTime() - latestRecord.dateObj.getTime()) / (1000 * 60));
  const isOnline = diffMinutes <= 30;

  const espTemp = latestRecord.esp_temp || 0;
  const tempStatus = espTemp > 50 ? 'HIGH' : espTemp > 40 ? 'WARM' : 'NORMAL';

  const rssi = latestRecord.wifi_rssi || -90;
  let wifiQuality = 'Weak';
  if (rssi >= -60) wifiQuality = 'Excellent';
  else if (rssi >= -75) wifiQuality = 'Good';
  else if (rssi >= -85) wifiQuality = 'Fair';

  return {
    isOnline,
    statusLabel: isOnline ? 'ONLINE' : 'OFFLINE',
    uptimeFormatted: formatUptime(latestRecord.uptime_sec || 0),
    espTemp,
    tempStatus,
    freeHeapKb: (latestRecord.free_heap / 1024).toFixed(1),
    wifiRssi: rssi,
    wifiQuality,
    sdStatus: latestRecord.sd_status || 'MOUNTED',
    lastSeenWib: latestRecord.timestamp || '-',
    lastSeenUtc: latestRecord.timestampUtc || '-',
  };
}

/**
 * Calculate Energy Accumulation per period in WIB Timezone
 */
export function calculateEnergyPeriods(logs) {
  if (!logs || logs.length === 0) {
    return {
      harianWh: 0,
      mingguanWh: 0,
      bulananWh: 0,
      dailyChart: { labels: [], values: [] },
      weeklyChart: { labels: [], values: [] },
      monthlyChart: { labels: [], values: [] },
    };
  }

  const sorted = [...logs].sort((a, b) => a.dateObj - b.dateObj);
  const latestDateObj = sorted[sorted.length - 1].dateObj;
  const latestWibDateStr = formatToWIB(latestDateObj).substring(0, 10);

  // Filter logs for today WIB (since 00:00 WIB)
  const todayLogs = sorted.filter(item => {
    const wibStr = formatToWIB(item.dateObj).substring(0, 10);
    return wibStr === latestWibDateStr;
  });

  const harianWh = todayLogs.length > 0
    ? Math.max(...todayLogs.map(item => Number(item.wh_pv_daily || 0)))
    : Number(sorted[sorted.length - 1].wh_pv_daily || 0);

  const dailyMap = {};
  sorted.forEach(item => {
    const dateStr = formatToWIB(item.dateObj).substring(0, 10);
    const val = Number(item.wh_pv_daily || 0);
    if (!dailyMap[dateStr] || val > dailyMap[dateStr]) {
      dailyMap[dateStr] = val;
    }
  });

  const weeklyMap = {};
  Object.keys(dailyMap).forEach(dateStr => {
    const date = new Date(dateStr);
    const weekNum = getWeekNumber(date);
    const key = `Minggu ${weekNum[1]} (${date.getFullYear()})`;
    weeklyMap[key] = (weeklyMap[key] || 0) + dailyMap[dateStr];
  });

  const monthlyMap = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  Object.keys(dailyMap).forEach(dateStr => {
    const date = new Date(dateStr);
    const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + dailyMap[dateStr];
  });

  const mingguanWh = Object.values(weeklyMap).length > 0
    ? Object.values(weeklyMap)[Object.values(weeklyMap).length - 1]
    : harianWh;

  const bulananWh = Object.values(monthlyMap).length > 0
    ? Object.values(monthlyMap)[Object.values(monthlyMap).length - 1]
    : harianWh;

  return {
    harianWh: parseFloat(harianWh.toFixed(2)),
    mingguanWh: parseFloat(mingguanWh.toFixed(2)),
    bulananWh: parseFloat(bulananWh.toFixed(2)),
    dailyChart: { labels: Object.keys(dailyMap), values: Object.values(dailyMap).map(v => parseFloat(v.toFixed(2))) },
    weeklyChart: { labels: Object.keys(weeklyMap), values: Object.values(weeklyMap).map(v => parseFloat(v.toFixed(2))) },
    monthlyChart: { labels: Object.keys(monthlyMap), values: Object.values(monthlyMap).map(v => parseFloat(v.toFixed(2))) },
  };
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
}

/**
 * Filter logs based on period selection ('harian' | 'mingguan' | 'bulanan')
 */
export function filterLogsByPeriod(logs, period = 'harian') {
  if (!logs || logs.length === 0) return [];

  const sorted = [...logs].sort((a, b) => a.dateObj - b.dateObj);
  const latestRecord = sorted[sorted.length - 1];
  const latestDate = latestRecord.dateObj;

  if (period === 'harian') {
    // Show last 24 hours of data
    const cutoff24h = new Date(latestDate.getTime() - 24 * 60 * 60 * 1000);
    return sorted.filter(item => item.dateObj >= cutoff24h);
  }

  if (period === 'mingguan') {
    // Show last 7 days of data
    const cutoff7d = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const filtered = sorted.filter(item => item.dateObj >= cutoff7d);
    if (filtered.length > 150) {
      const step = Math.ceil(filtered.length / 150);
      return filtered.filter((_, idx) => idx % step === 0 || idx === filtered.length - 1);
    }
    return filtered;
  }

  if (period === 'bulanan') {
    // Show full month timeline
    if (sorted.length > 250) {
      const step = Math.ceil(sorted.length / 250);
      return sorted.filter((_, idx) => idx % step === 0 || idx === sorted.length - 1);
    }
    return sorted;
  }

  return sorted;
}

