import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { filterLogsByPeriod } from '../services/solarService';

function VoltageEChart({ logs = [] }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'

  const filteredLogs = useMemo(() => filterLogsByPeriod(logs, period), [logs, period]);

  const option = useMemo(() => {
    const labels = filteredLogs.map(item => {
      if (period === 'harian') {
        return item.timestamp && item.timestamp.length >= 16 ? item.timestamp.substring(11, 16) : item.timestamp || '';
      }
      if (item.timestamp && item.timestamp.length >= 16) {
        return `${item.timestamp.substring(8, 10)}/${item.timestamp.substring(5, 7)} ${item.timestamp.substring(11, 16)}`;
      }
      return item.timestamp || '';
    });

    const vPvData = filteredLogs.map(item => item.v_pv || 0);
    const vBatData = filteredLogs.map(item => item.v_bat || 0);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        textStyle: { color: '#1e293b', fontFamily: 'Inter' },
        axisPointer: { type: 'cross', label: { backgroundColor: '#2563eb' } }
      },
      legend: {
        data: ['Tegangan PV (V_PV)', 'Tegangan Baterai (V_BAT)'],
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
      yAxis: {
        type: 'value',
        name: 'Tegangan (Volt)',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      series: [
        {
          name: 'Tegangan PV (V_PV)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#2563eb' },
          data: vPvData
        },
        {
          name: 'Tegangan Baterai (V_BAT)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#f59e0b' },
          data: vBatData
        }
      ]
    };
  }, [filteredLogs, period]);

  return (
    <div className="white-card rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Kurva Tegangan Solar vs Baterai</h2>
          <p className="text-xs text-slate-400">V_PV vs V_BAT (Volt)</p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 self-start sm:self-auto">
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

      <div className="h-72 w-full">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
      </div>
    </div>
  );
}

export default React.memo(VoltageEChart);
