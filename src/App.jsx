import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, BellRing, Layers } from 'lucide-react';
import { fetchSolarLogs, calculateDiagnostics, getAvailableSheetOptions } from './services/solarService';
import logoImg from './assets/logo.png';
import RealTimeClock from './components/RealTimeClock';
import DiagnosticPanel from './components/DiagnosticPanel';
import SummaryCards from './components/SummaryCards';
import PowerEChart from './components/PowerEChart';
import VoltageEChart from './components/VoltageEChart';
import DailyWhEChart from './components/DailyWhEChart';
import DataTable from './components/DataTable';

export default function App() {
  const [logs, setLogs] = useState([]);
  const [activeSheet, setActiveSheet] = useState('AUTO');
  const [selectedSheet, setSelectedSheet] = useState('AUTO');
  const [isFallback, setIsFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newDataNotice, setNewDataNotice] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const prevLastTimestamp = useRef(null);
  const sheetOptions = useMemo(() => getAvailableSheetOptions(), []);

  const loadData = async (isSilent = false, sheetToFetch = selectedSheet) => {
    if (!isSilent) setLoading(true);
    const result = await fetchSolarLogs(sheetToFetch);
    
    if (result.logs.length > 0) {
      const latestTs = result.logs[result.logs.length - 1].timestamp;
      if (prevLastTimestamp.current && prevLastTimestamp.current !== latestTs) {
        setNewDataNotice(true);
        setTimeout(() => setNewDataNotice(false), 4000);
      }
      prevLastTimestamp.current = latestTs;
    }

    setLogs(result.logs);
    setActiveSheet(result.activeSheetName || 'Default');
    setIsFallback(result.isFallback);
    setErrorMessage(result.errorMessage);
    if (!isSilent) setLoading(false);
  };

  useEffect(() => {
    loadData(false, selectedSheet);
  }, [selectedSheet]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true, selectedSheet);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedSheet]);

  const latestRecord = useMemo(() => (logs.length > 0 ? logs[logs.length - 1] : null), [logs]);
  const diagnostics = useMemo(() => calculateDiagnostics(latestRecord), [latestRecord]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 relative">

      {/* NEW DATA TOAST NOTIFICATION */}
      {newDataNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <BellRing className="w-5 h-5 text-amber-300" />
          <div>
            <div className="text-xs font-bold">Data Baru Terdeteksi!</div>
            <div className="text-[11px] opacity-90">Dashboard telah diperbarui otomatis.</div>
          </div>
        </div>
      )}
      
      {/* HEADER BAR */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
            <img src={logoImg} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Solar Energy Monitoring System
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Real-Time Data Logging & Cloud Analytics</p>
          </div>
        </div>

        {/* Header Action Controls & Real-Time Clocks Widget */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          
          {/* REAL-TIME WIB & UTC CLOCKS WIDGET */}
          <RealTimeClock />

          {/* Sheet / Month Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Sheet:</span>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="bg-transparent text-xs text-blue-700 font-bold focus:outline-none cursor-pointer"
            >
              {sheetOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Mode Badge */}
          {isFallback ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold" title={errorMessage || 'Using Fallback Local Data'}>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Mock Data Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold" title={`Sheet Aktif: ${activeSheet}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sheets Live ({activeSheet})</span>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadData(false, selectedSheet)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200 shadow-sm disabled:opacity-50"
            title="Refresh Sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* SYSTEM DIAGNOSTIC & HEALTH PANEL */}
      <DiagnosticPanel diagnostics={diagnostics} />

      {/* REAL-TIME METRIC CARDS */}
      <SummaryCards latestRecord={latestRecord} logs={logs} />

      {/* INTERACTIVE ECHARTS SECTION */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PowerEChart logs={logs} />
        <VoltageEChart logs={logs} />
        <DailyWhEChart logs={logs} />
      </section>

      {/* LOG DATA TABLE & CSV EXPORTER */}
      <DataTable
        logs={logs}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
      />

      {/* FOOTER */}
      <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-200 pt-6">
        <p className="font-medium text-slate-500 tracking-wide">
          Build by : <span className="font-bold text-blue-600">NGR Media</span> — Supported by <span className="font-semibold text-slate-700">Universitas Putra Bangsa</span>
        </p>
      </footer>

    </div>
  );
}
