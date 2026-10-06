/**
 * Exports solar log data to a CSV file identical to ESP32 SD Card format.
 */
export function exportToCsv(logs, dateFrom, dateTo) {
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

  filtered.forEach(row => {
    let pwmVal = 0;
    if (typeof row.dump_load_pwm === 'number') {
      pwmVal = row.dump_load_pwm;
    } else {
      const match = String(row.load_status || '').match(/(\d+)/);
      if (match) pwmVal = parseInt(match[1], 10);
    }

    const line = [
      row.timestamp || '',
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
  
  const link = document.createElement('a');
  const fileName = `solar_log_${dateFrom || 'all'}_to_${dateTo || 'now'}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
