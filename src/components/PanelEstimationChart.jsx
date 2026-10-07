import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { filterLogsByPeriod, formatEnergy } from '../services/solarService';
import { Maximize2, Zap, BarChart2, Info, ShieldCheck, Sun } from 'lucide-react';

// Fixed specifications for the active solar panel in the system
const HARDWARE_PANEL_WP = 50; // 50 Watt Peak
const HARDWARE_PANEL_AREA = 0.25; // 0.25 m²
const MULTIPLIER_1M2 = 1.0 / HARDWARE_PANEL_AREA; // 4.0x multiplier for 1 m²

function PanelEstimationChart({ logs = [] }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'
  const [displayMetric, setDisplayMetric] = useState('power'); // 'power' (Watt) | 'energy' (Wh)

  const filteredLogs = useMemo(() => filterLogsByPeriod(logs, period), [logs, period]);

  // Perform energy & power calculations directly from active 50 Wp PV measurements
  const { chartData, total1m2Wh, total50WpWh, peakPower1m2, peakPower50Wp } = useMemo(() => {
    if (!filteredLogs || filteredLogs.length === 0) {
      return {
        chartData: { labels: [], series1m2: [], series50Wp: [] },
        total1m2Wh: 0,
        total50WpWh: 0,
        peakPower1m2: 0,
        peakPower50Wp: 0,
      };
    }

    const labels = [];
    const series1m2 = [];
    const series50Wp = [];

    let maxP1m2 = 0;
    let maxP50Wp = 0;

    filteredLogs.forEach((item) => {
      const label = period === 'harian'
        ? (item.wibTimeStr || (item.timestamp && item.timestamp.length >= 16 ? item.timestamp.substring(11, 16) : item.timestamp || ''))
        : (item.wibShortDateStr || item.timestamp || '');

      // Direct measured power (Watt) and daily Wh for active 50 Wp panel
      const p50Wp = Number(item.p_pv || 0);
      const p1m2 = p50Wp * MULTIPLIER_1M2;

      const wh50Wp = Number(item.wh_pv_daily || 0);
      const wh1m2 = wh50Wp * MULTIPLIER_1M2;

      if (p1m2 > maxP1m2) maxP1m2 = p1m2;
      if (p50Wp > maxP50Wp) maxP50Wp = p50Wp;

      labels.push(label);
      if (displayMetric === 'power') {
        series1m2.push(parseFloat(p1m2.toFixed(2)));
        series50Wp.push(parseFloat(p50Wp.toFixed(2)));
      } else {
        series1m2.push(parseFloat(wh1m2.toFixed(2)));
        series50Wp.push(parseFloat(wh50Wp.toFixed(2)));
      }
    });

    const latestWh50Wp = Number(filteredLogs[filteredLogs.length - 1]?.wh_pv_daily || 0);
    const tot50WpWh = latestWh50Wp;
    const tot1m2Wh = latestWh50Wp * MULTIPLIER_1M2;

    return {
      chartData: { labels, series1m2, series50Wp },
      total1m2Wh: tot1m2Wh,
      total50WpWh: tot50WpWh,
      peakPower1m2: maxP1m2,
      peakPower50Wp: maxP50Wp,
    };
  }, [filteredLogs, period, displayMetric]);

  const formatted1m2Wh = formatEnergy(total1m2Wh);
  const formatted50WpWh = formatEnergy(total50WpWh);

  const metricUnit = displayMetric === 'power' ? 'Watt' : 'Wh';
  const metricAxisTitle = displayMetric === 'power' ? 'Daya (Watt)' : 'Akumulasi Energi (Wh)';

  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      animationDurationUpdate: 300,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        textStyle: { color: '#1e293b', fontFamily: 'Inter' },
        axisPointer: { type: 'cross', label: { backgroundColor: '#6366f1' } },
        formatter: (params) => {
          let rel = `<b>${params[0]?.name || ''}</b><br/>`;
          params.forEach(p => {
            rel += `${p.marker} ${p.seriesName}: <b>${p.value} ${metricUnit}</b><br/>`;
          });
          return rel;
        }
      },
      legend: {
        data: ['Panel Aktif (50 Wp / 0.25 m²)', 'Estimasi Panel 1 m² (~200 Wp)'],
        textStyle: { color: '#64748b', fontFamily: 'Inter', fontSize: 12 },
        top: 0,
        right: 15
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '16%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      yAxis: {
        type: 'value',
        name: metricAxisTitle,
        nameTextStyle: { color: '#4f46e5', fontWeight: 'bold' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      series: [
        {
          name: 'Panel Aktif (50 Wp / 0.25 m²)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 3, color: '#10b981' }, // Emerald
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.22)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
            ])
          },
          data: chartData.series50Wp
        },
        {
          name: 'Estimasi Panel 1 m² (~200 Wp)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2.5, color: '#4f46e5' }, // Indigo
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79, 70, 229, 0.15)' },
              { offset: 1, color: 'rgba(79, 70, 229, 0.0)' }
            ])
          },
          data: chartData.series1m2
        }
      ]
    };
  }, [chartData, metricUnit, metricAxisTitle]);

  return (
    <div className="white-card rounded-2xl p-6 lg:col-span-2">
      {/* Top Header & Interactive Control Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-800">
              Estimasi Energi (Wh) & Daya Solar Panel (50 Wp vs 1 m²)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data aktual panel 50 Wp terpasang dibandingkan proyeksi modul standar 1 m² (~200 Wp)
          </p>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          
          {/* Metric Selector Toggle (Daya Watt vs Energi Wh) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setDisplayMetric('power')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs ${
                displayMetric === 'power'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'hover:text-slate-900'
              }`}
              title="Tampilkan grafik daya sesaat (Watt)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Daya (Watt)</span>
            </button>
            <button
              onClick={() => setDisplayMetric('energy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs ${
                displayMetric === 'energy'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'hover:text-slate-900'
              }`}
              title="Tampilkan grafik akumulasi energi (Wh)"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Energi (Wh)</span>
            </button>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setPeriod('harian')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'harian' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriod('mingguan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'mingguan' ? 'bg-teal-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriod('bulanan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'bulanan' ? 'bg-purple-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              Bulanan
            </button>
          </div>

        </div>
      </div>

      {/* Hardware Specification Info Banner */}
      <div className="bg-gradient-to-r from-emerald-50/80 via-blue-50/50 to-slate-50 border border-emerald-100 rounded-2xl p-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900">Spesifikasi Hardware Solar Panel:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                50 Wp (Real-Time Sensor)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mengukur langsung output panel <b>50 Watt-Peak (0.25 m²)</b>. Proyeksi standar 1 m² dihitung <b>4.0x</b> dari data terukur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Faktor Pengganda (1 m²): <strong className="text-emerald-700 font-mono text-sm">4.00x</strong></span>
        </div>
      </div>

      {/* Summary KPI Badges (4 Equal Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        
        {/* KPI 1: Panel Aktif (50 Wp) */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 transition-all hover:shadow-md">
          <div className="text-xs text-emerald-700 font-semibold truncate">Panel Aktif (50 Wp Terpasang)</div>
          <div className="text-xl lg:text-2xl font-extrabold font-mono text-emerald-950 mt-1">
            {formatted50WpWh.value} <span className="text-xs font-bold text-emerald-600">{formatted50WpWh.unit}</span>
          </div>
          <div className="text-[11px] text-emerald-600/80 font-medium mt-1">
            Peak Power: <b>{peakPower50Wp.toFixed(1)} Watt</b>
          </div>
        </div>

        {/* KPI 2: Estimasi Panel 1 m² */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 transition-all hover:shadow-md">
          <div className="text-xs text-indigo-700 font-semibold truncate">Estimasi Panel 1 m² (~200 Wp)</div>
          <div className="text-xl lg:text-2xl font-extrabold font-mono text-indigo-950 mt-1">
            {formatted1m2Wh.value} <span className="text-xs font-bold text-indigo-600">{formatted1m2Wh.unit}</span>
          </div>
          <div className="text-[11px] text-indigo-600/80 font-medium mt-1">
            Peak Power: <b>{peakPower1m2.toFixed(1)} Watt</b>
          </div>
        </div>

        {/* KPI 3: Daya Puncak Aktif */}
        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 transition-all hover:shadow-md">
          <div className="text-xs text-amber-700 font-semibold truncate">Daya Puncak 50 Wp (Terukur)</div>
          <div className="text-xl lg:text-2xl font-extrabold font-mono text-amber-950 mt-1">
            {peakPower50Wp.toFixed(1)} <span className="text-xs font-bold text-amber-600">Watt</span>
          </div>
          <div className="text-[11px] text-amber-600/80 font-medium mt-1 truncate">
            Peak 1 m²: {peakPower1m2.toFixed(1)} Watt
          </div>
        </div>

        {/* KPI 4: Rasio Skala */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:shadow-md">
          <div className="text-xs text-slate-500 font-semibold truncate">Rasio Skala Panel</div>
          <div className="text-xl lg:text-2xl font-extrabold font-mono text-slate-800 mt-1">
            4.00x
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 truncate flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>1.0 m² / 0.25 m² (50 Wp)</span>
          </div>
        </div>

      </div>

      {/* EChart Container */}
      <div className="h-72 w-full">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
      </div>
    </div>
  );
}

export default React.memo(PanelEstimationChart);
