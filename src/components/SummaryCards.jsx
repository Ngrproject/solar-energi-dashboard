import React, { useState } from 'react';
import { Sun, BatteryCharging, Zap, RotateCcw } from 'lucide-react';
import { calculateEnergyPeriods, formatEnergy } from '../services/solarService';

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
    load_status = 'ON',
  } = latestRecord || {};

  const isCharging = p_bat >= 0;

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
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">Solar Input</span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold font-mono text-slate-900 tracking-tight">{p_pv}</span>
          <span className="text-base font-bold text-blue-600">Watt</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500 font-medium">Tegangan (V_PV)</div>
            <div className="text-base font-bold font-mono text-slate-800 mt-0.5">{v_pv} <span className="text-xs text-slate-400 font-normal">V</span></div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Arus (I_PV)</div>
            <div className="text-base font-bold font-mono text-slate-800 mt-0.5">{i_pv} <span className="text-xs text-slate-400 font-normal">A</span></div>
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
            <div className="text-xs text-slate-500 font-medium">Relay Load</div>
            <div className="mt-0.5">
              {load_status === 'ON' ? (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">RELAY ON</span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">RELAY OFF</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

export default React.memo(SummaryCards);
