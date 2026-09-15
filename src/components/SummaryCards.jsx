import React, { useState } from 'react';
import { Sun, BatteryCharging, Zap, RotateCcw } from 'lucide-react';
import { calculateEnergyPeriods, formatEnergy, parseLoadStatus } from '../services/solarService';

function getLuxCategory(lux) {
  const val = Number(lux || 0);
  if (val >= 70000) return { label: 'Sangat Cerah', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (val >= 30000) return { label: 'Cerah', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  if (val >= 10000) return { label: 'Sedang', color: 'bg-sky-100 text-sky-800 border-sky-300' };
  if (val >= 1000) return { label: 'Redup', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  return { label: 'Gelap / Malam', color: 'bg-slate-200 text-slate-600 border-slate-300' };
}

function SummaryCards({ latestRecord, logs = [] }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'

  const {
    v_pv = 0,
    i_pv = 0,
    p_pv = 0,
    v_bat = 0,
    i_bat = 0,
    p_bat = 0,
    scc_eff = 0,
    load_status = 'OFF',
    lux_val = 0,
  } = latestRecord || {};

  const displayLoadStatus = parseLoadStatus(load_status);

  const isCharging = p_bat >= 0;
  const luxCat = getLuxCategory(lux_val);

  // Calculate Period Energies
  const energyData = calculateEnergyPeriods(logs);

  let currentWh = energyData.harianWh;
  let periodLabel = 'Reset 00:00';
  let periodTitle = 'Energi Harian';

  if (period === 'mingguan') {
    currentWh = energyData.mingguanWh;
    periodLabel = 'Minggu Ini';
    periodTitle = 'Energi Mingguan';
  } else if (period === 'bulanan') {
    currentWh = energyData.bulananWh;
    periodLabel = 'Bulan Ini';
    periodTitle = 'Energi Bulanan';
  }

  const energyFormatted = formatEnergy(currentWh);

  return (
    <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* Card 1: PANEL SURYA (PV) METRICS */}
      <div className="white-card rounded-2xl p-6 relative overflow-hidden group hover:border-blue-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-blue-600" />
            Panel Surya (PV)
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${luxCat.color}`}>
            {luxCat.label}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono text-slate-900 tracking-tight">{p_pv}</span>
          <span className="text-base font-bold text-blue-600">Watt</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Tegangan (V_PV)</div>
            <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">{v_pv} <span className="text-[10px] text-slate-400 font-normal">V</span></div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Arus (I_PV)</div>
            <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">{i_pv} <span className="text-[10px] text-slate-400 font-normal">A</span></div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Cahaya (Lux)</div>
            <div className="text-sm font-bold font-mono text-amber-600 mt-0.5">{Number(lux_val || 0).toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      {/* Card 2: BATERAI (BATTERY) METRICS */}
      <div className="white-card rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <BatteryCharging className="w-4 h-4 text-emerald-600" />
            Baterai (BAT)
          </span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
            {isCharging ? 'CHARGING' : 'DISCHARGING'}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono text-slate-900 tracking-tight">{p_bat}</span>
          <span className="text-base font-bold text-emerald-600">Watt</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500 font-medium">Tegangan (V_BAT)</div>
            <div className="text-base font-bold font-mono text-slate-800 mt-0.5">{v_bat} <span className="text-xs text-slate-400 font-normal">V</span></div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Arus (I_BAT)</div>
            <div className="text-base font-bold font-mono text-slate-800 mt-0.5">{i_bat} <span className="text-xs text-slate-400 font-normal">A</span></div>
          </div>
        </div>
      </div>

      {/* Card 3: ENERGY ACCUMULATION WITH PERIOD SELECTOR */}
      <div className="white-card rounded-2xl p-6 relative overflow-hidden group hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-600" />
            {periodTitle}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-100 flex items-center gap-1">
            {period === 'harian' && <RotateCcw className="w-2.5 h-2.5" />}
            {periodLabel}
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-slate-900 tracking-tight">{energyFormatted.value}</span>
            <span className="text-base font-bold text-amber-600">{energyFormatted.unit}</span>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => setPeriod('harian')}
              className={`px-2.5 py-1 rounded-lg transition-all ${period === 'harian' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriod('mingguan')}
              className={`px-2.5 py-1 rounded-lg transition-all ${period === 'mingguan' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriod('bulanan')}
              className={`px-2.5 py-1 rounded-lg transition-all ${period === 'bulanan' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Bulanan
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500 font-medium">Efisiensi SCC</div>
            <div className="text-base font-bold font-mono text-slate-800 mt-0.5">{scc_eff}<span className="text-xs text-slate-400">%</span></div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Dump Load Status</div>
            <div className="mt-0.5">
              {displayLoadStatus && displayLoadStatus !== 'OFF' ? (
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  DUMP LOAD: {displayLoadStatus}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  DUMP LOAD: OFF
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

export default React.memo(SummaryCards);
