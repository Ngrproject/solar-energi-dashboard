import Papa from 'papaparse';
import { parseUtcTimestamp, formatToWIB, formatToUTC } from './solarService.js';

/**
 * Format a Date object to YYYY-MM-DD HH:00 key
 */
function toHourKey(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

/**
 * Parse ERA5 Satellite CSV data exported from Google Earth Engine or ECMWF CDS.
 * Expected columns:
 * - system:index (e.g. 20261001T01)
 * - radiasi_J_m2 (or ssrd, surface_solar_radiation_downwards, radiation)
 * - waktu (e.g. 2026-10-01 01:00:00)
 *
 * @param {string} csvText - Raw CSV file string
 * @param {object} options
 * @param {boolean} options.deaccumulate - If true, converts accumulated J/m² to hourly flux W/m² (default true)
 * @param {number} options.maxPhysicalFlux - Clamps unphysical boundary values (default 1400 W/m²)
 * @returns {Array} Array of parsed ERA5 records
 */
export function parseEra5Csv(csvText, options = {}) {
  const { deaccumulate = true, maxPhysicalFlux = 1400 } = options;

  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) return [];

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (!parsed.data || parsed.data.length === 0) return [];

  const rawRows = parsed.data;
  const records = [];

  // Check columns of the first row
  const firstRow = rawRows[0] || {};
  const lowerKeyMap = {};
  Object.keys(firstRow).forEach(k => {
    lowerKeyMap[k.trim().toLowerCase()] = k;
  });

  // Check if new format (e.g. ERA5Land_Radiasi_Cilacap_... format with explicit waktu_WIB or waktu_UTC)
  const keyWaktuWib = lowerKeyMap['waktu_wib'];
  const keyWaktuUtc = lowerKeyMap['waktu_utc'];
  const keyIrradiansi = Object.keys(firstRow).find(k => k.toLowerCase().includes('irradiansi'));
  const keyJm2PerJam = Object.keys(firstRow).find(k => k.toLowerCase().includes('per_jam') || k.toLowerCase().includes('radiasi_j_m2'));

  if (keyWaktuWib && (keyIrradiansi || keyJm2PerJam)) {
    // FORMAT BARU (ERA5-Land preprocessed per jam):
    // Kolom: waktu_UTC, waktu_WIB, latitude, longitude, radiasi_J_m2_per_jam, irradiansi_rata2_W_m2, energi_radiasi_kWh_m2_per_jam
    rawRows.forEach((row, idx) => {
      if (!row || typeof row !== 'object') return;

      const rawWib = row[keyWaktuWib];
      if (!rawWib) return;

      let w_m2 = 0;
      if (keyIrradiansi && row[keyIrradiansi] !== undefined && row[keyIrradiansi] !== null) {
        w_m2 = Math.max(0, parseFloat(row[keyIrradiansi]) || 0);
      } else if (keyJm2PerJam && row[keyJm2PerJam] !== undefined && row[keyJm2PerJam] !== null) {
        w_m2 = Math.max(0, (parseFloat(row[keyJm2PerJam]) || 0) / 3600);
      }

      let rawJm2 = 0;
      if (keyJm2PerJam && row[keyJm2PerJam] !== undefined && row[keyJm2PerJam] !== null) {
        rawJm2 = Math.max(0, parseFloat(row[keyJm2PerJam]) || 0);
      } else {
        rawJm2 = w_m2 * 3600;
      }

      if (w_m2 > maxPhysicalFlux) {
        w_m2 = 0;
      }

      const wibStr = String(rawWib).trim();
      const wibDate = new Date(wibStr.replace(' ', 'T') + '+07:00');
      const wibDateStr = wibStr.substring(0, 10);
      const wibHourStr = wibStr.substring(11, 13);
      const wibHour = parseInt(wibHourStr, 10);
      const wibHourKey = `${wibDateStr} ${wibHourStr}:00`;
      const wibTimestamp = `${wibDateStr} ${wibHourStr}:${wibStr.length >= 16 ? wibStr.substring(14, 16) : '00'}:00`;

      let utcDate;
      let utcStr = '';
      if (keyWaktuUtc && row[keyWaktuUtc]) {
        utcStr = String(row[keyWaktuUtc]).trim();
        utcDate = new Date(utcStr.replace(' ', 'T') + 'Z');
      } else {
        utcDate = new Date(wibDate.getTime() - 7 * 3600 * 1000);
        utcStr = utcDate.toISOString().replace('T', ' ').substring(0, 19);
      }

      const utcDateStr = utcStr.substring(0, 10);
      const utcHourStr = utcStr.substring(11, 13);
      const utcHour = parseInt(utcHourStr, 10);
      const utcHourKey = `${utcDateStr} ${utcHourStr}:00`;
      const utcTimestamp = `${utcDateStr} ${utcHourStr}:${utcStr.length >= 16 ? utcStr.substring(14, 16) : '00'}:00`;

      records.push({
        sysIndex: `ROW_${idx}`,
        raw_j_m2: parseFloat(rawJm2.toFixed(1)),
        delta_j_m2: parseFloat(rawJm2.toFixed(1)),
        w_m2: parseFloat(w_m2.toFixed(2)),
        utcDateObj: utcDate,
        wibDateObj: wibDate,
        utcDateStr,
        wibDateStr,
        utcHour,
        wibHour,
        utcHourKey,
        wibHourKey,
        utcTimestamp,
        wibTimestamp,
      });
    });

    return records;
  }

  // Detect column names flexibly for standard / GEE exports
  let radKey = null;
  let timeKey = null;
  let sysIndexKey = null;

  if (rawRows.length > 0) {
    const firstRowKeys = Object.keys(rawRows[0]);
    radKey = firstRowKeys.find(k => {
      const lower = k.trim().toLowerCase();
      return (
        lower.includes('radiasi') ||
        lower.includes('ssrd') ||
        lower.includes('radiation') ||
        lower.includes('j_m2') ||
        lower.includes('solar')
      );
    });
    timeKey = firstRowKeys.find(k => {
      const lower = k.trim().toLowerCase();
      return lower.includes('waktu') || lower.includes('time') || lower.includes('date');
    });
    sysIndexKey = firstRowKeys.find(k => {
      const lower = k.trim().toLowerCase();
      return lower.includes('system:index') || lower.includes('index') || lower.includes('id');
    });
  }

  let prevRaw = null;

  rawRows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;

    const rawRadVal = radKey ? row[radKey] : (row.radiasi_J_m2 ?? row.radiasi ?? row.ssrd);
    const rawTimeVal = timeKey ? row[timeKey] : (row.waktu ?? row.timestamp ?? row.time);
    const sysIndex = sysIndexKey ? String(row[sysIndexKey]) : String(row['system:index'] || idx);

    if (rawRadVal === undefined || rawRadVal === null || !rawTimeVal) return;

    const rawJm2 = parseFloat(rawRadVal);
    if (isNaN(rawJm2)) return;

    // Parse timestamp (ERA5 / GEE exports are in UTC by standard)
    const timeStr = String(rawTimeVal).trim();
    const utcDate = parseUtcTimestamp(timeStr);
    if (isNaN(utcDate.getTime())) return;

    // Determine UTC hour from system:index (e.g. 20261001T01 -> 1) or from parsed UTC Date
    let utcHour = utcDate.getUTCHours();
    const matchT = sysIndex.match(/T(\d{2})/);
    if (matchT) {
      utcHour = parseInt(matchT[1], 10);
    }

    let deltaJm2 = 0;
    let w_m2 = 0;

    if (deaccumulate) {
      // In ERA5-Land Hourly, daily accumulation resets at 01:00 UTC (or when value drops sharply)
      if (utcHour === 1 || prevRaw === null || rawJm2 < prevRaw * 0.5) {
        deltaJm2 = rawJm2;
      } else {
        deltaJm2 = Math.max(0, rawJm2 - prevRaw);
      }
      prevRaw = rawJm2;

      // Solar Irradiance in W/m²: 1 Watt = 1 Joule/second. Over 1 hour = 3600 seconds.
      let flux = deltaJm2 / 3600;

      // Handle unphysical spikes at step 0 (e.g. first row starting at 00:00 UTC with previous day's accumulation)
      if (flux > maxPhysicalFlux) {
        flux = 0; // Outlier or previous day leftover
      }
      w_m2 = flux;
    } else {
      // Direct division mode
      prevRaw = rawJm2;
      w_m2 = Math.min(rawJm2 / 3600, 10000);
      deltaJm2 = rawJm2;
    }

    // WIB Date (UTC+7)
    const wibMs = utcDate.getTime() + 7 * 3600 * 1000;
    const wibDate = new Date(wibMs);

    const utcIso = utcDate.toISOString();
    const utcDateStr = utcIso.substring(0, 10);
    const utcHourStr = String(utcDate.getUTCHours()).padStart(2, '0');
    const utcHourKey = `${utcDateStr} ${utcHourStr}:00`;
    const utcTimestamp = `${utcDateStr} ${utcHourStr}:${String(utcDate.getUTCMinutes()).padStart(2, '0')}:00`;

    const wibIso = wibDate.toISOString();
    const wibDateStr = wibIso.substring(0, 10);
    const wibHourStr = String(wibDate.getUTCHours()).padStart(2, '0');
    const wibHourKey = `${wibDateStr} ${wibHourStr}:00`;
    const wibTimestamp = `${wibDateStr} ${wibHourStr}:${String(wibDate.getUTCMinutes()).padStart(2, '0')}:00`;

    records.push({
      sysIndex,
      raw_j_m2: rawJm2,
      delta_j_m2: parseFloat(deltaJm2.toFixed(1)),
      w_m2: parseFloat(w_m2.toFixed(2)),
      utcDateObj: utcDate,
      wibDateObj: wibDate,
      utcDateStr,
      wibDateStr,
      utcHour: utcDate.getUTCHours(),
      wibHour: wibDate.getUTCHours(),
      utcHourKey,
      wibHourKey,
      utcTimestamp,
      wibTimestamp,
    });
  });

  return records;
}

/**
 * Resample & align sensor logs with ERA5 satellite hourly records.
 *
 * @param {Array} sensorLogs - Processed logs from solarService (or user sensor CSV)
 * @param {Array} era5Records - Parsed ERA5 records from parseEra5Csv
 * @param {object} options
 * @param {'WIB' | 'UTC'} options.timeZone - Alignment timezone (default 'WIB')
 * @param {boolean} options.daylightOnly - Filter only daylight hours (06:00 - 18:00 WIB)
 * @param {string} options.dateFilter - Specific date 'YYYY-MM-DD' or 'ALL'
 * @returns {Array} Array of matched and aligned hourly comparison records
 */
export function alignHourlyData(sensorLogs = [], era5Records = [], options = {}) {
  const {
    timeZone = 'WIB',
    daylightOnly = false,
    dateFilter = 'ALL',
  } = options;

  if (!sensorLogs.length || !era5Records.length) return [];

  // Group sensor logs by corresponding hour key
  const sensorHourly = new Map();
  const sensorDateSet = new Set();

  sensorLogs.forEach((log) => {
    let hourKey = '';
    let hourNum = 0;
    let dateStr = '';

    if (timeZone === 'WIB') {
      // Use WIB date/hour
      if (log.wibDateStr && log.wibTimeStr) {
        const hh = log.wibTimeStr.substring(0, 2);
        hourKey = `${log.wibDateStr} ${hh}:00`;
        hourNum = parseInt(hh, 10);
        dateStr = log.wibDateStr;
      } else if (log.timestamp && log.timestamp.length >= 13) {
        hourKey = `${log.timestamp.substring(0, 13)}:00`;
        hourNum = parseInt(log.timestamp.substring(11, 13), 10);
        dateStr = log.timestamp.substring(0, 10);
      }
    } else {
      // Use UTC date/hour
      if (log.timestampUtc && log.timestampUtc.length >= 13) {
        hourKey = `${log.timestampUtc.substring(0, 13)}:00`;
        hourNum = parseInt(log.timestampUtc.substring(11, 13), 10);
        dateStr = log.timestampUtc.substring(0, 10);
      } else if (log.dateObj && !isNaN(log.dateObj.getTime())) {
        const utcIso = log.dateObj.toISOString();
        hourKey = `${utcIso.substring(0, 10)} ${utcIso.substring(11, 13)}:00`;
        hourNum = parseInt(utcIso.substring(11, 13), 10);
        dateStr = utcIso.substring(0, 10);
      }
    }

    if (!hourKey) return;
    if (dateStr) sensorDateSet.add(dateStr);

    if (!sensorHourly.has(hourKey)) {
      sensorHourly.set(hourKey, {
        p_pv: [],
        p_bat: [],
        v_pv: [],
        v_bat: [],
        lux: [],
        dateStr,
        hourNum,
      });
    }

    const bucket = sensorHourly.get(hourKey);
    if (log.p_pv !== undefined) bucket.p_pv.push(log.p_pv);
    if (log.p_bat !== undefined) bucket.p_bat.push(log.p_bat);
    if (log.v_pv !== undefined) bucket.v_pv.push(log.v_pv);
    if (log.v_bat !== undefined) bucket.v_bat.push(log.v_bat);
    if (log.lux_val !== undefined) bucket.lux.push(log.lux_val);
  });

  // Now iterate through ERA5 records and find exact hourly matches
  const aligned = [];

  era5Records.forEach((era) => {
    const matchKey = timeZone === 'WIB' ? era.wibHourKey : era.utcHourKey;
    const hourNum = timeZone === 'WIB' ? era.wibHour : era.utcHour;
    const dateStr = timeZone === 'WIB' ? era.wibDateStr : era.utcDateStr;

    // Apply date filter
    if (dateFilter && dateFilter !== 'ALL' && dateStr !== dateFilter) {
      return;
    }

    // Apply daylight filter
    if (daylightOnly) {
      if (timeZone === 'WIB') {
        if (hourNum < 6 || hourNum > 18) return;
      } else {
        // UTC: 23:00 to 11:00 UTC corresponds to 06:00 to 18:00 WIB
        if (hourNum > 11 && hourNum < 23) return;
      }
    }

    // Check if sensor has data for this exact hour
    const sensorBucket = sensorHourly.get(matchKey);
    let wattPv = 0;
    let wattBat = 0;
    let vPv = 0;
    let vBat = 0;
    let lux = 0;
    let maxWattPv = 0;
    let maxLux = 0;
    let sampleCount = 0;

    if (sensorBucket && sensorBucket.p_pv.length > 0) {
      const avg = (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
      const max = (arr) => (arr.length > 0 ? Math.max(...arr) : 0);

      wattPv = avg(sensorBucket.p_pv);
      wattBat = avg(sensorBucket.p_bat);
      vPv = avg(sensorBucket.v_pv);
      vBat = avg(sensorBucket.v_bat);
      lux = avg(sensorBucket.lux);
      maxWattPv = max(sensorBucket.p_pv);
      maxLux = max(sensorBucket.lux);
      sampleCount = sensorBucket.p_pv.length;
    } else {
      // In daylight mode, skip hours without sensor recordings
      if (daylightOnly) {
        return;
      }

      // In 24h mode: if this date is within the sensor recording period, include night hours
      // At night (solar irradiance = 0), solar generation is physically 0
      if (!sensorDateSet.has(dateStr)) {
        return;
      }

      wattPv = 0;
      wattBat = 0;
      vPv = 0;
      vBat = 0;
      lux = 0;
      maxWattPv = 0;
      maxLux = 0;
      sampleCount = 0;
    }

    aligned.push({
      timeKey: matchKey,
      timeZone,
      dateStr,
      hourNum,
      displayTime: timeZone === 'WIB' ? era.wibTimestamp.substring(0, 16) : era.utcTimestamp.substring(0, 16),
      displayHour: `${String(hourNum).padStart(2, '0')}:00`,
      era5_w_m2: era.w_m2,
      era5_j_m2: era.raw_j_m2,
      era5_delta_j_m2: era.delta_j_m2,
      watt_pv: parseFloat(wattPv.toFixed(2)),
      watt_bat: parseFloat(wattBat.toFixed(2)),
      v_pv: parseFloat(vPv.toFixed(2)),
      v_bat: parseFloat(vBat.toFixed(2)),
      lux: parseFloat(lux.toFixed(1)),
      max_watt_pv: parseFloat(maxWattPv.toFixed(2)),
      max_lux: parseFloat(maxLux.toFixed(1)),
      sample_count: sampleCount,
    });
  });

  // Calculate normalized percentages (0 - 100%) for visual shape alignment
  if (aligned.length > 0) {
    const maxEra5 = Math.max(...aligned.map((d) => d.era5_w_m2), 1);
    const maxPv = Math.max(...aligned.map((d) => d.watt_pv), 1);
    const maxBat = Math.max(...aligned.map((d) => d.watt_bat), 1);
    const maxLux = Math.max(...aligned.map((d) => d.lux), 1);

    aligned.forEach((item) => {
      item.norm_era5 = parseFloat(((item.era5_w_m2 / maxEra5) * 100).toFixed(1));
      item.norm_pv = parseFloat(((item.watt_pv / maxPv) * 100).toFixed(1));
      item.norm_bat = parseFloat(((item.watt_bat / maxBat) * 100).toFixed(1));
      item.norm_lux = parseFloat(((item.lux / maxLux) * 100).toFixed(1));
    });
  }

  return aligned;
}

/**
 * Calculate Pearson Correlation Coefficient (r) between two arrays
 */
export function calculatePearsonR(xArr, yArr) {
  if (!xArr || !yArr || xArr.length < 2 || xArr.length !== yArr.length) return 0;
  const n = xArr.length;
  const meanX = xArr.reduce((a, b) => a + b, 0) / n;
  const meanY = yArr.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - meanX;
    const dy = yArr[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

/**
 * Calculate simple linear regression line y = mx + c
 */
export function calculateLinearRegression(xArr, yArr) {
  if (!xArr || !yArr || xArr.length < 2) return { m: 0, c: 0 };
  const n = xArr.length;
  const meanX = xArr.reduce((a, b) => a + b, 0) / n;
  const meanY = yArr.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xArr[i] - meanX) * (yArr[i] - meanY);
    den += (xArr[i] - meanX) * (xArr[i] - meanX);
  }

  const m = den !== 0 ? num / den : 0;
  const c = meanY - m * meanX;
  return { m, c };
}

/**
 * Qualitative label for Pearson correlation r value
 */
export function getCorrelationStrength(r) {
  const absR = Math.abs(r);
  if (absR >= 0.85) return { label: 'Sangat Kuat', color: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (absR >= 0.70) return { label: 'Kuat', color: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (absR >= 0.50) return { label: 'Sedang', color: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (absR >= 0.30) return { label: 'Rendah', color: 'text-orange-600', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' };
  return { label: 'Sangat Lemah / Tidak Berkorelasi', color: 'text-slate-500', badgeBg: 'bg-slate-50 text-slate-600 border-slate-200' };
}

/**
 * Comprehensive statistical correlation report
 */
export function calculateCorrelationStats(alignedData = []) {
  if (!alignedData || alignedData.length < 2) {
    return {
      count: 0,
      r_pv: 0,
      r2_pv: 0,
      r_bat: 0,
      r2_bat: 0,
      r_lux: 0,
      r2_lux: 0,
      r_lux_pv: 0,
      reg_pv: { m: 0, c: 0 },
      reg_bat: { m: 0, c: 0 },
      reg_lux: { m: 0, c: 0 },
      peak_era5: 0,
      peak_pv: 0,
      peak_bat: 0,
      peak_lux: 0,
      mean_era5: 0,
      mean_pv: 0,
      mean_bat: 0,
      mean_lux: 0,
    };
  }

  const eraVals = alignedData.map((d) => d.era5_w_m2);
  const pvVals = alignedData.map((d) => d.watt_pv);
  const batVals = alignedData.map((d) => d.watt_bat);
  const luxVals = alignedData.map((d) => d.lux);

  const r_pv = calculatePearsonR(eraVals, pvVals);
  const r_bat = calculatePearsonR(eraVals, batVals);
  const r_lux = calculatePearsonR(eraVals, luxVals);
  const r_lux_pv = calculatePearsonR(luxVals, pvVals);

  const reg_pv = calculateLinearRegression(eraVals, pvVals);
  const reg_bat = calculateLinearRegression(eraVals, batVals);
  const reg_lux = calculateLinearRegression(eraVals, luxVals);

  const count = alignedData.length;
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / nOr1(arr.length);
  const nOr1 = (n) => (n > 0 ? n : 1);

  return {
    count,
    r_pv: parseFloat(r_pv.toFixed(4)),
    r2_pv: parseFloat((r_pv * r_pv).toFixed(4)),
    r_bat: parseFloat(r_bat.toFixed(4)),
    r2_bat: parseFloat((r_bat * r_bat).toFixed(4)),
    r_lux: parseFloat(r_lux.toFixed(4)),
    r2_lux: parseFloat((r_lux * r_lux).toFixed(4)),
    r_lux_pv: parseFloat(r_lux_pv.toFixed(4)),
    reg_pv,
    reg_bat,
    reg_lux,
    peak_era5: Math.max(...eraVals, 0),
    peak_pv: Math.max(...pvVals, 0),
    peak_bat: Math.max(...batVals, 0),
    peak_lux: Math.max(...luxVals, 0),
    mean_era5: parseFloat(avg(eraVals).toFixed(2)),
    mean_pv: parseFloat(avg(pvVals).toFixed(2)),
    mean_bat: parseFloat(avg(batVals).toFixed(2)),
    mean_lux: parseFloat(avg(luxVals).toFixed(1)),
  };
}
