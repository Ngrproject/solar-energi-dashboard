import React, { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportToCsv } from '../utils/csvExporter';
import { formatEnergy } from '../services/solarService';

function DataTable({ logs = [], dateFrom, setDateFrom, dateTo, setDateTo }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter logs by selected date range
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      const dateStr = item.dateObj ? item.dateObj.toISOString().substring(0, 10) : item.timestamp.substring(0, 10);
      const afterFrom = dateFrom ? dateStr >= dateFrom : true;
      const beforeTo = dateTo ? dateStr <= dateTo : true;
      return afterFrom && beforeTo;
    }).sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0));
  }, [logs, dateFrom, dateTo]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleExport = () => {
    exportToCsv(logs, dateFrom, dateTo);
  };

  return (
    <section className="mt-8">
      <div className="white-card rounded-2xl p-6">
        
        {/* Filter Bar & Export Trigger */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Histori Data Log Solar IoT
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold font-mono">
                {filteredLogs.length} Entri
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Format log 100% presisi dengan Micro SD Card ESP32.</p>
          </div>

          {/* Date Filter Inputs & Export Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <label className="text-xs text-slate-500 font-semibold">Dari:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <label className="text-xs text-slate-500 font-semibold">Sampai:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none font-mono"
              />
            </div>

            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors border border-slate-200"
            >
              Reset
            </button>

            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
              title="Download CSV Log SD Card"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Log Data Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">V_PV (V)</th>
                <th className="p-3">I_PV (A)</th>
                <th className="p-3 text-blue-600">P_PV (W)</th>
                <th className="p-3 text-amber-600">Wh Daily</th>
                <th className="p-3">V_BAT (V)</th>
                <th className="p-3">I_BAT (A)</th>
                <th className="p-3 text-emerald-600">P_BAT (W)</th>
                <th className="p-3">SCC Eff (%)</th>
                <th className="p-3">Load</th>
                <th className="p-3">Uptime (s)</th>
                <th className="p-3">Temp (°C)</th>
                <th className="p-3">Wi-Fi (dBm)</th>
                <th className="p-3">SD Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-slate-900 font-semibold whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3">{Number(log.v_pv).toFixed(2)}</td>
                    <td className="p-3">{Number(log.i_pv).toFixed(2)}</td>
                    <td className="p-3 text-blue-600 font-bold">{Number(log.p_pv).toFixed(2)}</td>
                    <td className="p-3 text-amber-600 font-bold">{formatEnergy(log.wh_pv_daily).formatted}</td>
                    <td className="p-3">{Number(log.v_bat).toFixed(2)}</td>
                    <td className="p-3">{Number(log.i_bat).toFixed(2)}</td>
                    <td className="p-3 text-emerald-600 font-bold">{Number(log.p_bat).toFixed(2)}</td>
                    <td className="p-3">{Number(log.scc_eff).toFixed(1)}%</td>
                    <td className="p-3 font-sans">
                      {log.load_status === 'ON' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ON</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">OFF</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{log.uptime_sec}</td>
                    <td className="p-3 text-amber-600 font-semibold">{log.esp_temp}</td>
                    <td className="p-3 text-slate-500">{log.wifi_rssi}</td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-emerald-700 border border-slate-200">
                        {log.sd_status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-400 font-sans">
                    Tidak ada data log yang sesuai dengan filter tanggal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <div>
            Halaman <span className="font-bold text-slate-900">{currentPage}</span> dari <span className="font-bold text-slate-900">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
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
