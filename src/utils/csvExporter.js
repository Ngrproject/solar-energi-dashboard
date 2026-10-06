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
 * Exports solar log data to an Excel (.xls) spreadsheet file.
 * @param {Array} logs - Array of solar log entries
 * @param {string} dateFrom - Start date filter (YYYY-MM-DD)
 * @param {string} dateTo - End date filter (YYYY-MM-DD)
 * @param {string} timeZoneMode - Timezone format: 'WIB' or 'UTC' (default 'WIB')
 */
export function exportToXls(logs, dateFrom, dateTo, timeZoneMode = 'WIB') {
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

  let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Solar Energy Logs</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  th { background-color: #2563eb; color: #ffffff; font-weight: bold; text-align: center; padding: 8px; font-family: Arial, sans-serif; font-size: 11px; }
  td { border: 1px solid #cbd5e1; padding: 6px; font-family: Arial, sans-serif; font-size: 11px; text-align: right; }
  .text-left { text-align: left; }
  .text-center { text-align: center; }
  .txt { mso-number-format:"\@"; }
</style>
</head>
<body>
<table>
<thead>
  <tr>
    <th>TIMESTAMP</th>
    <th>V_PV (V)</th>
    <th>I_PV (A)</th>
    <th>P_PV (W)</th>
    <th>WH_DAILY</th>
    <th>LUX (lx)</th>
    <th>SUNSHINE_JAM</th>
    <th>V_BAT (V)</th>
    <th>I_BAT (A)</th>
    <th>P_BAT (W)</th>
    <th>PV_NORMALIZED</th>
    <th>DUMP_LOAD_PWM</th>
    <th>UPTIME_SEC</th>
    <th>ESP_TEMP (°C)</th>
    <th>FREE_HEAP</th>
    <th>WIFI_RSSI (dBm)</th>
    <th>SD_STATUS</th>
  </tr>
</thead>
<tbody>`;

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

    tableHtml += `
  <tr>
    <td class="txt text-center">${timestampVal || ''}</td>
    <td>${Number(row.v_pv || 0).toFixed(2)}</td>
    <td>${Number(row.i_pv || 0).toFixed(2)}</td>
    <td>${Number(row.p_pv || 0).toFixed(2)}</td>
    <td>${Number(row.wh_pv_daily || 0).toFixed(2)}</td>
    <td>${Math.round(Number(row.lux_val || 0))}</td>
    <td>${Number(row.sunshine_hours_daily || 0).toFixed(2)}</td>
    <td>${Number(row.v_bat || 0).toFixed(2)}</td>
    <td>${Number(row.i_bat || 0).toFixed(2)}</td>
    <td>${Number(row.p_bat || 0).toFixed(2)}</td>
    <td>${Number(row.pv_normalized ?? row.scc_eff ?? 0).toFixed(1)}</td>
    <td class="text-center">${pwmVal}</td>
    <td class="text-center">${parseInt(row.uptime_sec || 0, 10)}</td>
    <td>${Number(row.esp_temp || 0).toFixed(1)}</td>
    <td>${parseInt(row.free_heap || 0, 10)}</td>
    <td class="text-center">${parseInt(row.wifi_rssi ?? -65, 10)}</td>
    <td class="text-center">${row.sd_status || 'OK'}</td>
  </tr>`;
  });

  tableHtml += `
</tbody>
</table>
</body>
</html>`;

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const tzSuffix = isUtc ? 'UTC' : 'WIB';
  const dateSuffix = `${dateFrom || 'all'}_to_${dateTo || 'now'}`;
  const fileName = `solar_log_${tzSuffix}_${dateSuffix}_${new Date().toISOString().replace(/[:.]/g, '-')}.xls`;
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
