import React, { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight, Search, Filter, RefreshCw } from 'lucide-react';
import { exportToCsv } from '../utils/csvExporter';
import { formatEnergy } from '../services/solarService';

function DataTable({ logs = [], dateFrom, setDateFrom, dateTo, setDateTo }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logs by selected date range and search term
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      const dateStr = item.dateObj ? item.dateObj.toISOString().substring(0, 10) : item.timestamp.substring(0, 10);
      const afterFrom = dateFrom ? dateStr >= dateFrom : true;
      const beforeTo = dateTo ? dateStr <= dateTo : true;

      const matchesSearch = searchTerm === '' || 
        item.timestamp.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(logVal(item.v_pv)).includes(searchTerm) ||
        String(logVal(item.p_pv)).includes(searchTerm) ||
        String(item.load_status).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.sd_status).toLowerCase().includes(searchTerm.toLowerCase());

      return afterFrom && beforeTo && matchesSearch;
    }).sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0));
  }, [logs, dateFrom, dateTo, searchTerm]);

  function logVal(val) {
    return val !== undefined && val !== null ? val : '';
  }

  // Reset pagination on filter, search, or itemsPerPage change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, searchTerm, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleExport = () => {
    exportToCsv(logs, dateFrom, dateTo);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setItemsPerPage(15);
  };

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
              Data riwayat pengukuran lengkap dari sensor PV, Baterai, dan status ESP32 Micro SD.
            </p>
          </div>

          {/* Controls: Search, Date Filters, Export */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative flex items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Cari timestamp, status..."
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

            {/* Reset */}
            {(dateFrom || dateTo || searchTerm || itemsPerPage !== 15) && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors border border-slate-200 flex items-center gap-1"
                title="Reset Filter & Pencarian"
              >
                <RefreshCw className="w-3 h-3 text-slate-500" />
                Reset
              </button>
            )}

            {/* Export CSV Button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
              title="Download CSV Log SD Card"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Log Data Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">V_PV (V)</th>
                <th className="p-3.5">I_PV (A)</th>
                <th className="p-3.5 text-blue-600">P_PV (W)</th>
                <th className="p-3.5 text-amber-600">Wh Daily</th>
                <th className="p-3.5">V_BAT (V)</th>
                <th className="p-3.5">I_BAT (A)</th>
                <th className="p-3.5 text-emerald-600">P_BAT (W)</th>
                <th className="p-3.5">SCC Eff (%)</th>
                <th className="p-3.5">Load</th>
                <th className="p-3.5">Uptime (s)</th>
                <th className="p-3.5">Temp (°C)</th>
                <th className="p-3.5">Wi-Fi (dBm)</th>
                <th className="p-3.5">SD Status</th>
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
                    <td className="p-3.5">{Number(log.v_bat).toFixed(2)}</td>
                    <td className="p-3.5">{Number(log.i_bat).toFixed(2)}</td>
                    <td className="p-3.5 text-emerald-600 font-bold">{Number(log.p_bat).toFixed(2)}</td>
                    <td className="p-3.5">{Number(log.scc_eff).toFixed(1)}%</td>
                    <td className="p-3.5 font-sans">
                      {log.load_status === 'ON' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">ON</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">OFF</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500">{log.uptime_sec}</td>
                    <td className="p-3.5 text-amber-600 font-semibold">{log.esp_temp}</td>
                    <td className="p-3.5 text-slate-500">{log.wifi_rssi}</td>
                    <td className="p-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-emerald-700 border border-slate-200">
                        {log.sd_status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400 font-sans">
                    <div className="max-w-xs mx-auto text-center">
                      <Filter className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Tidak Ada Data Ditemukan</p>
                      <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau rentang tanggal filter.</p>
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

