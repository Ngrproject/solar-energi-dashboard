import * as XLSX from 'xlsx';

/**
 * Exports solar log data to a CSV file identical to ESP32 SD Card format.
 * @param {Array} logs - Array of solar log entries
 * @param {string} dateFrom - Start date filter (YYYY-MM-DD)
 * @param {string} dateTo - End date filter (YYYY-MM-DD)
 * @param {string} timeZoneMode - Timezone format: 'WIB' or 'UTC' (default 'WIB')
 */
export function exportToCsv(logs, dateFrom, dateTo, timeZoneMode = 'WIB') {
  if (!logs || logs.length === 0) {
    alert("Tidak ada data untuk di-export.");
    return;
  }

  // Filter logs by date range if provided
  let filtered = [...logs];
  if (dateFrom) {
    filtered = filtered.filter(item => {
      const dateStr = item.dateObj ? item.dateObj.toISOString().substring(0, 10) : item.timestamp.substring(0, 10);
      return dateStr >= dateFrom;
    });
  }
  if (dateTo) {
    filtered = filtered.filter(item => {
      const dateStr = item.dateObj ? item.dateObj.toISOString().substring(0, 10) : item.timestamp.substring(0, 10);
      return dateStr <= dateTo;
    });
  }

  // Sort chronologically (oldest to newest)
  filtered.sort((a, b) => a.dateObj - b.dateObj);

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
    'PV_NORMALIZED',
    'DUMP_LOAD_PWM',
    'UPTIME_SEC',
    'ESP_TEMP',
    'FREE_HEAP',
    'WIFI_RSSI',
    'SD_STATUS'
  ];

  const csvRows = [];
  csvRows.push(headers.join(','));

  const isUtc = String(timeZoneMode).toUpperCase() === 'UTC';

  filtered.forEach(row => {
    let pwmVal = 0;
    if (typeof row.dump_load_pwm === 'number') {
      pwmVal = row.dump_load_pwm;
    } else {
      const match = String(row.load_status || '').match(/(\d+)/);
      if (match) pwmVal = parseInt(match[1], 10);
    }

    const timestampVal = isUtc
      ? (row.timestampUtc || row.rawTimestamp || row.timestamp)
      : (row.timestamp || row.timestampUtc);

    const line = [
      timestampVal || '',
      Number(row.v_pv || 0).toFixed(2),
      Number(row.i_pv || 0).toFixed(2),
      Number(row.p_pv || 0).toFixed(2),
      Number(row.wh_pv_daily || 0).toFixed(2),
      Math.round(Number(row.lux_val || 0)),
      Number(row.sunshine_hours_daily || 0).toFixed(2),
      Number(row.v_bat || 0).toFixed(2),
      Number(row.i_bat || 0).toFixed(2),
      Number(row.p_bat || 0).toFixed(2),
      Number(row.pv_normalized ?? row.scc_eff ?? 0).toFixed(1),
      pwmVal,
      parseInt(row.uptime_sec || 0, 10),
      Number(row.esp_temp || 0).toFixed(1),
      parseInt(row.free_heap || 0, 10),
      parseInt(row.wifi_rssi ?? -65, 10),
      row.sd_status || 'OK'
    ];
    csvRows.push(line.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const tzSuffix = isUtc ? 'UTC' : 'WIB';
  const dateSuffix = `${dateFrom || 'all'}_to_${dateTo || 'now'}`;
  const fileName = `solar_log_${tzSuffix}_${dateSuffix}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports solar log data to a native Excel (.xlsx) spreadsheet file.
 * @param {Array} logs - Array of solar log entries
 * @param {string} dateFrom - Start date filter (YYYY-MM-DD)
 * @param {string} dateTo - End date filter (YYYY-MM-DD)
 * @param {string} timeZoneMode - Timezone format: 'WIB' or 'UTC' (default 'WIB')
 */
export function exportToXlsx(logs, dateFrom, dateTo, timeZoneMode = 'WIB') {
  if (!logs || logs.length === 0) {
    alert("Tidak ada data untuk di-export.");
    return;
  }

  let filtered = [...logs];
  if (dateFrom) {
    filtered = filtered.filter(item => {
      const dateStr = item.dateObj ? item.dateObj.toISOString().substring(0, 10) : item.timestamp.substring(0, 10);
      return dateStr >= dateFrom;
    });
  }
  if (dateTo) {
    filtered = filtered.filter(item => {
      const dateStr = item.dateObj ? item.dateObj.toISOString().substring(0, 10) : item.timestamp.substring(0, 10);
      return dateStr <= dateTo;
    });
  }

  filtered.sort((a, b) => a.dateObj - b.dateObj);

  const isUtc = String(timeZoneMode).toUpperCase() === 'UTC';

  // Format array of objects for XLSX worksheet conversion
  const sheetData = filtered.map(row => {
    let pwmVal = 0;
    if (typeof row.dump_load_pwm === 'number') {
      pwmVal = row.dump_load_pwm;
    } else {
      const match = String(row.load_status || '').match(/(\d+)/);
      if (match) pwmVal = parseInt(match[1], 10);
    }

    const timestampVal = isUtc
      ? (row.timestampUtc || row.rawTimestamp || row.timestamp)
      : (row.timestamp || row.timestampUtc);

    return {
      'TIMESTAMP': timestampVal || '',
      'V_PV (V)': Number(Number(row.v_pv || 0).toFixed(2)),
      'I_PV (A)': Number(Number(row.i_pv || 0).toFixed(2)),
      'P_PV (W)': Number(Number(row.p_pv || 0).toFixed(2)),
      'WH_DAILY': Number(Number(row.wh_pv_daily || 0).toFixed(2)),
      'LUX (lx)': Math.round(Number(row.lux_val || 0)),
      'SUNSHINE_JAM': Number(Number(row.sunshine_hours_daily || 0).toFixed(2)),
      'V_BAT (V)': Number(Number(row.v_bat || 0).toFixed(2)),
      'I_BAT (A)': Number(Number(row.i_bat || 0).toFixed(2)),
      'P_BAT (W)': Number(Number(row.p_bat || 0).toFixed(2)),
      'PV_NORMALIZED': Number(Number(row.pv_normalized ?? row.scc_eff ?? 0).toFixed(1)),
      'DUMP_LOAD_PWM': pwmVal,
      'UPTIME_SEC': parseInt(row.uptime_sec || 0, 10),
      'ESP_TEMP (°C)': Number(Number(row.esp_temp || 0).toFixed(1)),
      'FREE_HEAP': parseInt(row.free_heap || 0, 10),
      'WIFI_RSSI (dBm)': parseInt(row.wifi_rssi ?? -65, 10),
      'SD_STATUS': row.sd_status || 'OK'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetData);

  // Set explicit column widths for neat rendering
  worksheet['!cols'] = [
    { wch: 20 }, // TIMESTAMP
    { wch: 10 }, // V_PV
    { wch: 10 }, // I_PV
    { wch: 10 }, // P_PV
    { wch: 12 }, // WH_DAILY
    { wch: 12 }, // LUX
    { wch: 15 }, // SUNSHINE_JAM
    { wch: 10 }, // V_BAT
    { wch: 10 }, // I_BAT
    { wch: 10 }, // P_BAT
    { wch: 15 }, // PV_NORMALIZED
    { wch: 16 }, // DUMP_LOAD_PWM
    { wch: 12 }, // UPTIME_SEC
    { wch: 14 }, // ESP_TEMP
    { wch: 12 }, // FREE_HEAP
    { wch: 16 }, // WIFI_RSSI
    { wch: 12 }  // SD_STATUS
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Solar Energy Logs');

  const tzSuffix = isUtc ? 'UTC' : 'WIB';
  const dateSuffix = `${dateFrom || 'all'}_to_${dateTo || 'now'}`;
  const fileName = `solar_log_${tzSuffix}_${dateSuffix}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
