import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { filterLogsByPeriod } from '../services/solarService';
import { SunMedium, SlidersHorizontal, Calendar } from 'lucide-react';

const METRIC_CONFIG = {
  p_pv: {
    name: 'Daya PV (P_PV)',
    unit: 'Watt',
    color: '#2563eb', // Blue
    yAxisName: 'Daya (Watt)',
    areaColor: 'rgba(37, 99, 235, 0.18)',
  },
  p_bat: {
    name: 'Daya Baterai (P_BAT)',
    unit: 'Watt',
    color: '#10b981', // Emerald
    yAxisName: 'Daya (Watt)',
    areaColor: 'rgba(16, 185, 129, 0.18)',
  },
  v_pv: {
    name: 'Tegangan PV (V_PV)',
    unit: 'Volt',
    color: '#8b5cf6', // Purple
    yAxisName: 'Tegangan (Volt)',
    areaColor: 'rgba(139, 92, 246, 0.18)',
  },
  v_bat: {
    name: 'Tegangan Baterai (V_BAT)',
    unit: 'Volt',
    color: '#ec4899', // Pink
    yAxisName: 'Tegangan (Volt)',
    areaColor: 'rgba(236, 72, 153, 0.18)',
  },
  sunshine_hours_daily: {
    name: 'Lama Penyinaran (Sunshine)',
    unit: 'Jam',
    color: '#f59e0b', // Amber
    yAxisName: 'Durasi (Jam)',
    areaColor: 'rgba(245, 158, 11, 0.18)',
  },
  pv_normalized: {
    name: 'Normalisasi PV (PV_NORMALIZED)',
    unit: '%',
    color: '#0284c7', // Sky blue
    yAxisName: 'Normalisasi (%)',
    areaColor: 'rgba(2, 132, 199, 0.18)',
  },
};

function LuxComparisonChart({ logs = [], selectedDate, onDateChange, minDate, maxDate }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'
  const [metricKey, setMetricKey] = useState('p_pv'); // 'p_pv' | 'p_bat' | 'v_pv' | 'v_bat'
  const [localDate, setLocalDate] = useState('');

  const effectiveDate = localDate || selectedDate;

  const handleDateChange = (val) => {
    setLocalDate(val);
    if (onDateChange) onDateChange(val);
  };

  const filteredLogs = useMemo(() => filterLogsByPeriod(logs, period, effectiveDate), [logs, period, effectiveDate]);

  const activeConfig = METRIC_CONFIG[metricKey] || METRIC_CONFIG.p_pv;

  const option = useMemo(() => {
    const labels = filteredLogs.map(item => (
      period === 'harian' 
        ? (item.wibTimeStr || (item.timestamp && item.timestamp.length >= 16 ? item.timestamp.substring(11, 16) : item.timestamp || ''))
        : (item.wibShortDateStr || item.timestamp || '')
    ));

    const metricData = filteredLogs.map(item => item[metricKey] || 0);
    const luxData = filteredLogs.map(item => item.lux_val || 0);

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
        axisPointer: { type: 'cross', label: { backgroundColor: '#f59e0b' } },
        formatter: (params) => {
          let rel = `<b>${params[0]?.name || ''}</b><br/>`;
          params.forEach(p => {
            if (p.seriesName.includes('Lux')) {
              rel += `${p.marker} ${p.seriesName}: <b>${Number(p.value).toLocaleString('id-ID')} lx</b><br/>`;
            } else {
              rel += `${p.marker} ${p.seriesName}: <b>${p.value} ${activeConfig.unit}</b><br/>`;
            }
          });
          return rel;
        }
      },
      legend: {
        data: [activeConfig.name, 'Intensitas Cahaya (Lux)'],
        textStyle: { color: '#64748b', fontFamily: 'Inter' },
        top: 0,
        right: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '18%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      yAxis: [
        {
          type: 'value',
          name: activeConfig.yAxisName,
          nameTextStyle: { color: activeConfig.color, fontWeight: 'bold' },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
        },
        {
          type: 'value',
          name: 'Cahaya (Lux)',
          nameTextStyle: { color: '#d97706', fontWeight: 'bold' },
          splitLine: { show: false },
          axisLabel: {
            color: '#d97706',
            fontFamily: 'JetBrains Mono',
            formatter: (val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)
          }
        }
      ],
      series: [
        {
          name: activeConfig.name,
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          yAxisIndex: 0,
          lineStyle: { width: 3, color: activeConfig.color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: activeConfig.areaColor },
              { offset: 1, color: 'rgba(255, 255, 255, 0.0)' }
            ])
          },
          data: metricData
        },
        {
          name: 'Intensitas Cahaya (Lux)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          yAxisIndex: 1,
          lineStyle: { width: 2, color: '#f59e0b', type: 'dashed' },
          data: luxData
        }
      ]
    };
  }, [filteredLogs, period, metricKey, activeConfig]);

  return (
    <div className="white-card rounded-2xl p-6 lg:col-span-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SunMedium className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Komparasi Intensitas Cahaya (Lux) vs Parameter Energi
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400">
              Bandingkan kondisi cahaya matahari dengan parameter listrik pilihan Anda
            </p>
            {period === 'harian' && effectiveDate && (
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                {effectiveDate} ({filteredLogs.length} titik)
              </span>
            )}
          </div>
        </div>

        {/* Action Bar: Selector Dropdown & Period Tabs */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Date Picker (in Harian mode) */}
          {period === 'harian' && (
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-xl text-xs shadow-sm transition-all">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <input
                type="date"
                value={effectiveDate || ''}
                min={minDate}
                max={maxDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
                title="Pilih tanggal hari kemarin untuk melihat korelasi 10 menit"
              />
            </div>
          )}

          {/* Metric Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Bandingkan:</span>
            <select
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
              className="bg-transparent text-xs text-blue-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="p_pv">Daya PV (P_PV Watt)</option>
              <option value="p_bat">Daya Baterai (P_BAT Watt)</option>
              <option value="v_pv">Tegangan PV (V_PV Volt)</option>
              <option value="v_bat">Tegangan Baterai (V_BAT Volt)</option>
              <option value="pv_normalized">Normalisasi PV (PV_NORMALIZED %)</option>
              <option value="sunshine_hours_daily">Lama Penyinaran (Jam)</option>
            </select>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setPeriod('harian')}
              className={`px-3 py-1.5 rounded-lg transition-all ${period === 'harian' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriod('mingguan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${period === 'mingguan' ? 'bg-teal-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriod('bulanan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${period === 'bulanan' ? 'bg-purple-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Bulanan
            </button>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="h-72 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4 text-center">
          <Calendar className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">Tidak ada data sensor pada tanggal {effectiveDate}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Silakan pilih tanggal lain yang memiliki rekaman data.</p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
        </div>
      )}
    </div>
  );
}

export default React.memo(LuxComparisonChart);
