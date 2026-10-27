import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Search, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { exportEra5ComparisonToCsv, exportEra5ComparisonToXlsx } from '../utils/csvExporter';

export default function Era5ComparisonTable({
  alignedData = [],
  timeZone = 'WIB',
  selectedDate = 'ALL',
  onDateChange,
  availableDates = [],
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter aligned data
  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return alignedData.filter((item) => {
      const matchSearch =
        term === '' ||
        item.displayTime.toLowerCase().includes(term) ||
        String(item.era5_w_m2).includes(term) ||
        String(item.watt_pv).includes(term) ||
        String(item.watt_bat).includes(term) ||
        String(item.lux).includes(term);

      return matchSearch;
    });
  }, [alignedData, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleExportCsv = () => {
    setShowExportMenu(false);
    exportEra5ComparisonToCsv(filteredData, timeZone);
  };

  const handleExportXlsx = () => {
    setShowExportMenu(false);
    exportEra5ComparisonToXlsx(filteredData, timeZone);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm mt-6">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Tabel Data Komparasi Per Jam ({timeZone})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Menampilkan data sinkronisasi per jam antara satelit ERA5 dan sensor telemetri ({filteredData.length} baris).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari waktu / nilai..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>

          {/* Date Selector */}
          {availableDates.length > 0 && (
            <select
              value={selectedDate}
              onChange={(e) => {
                if (onDateChange) onDateChange(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Semua Tanggal ({availableDates.length} Hari)</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95">
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Download CSV (.csv)</span>
                </button>
                <button
                  onClick={handleExportXlsx}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-600 font-bold">
              <th className="py-3 px-3.5">Waktu ({timeZone})</th>
              <th className="py-3 px-3.5 text-orange-600">Radiasi ERA5 (W/m²)</th>
              <th className="py-3 px-3.5 text-slate-500">Raw ERA5 (J/m²)</th>
              <th className="py-3 px-3.5 text-blue-600">Daya PV (Watt)</th>
              <th className="py-3 px-3.5 text-emerald-600">Daya Baterai (Watt)</th>
              <th className="py-3 px-3.5 text-purple-600">Sensor Lux (lx)</th>
              <th className="py-3 px-3.5 text-slate-500">Rasio PV / ERA5</th>
              <th className="py-3 px-3.5 text-slate-500">Sampel Sensor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Tidak ada data yang cocok dengan kriteria filter.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const ratio = row.era5_w_m2 > 0 ? (row.watt_pv / row.era5_w_m2).toFixed(3) : '-';
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-medium text-slate-800">
                      {row.displayTime}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-orange-600">
                      {row.era5_w_m2.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">
                      {(row.era5_j_m2 / 1000000).toFixed(2)} MJ
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-blue-600">
                      {row.watt_pv.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-600">
                      {row.watt_bat.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-purple-700">
                      {row.lux.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600 text-[11px]">
                      {ratio !== '-' ? `${ratio} W/(W/m²)` : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        {row.sample_count} pts
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 mt-2 border-t border-slate-100 gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Menampilkan</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>dari {filteredData.length} baris</span>
        </div>

        <div className="flex items-center gap-2 self-center sm:self-auto">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-slate-700">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

