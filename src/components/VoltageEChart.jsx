import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Calendar } from 'lucide-react';
import { filterLogsByPeriod } from '../services/solarService';

function VoltageEChart({ logs = [], selectedDate, onDateChange, minDate, maxDate }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'
  const [metric, setMetric] = useState('tegangan'); // 'tegangan' | 'arus' | 'semua'
  const [localDate, setLocalDate] = useState('');

  const effectiveDate = localDate || selectedDate;

  const handleDateChange = (val) => {
    setLocalDate(val);
    if (onDateChange) onDateChange(val);
  };

  const filteredLogs = useMemo(() => filterLogsByPeriod(logs, period, effectiveDate), [logs, period, effectiveDate]);

  const option = useMemo(() => {
    const labels = filteredLogs.map(item => (
      period === 'harian' 
        ? (item.wibTimeStr || (item.timestamp && item.timestamp.length >= 16 ? item.timestamp.substring(11, 16) : item.timestamp || ''))
        : (item.wibShortDateStr || item.timestamp || '')
    ));

    const vPvData = filteredLogs.map(item => item.v_pv || 0);
    const vBatData = filteredLogs.map(item => item.v_bat || 0);
    const iPvData = filteredLogs.map(item => item.i_pv || 0);
    const iBatData = filteredLogs.map(item => item.i_bat || 0);

    let legendData = [];
    let yAxisConfig = [];
    let seriesConfig = [];

    if (metric === 'tegangan') {
      legendData = ['Tegangan PV (V_PV)', 'Tegangan Baterai (V_BAT)'];
      yAxisConfig = {
        type: 'value',
        name: 'Tegangan (Volt)',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      };
      seriesConfig = [
        {
          name: 'Tegangan PV (V_PV)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2.5, color: '#2563eb' },
          valueFormatter: (value) => `${value} V`,
          data: vPvData
        },
        {
          name: 'Tegangan Baterai (V_BAT)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2.5, color: '#f59e0b' },
          valueFormatter: (value) => `${value} V`,
          data: vBatData
        }
      ];
    } else if (metric === 'arus') {
      legendData = ['Arus PV (I_PV)', 'Arus Baterai (I_BAT)'];
      yAxisConfig = {
        type: 'value',
        name: 'Arus (Ampere)',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      };
      seriesConfig = [
        {
          name: 'Arus PV (I_PV)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2.5, color: '#06b6d4' },
          valueFormatter: (value) => `${value} A`,
          data: iPvData
        },
        {
          name: 'Arus Baterai (I_BAT)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2.5, color: '#10b981' },
          valueFormatter: (value) => `${value} A`,
          data: iBatData
        }
      ];
    } else {
      // 'semua' (Dual Axis: Tegangan & Arus)
      legendData = ['Tegangan PV (V_PV)', 'Tegangan Baterai (V_BAT)', 'Arus PV (I_PV)', 'Arus Baterai (I_BAT)'];
      yAxisConfig = [
        {
          type: 'value',
          name: 'Tegangan (V)',
          nameTextStyle: { color: '#94a3b8' },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
        },
        {
          type: 'value',
          name: 'Arus (A)',
          nameTextStyle: { color: '#94a3b8' },
          splitLine: { show: false },
          axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
        }
      ];
      seriesConfig = [
        {
          name: 'Tegangan PV (V_PV)',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2.5, color: '#2563eb' },
          valueFormatter: (value) => `${value} V`,
          data: vPvData
        },
        {
          name: 'Tegangan Baterai (V_BAT)',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2.5, color: '#f59e0b' },
          valueFormatter: (value) => `${value} V`,
          data: vBatData
        },
        {
          name: 'Arus PV (I_PV)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2, color: '#06b6d4', type: 'dashed' },
          valueFormatter: (value) => `${value} A`,
          data: iPvData
        },
        {
          name: 'Arus Baterai (I_BAT)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2, color: '#10b981', type: 'dashed' },
          valueFormatter: (value) => `${value} A`,
          data: iBatData
        }
      ];
    }

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
        axisPointer: { type: 'cross', label: { backgroundColor: '#2563eb' } }
      },
      legend: {
        data: legendData,
        textStyle: { color: '#64748b', fontFamily: 'Inter' },
        top: 0,
        right: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      yAxis: yAxisConfig,
      series: seriesConfig
    };
  }, [filteredLogs, period, metric]);

  return (
    <div className="white-card rounded-2xl p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            {metric === 'tegangan' ? 'Kurva Tegangan Solar vs Baterai' : metric === 'arus' ? 'Kurva Arus Solar vs Baterai' : 'Kurva Tegangan & Arus Solar vs Baterai'}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400">
              {metric === 'tegangan' ? 'V_PV vs V_BAT (Volt)' : metric === 'arus' ? 'I_PV vs I_BAT (Ampere)' : 'V & I Solar vs Baterai (Volt & Ampere)'}
            </p>
            {period === 'harian' && effectiveDate && (
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                {effectiveDate} ({filteredLogs.length} titik)
              </span>
            )}
          </div>
        </div>

        {/* Action Controls: Date Input + Metric Selector & Period Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
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
                title="Pilih tanggal hari kemarin untuk melihat kurva detail 10 menit"
              />
            </div>
          )}

          {/* Metric Selector Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setMetric('tegangan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${metric === 'tegangan' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
              title="Tampilkan Tegangan (Volt)"
            >
              Tegangan (V)
            </button>
            <button
              onClick={() => setMetric('arus')}
              className={`px-3 py-1.5 rounded-lg transition-all ${metric === 'arus' ? 'bg-cyan-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
              title="Tampilkan Arus (Ampere)"
            >
              Arus (A)
            </button>
            <button
              onClick={() => setMetric('semua')}
              className={`px-3 py-1.5 rounded-lg transition-all ${metric === 'semua' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
              title="Tampilkan Dual Axis (Tegangan & Arus)"
            >
              Semua (V & A)
            </button>
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
          <p className="text-xs font-bold text-slate-600">Tidak ada data tegangan/arus pada tanggal {effectiveDate}</p>
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

export default React.memo(VoltageEChart);
