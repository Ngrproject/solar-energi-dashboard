import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Search, Filter, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import { exportToCsv, exportToXlsx } from '../utils/csvExporter';
import { formatEnergy, parseLoadStatus } from '../services/solarService';

function DataTable({ logs = [], dateFrom, setDateFrom, dateTo, setDateTo }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Close export dropdown menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const columns = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'v_pv', label: 'V_PV (V)' },
    { key: 'i_pv', label: 'I_PV (A)' },
    { key: 'p_pv', label: 'P_PV (W)', className: 'text-blue-600' },
    { key: 'wh_pv_daily', label: 'WH_DAILY', className: 'text-amber-600' },
    { key: 'lux_val', label: 'LUX (lx)', className: 'text-amber-500' },
    { key: 'sunshine_hours_daily', label: 'SUNSHINE_JAM', className: 'text-orange-600' },
    { key: 'v_bat', label: 'V_BAT (V)' },
    { key: 'i_bat', label: 'I_BAT (A)' },
    { key: 'p_bat', label: 'P_BAT (W)', className: 'text-emerald-600' },
    { key: 'pv_normalized', label: 'PV_NORMALIZED' },
    { key: 'dump_load_pwm', label: 'DUMP_LOAD_PWM' },
    { key: 'uptime_sec', label: 'UPTIME_SEC' },
    { key: 'esp_temp', label: 'ESP_TEMP (°C)' },
    { key: 'free_heap', label: 'FREE_HEAP' },
    { key: 'wifi_rssi', label: 'WIFI_RSSI (dBm)', className: 'text-indigo-600' },
    { key: 'sd_status', label: 'SD_STATUS' },
  ];

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = logs.filter(item => {
      const dateStr = item.wibDateStr || (item.dateObj ? item.dateObj.toISOString().substring(0, 10) : item.timestamp.substring(0, 10));
      const afterFrom = dateFrom ? dateStr >= dateFrom : true;
      const beforeTo = dateTo ? dateStr <= dateTo : true;

      const matchesSearch = term === '' || 
        item.timestamp.toLowerCase().includes(term) ||
        String(logVal(item.v_pv)).includes(term) ||
        String(logVal(item.p_pv)).includes(term) ||
        String(logVal(item.lux_val)).includes(term) ||
        String(logVal(item.pv_normalized)).includes(term) ||
        String(logVal(item.sunshine_hours_daily)).includes(term) ||
        String(logVal(item.wifi_rssi)).includes(term) ||
        String(item.load_status).toLowerCase().includes(term) ||
        String(item.sd_status).toLowerCase().includes(term);

      return afterFrom && beforeTo && matchesSearch;
    });

    return filtered.sort((a, b) => {
      let valA, valB;

      if (sortColumn === 'timestamp' || sortColumn === 'dateObj') {
        valA = a.dateObj ? a.dateObj.getTime() : 0;
        valB = b.dateObj ? b.dateObj.getTime() : 0;
      } else if (sortColumn === 'wh_daily' || sortColumn === 'wh_pv_daily') {
        valA = Number(a.wh_pv_daily || 0);
        valB = Number(b.wh_pv_daily || 0);
      } else if (sortColumn === 'load_status' || sortColumn === 'dump_load_pwm') {
        valA = Number(a.dump_load_pwm || 0);
        valB = Number(b.dump_load_pwm || 0);
      } else if (typeof a[sortColumn] === 'string') {
        valA = (a[sortColumn] || '').toLowerCase();
        valB = (b[sortColumn] || '').toLowerCase();
      } else {
        valA = Number(a[sortColumn] ?? 0);
        valB = Number(b[sortColumn] ?? 0);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [logs, dateFrom, dateTo, searchTerm, sortColumn, sortOrder]);

  function logVal(val) {
    return val !== undefined && val !== null ? val : '';
  }

  // Handle column header click for sorting
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortOrder('desc');
    }
  };

  // Reset pagination on filter, search, sort, or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, searchTerm, itemsPerPage, sortColumn, sortOrder]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleExport = (format = 'csv', timeZoneMode = 'WIB') => {
    if (format === 'xlsx') {
      exportToXlsx(logs, dateFrom, dateTo, timeZoneMode);
    } else {
      exportToCsv(logs, dateFrom, dateTo, timeZoneMode);
    }
    setShowExportMenu(false);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setItemsPerPage(15);
    setSortColumn('timestamp');
    setSortOrder('desc');
  };

  const isFilteredOrSorted = dateFrom || dateTo || searchTerm || itemsPerPage !== 15 || sortColumn !== 'timestamp' || sortOrder !== 'desc';

  return (
    <section className="mt-6">
      <div className="white-card rounded-2xl p-6">
        
        {/* Header & Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Data Energi & Log Solar IoT
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {filteredLogs.length} Entri
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data riwayat pengukuran lengkap dari sensor PV, Cahaya (Lux), Lama Penyinaran (Sunshine), Baterai, Wi-Fi RSSI, dan status ESP32 Micro SD. Klik judul kolom untuk mengurutkan data.
            </p>
          </div>

          {/* Controls: Search, Date Filters, Sort, Export */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative flex items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Cari timestamp, status, lux, rssi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-36 sm:w-44 font-medium"
              />
            </div>

            {/* Date Dari */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <label className="text-xs text-slate-500 font-semibold">Dari:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none font-mono"
              />
            </div>

            {/* Date Sampai */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <label className="text-xs text-slate-500 font-semibold">Sampai:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none font-mono"
              />
            </div>

            {/* Sort Control Dropdown & Direction Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-slate-500 font-semibold">Urutkan:</label>
              <select
                value={sortColumn}
                onChange={e => setSortColumn(e.target.value)}
                className="bg-transparent text-xs text-blue-700 font-bold focus:outline-none cursor-pointer"
              >
                {columns.map(col => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="ml-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-1 text-[11px] shadow-sm transition-colors"
                title={sortOrder === 'asc' ? 'Urutan Naik (A-Z / 0-9)' : 'Urutan Turun (Z-A / 9-0)'}
              >
                {sortOrder === 'asc' ? (
                  <>
                    <ArrowUp className="w-3 h-3 text-blue-600" /> ASC
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3 text-blue-600" /> DESC
                  </>
                )}
              </button>
            </div>

            {/* Reset */}
            {isFilteredOrSorted && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors border border-slate-200 flex items-center gap-1"
                title="Reset Filter & Pengurutan"
              >
                <RefreshCw className="w-3 h-3 text-slate-500" />
                Reset
              </button>
            )}

            {/* Export CSV / Excel (XLSX) Button with Dropdown Menu */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
                title="Download Log Data (CSV / Excel XLSX)"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  {/* CSV Section */}
                  <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 bg-slate-50 border-y border-slate-100">
                    <FileText className="w-3 h-3 text-emerald-600" />
                    Format CSV (.csv)
                  </div>

                  <button
                    onClick={() => handleExport('csv', 'WIB')}
                    className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between font-semibold transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">CSV (WIB / UTC+7)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Waktu Indonesia Barat</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                      WIB
                    </span>
                  </button>

                  <button
                    onClick={() => handleExport('csv', 'UTC')}
                    className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between font-semibold transition-colors border-t border-slate-100/60"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">CSV (UTC / GMT+0)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Waktu Standar ESP32</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      UTC
                    </span>
                  </button>

                  {/* Excel XLSX Section */}
                  <div className="px-3.5 py-1 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 bg-slate-50 border-y border-slate-100">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    Format Excel (.xlsx)
                  </div>

                  <button
                    onClick={() => handleExport('xlsx', 'WIB')}
                    className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between font-semibold transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">Excel XLSX (WIB / UTC+7)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Tabel Rapi Spreadsheet WIB</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      WIB
                    </span>
                  </button>

                  <button
                    onClick={() => handleExport('xlsx', 'UTC')}
                    className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between font-semibold transition-colors border-t border-slate-100/60"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">Excel XLSX (UTC / GMT+0)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Tabel Rapi Spreadsheet UTC</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      UTC
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Log Data Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`p-3.5 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap ${col.className || ''}`}
                    title={`Urutkan berdasarkan ${col.label}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {sortColumn === col.key ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3.5 text-slate-900 font-semibold whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5">{Number(log.v_pv).toFixed(2)}</td>
                    <td className="p-3.5">{Number(log.i_pv).toFixed(2)}</td>
                    <td className="p-3.5 text-blue-600 font-bold">{Number(log.p_pv).toFixed(2)}</td>
                    <td className="p-3.5 text-amber-600 font-bold">{formatEnergy(log.wh_pv_daily).formatted}</td>
                    <td className="p-3.5 text-amber-600 font-bold">{Number(log.lux_val || 0).toLocaleString('id-ID')} lx</td>
                    <td className="p-3.5 text-orange-600 font-bold">{Number(log.sunshine_hours_daily || 0).toFixed(2)} Jam</td>
                    <td className="p-3.5">{Number(log.v_bat).toFixed(2)}</td>
                    <td className="p-3.5">{Number(log.i_bat).toFixed(2)}</td>
                    <td className="p-3.5 text-emerald-600 font-bold">{Number(log.p_bat).toFixed(2)}</td>
                    <td className="p-3.5">{Number(log.pv_normalized ?? log.scc_eff ?? 0).toFixed(1)}</td>
                    <td className="p-3.5 font-sans">
                      {parseLoadStatus(log.load_status) !== 'OFF' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {parseLoadStatus(log.load_status)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          OFF
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500">{log.uptime_sec}</td>
                    <td className="p-3.5 text-amber-600 font-semibold">{log.esp_temp}</td>
                    <td className="p-3.5 text-slate-500">{Number(log.free_heap || 0).toLocaleString('id-ID')}</td>
                    <td className="p-3.5 text-indigo-600 font-semibold">{log.wifi_rssi ?? -65} dBm</td>
                    <td className="p-3.5 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        log.sd_status === 'ERROR' || log.sd_status === 'FAIL' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {log.sd_status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={17} className="p-12 text-center text-slate-400 font-sans">
                    <div className="max-w-xs mx-auto text-center">
                      <Filter className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Tidak Ada Data Ditemukan</p>
                      <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian, pengurutan, atau rentang tanggal filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Controls: Pagination & Per-Page Selector Below Data Table */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              Menampilkan entri <span className="font-bold text-slate-900">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> dari <span className="font-bold text-slate-900">{filteredLogs.length}</span> total entri (Halaman <span className="font-bold text-slate-900">{currentPage}</span> / {totalPages})
            </div>

            {/* Tampilkan per Halaman Selector (15, 50, 100) */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="text-slate-500 font-semibold">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-transparent text-xs text-blue-700 font-bold focus:outline-none cursor-pointer"
              >
                <option value={15}>15 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

export default React.memo(DataTable);


