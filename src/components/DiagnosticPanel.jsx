import React from 'react';
import { ShieldCheck, HardDrive, Wifi, Cpu, Thermometer, Clock, Activity } from 'lucide-react';

function DiagnosticPanel({ diagnostics }) {
  const {
    isOnline = false,
    uptimeFormatted = '0 Hari, 0 Jam, 0 Mnt',
    espTemp = 0,
    tempStatus = 'NORMAL',
    freeHeapKb = 0,
    wifiRssi = -90,
    wifiQuality = 'Weak',
    sdStatus = 'MOUNTED',
    lastSeenWib = '-',
    lastSeenUtc = '-',
  } = diagnostics || {};

  return (
    <section className="mt-6">
      <div className="white-card rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Diagnostic & System Health
          </span>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-slate-400 font-sans">Last Log:</span>
            <span className="font-bold text-slate-800">{lastSeenWib} WIB</span>
            <span className="text-slate-400 text-[11px]">({lastSeenUtc} UTC)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          {/* Status Koneksi */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Status Koneksi
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {isOnline ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">ONLINE</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="font-bold text-rose-600 text-sm">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* ESP32 Uptime */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Uptime
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-slate-900 truncate">
              {uptimeFormatted}
            </div>
          </div>

          {/* Suhu Box */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Suhu Device
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-slate-900">{espTemp}</span>
              <span className="text-xs text-slate-500">°C</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold">{tempStatus}</span>
            </div>
          </div>

          {/* Free Heap RAM */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" /> Free Memory
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-slate-900">{freeHeapKb}</span>
              <span className="text-xs text-slate-500">KB</span>
            </div>
          </div>

          {/* Sinyal Wi-Fi */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-blue-600" /> Wi-Fi
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-bold font-mono text-slate-900">{wifiRssi} <span className="text-xs font-normal text-slate-500">dBm</span></span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">{wifiQuality}</span>
            </div>
          </div>

          {/* SD Card Status */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" /> SD Card
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-bold text-xs text-emerald-700 font-mono">{sdStatus}</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default React.memo(DiagnosticPanel);
