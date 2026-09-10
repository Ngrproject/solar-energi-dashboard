import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { calculateEnergyPeriods } from '../services/solarService';

function DailyWhEChart({ logs = [] }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'

  const energyData = useMemo(() => calculateEnergyPeriods(logs), [logs]);

  const { chartData, chartTitle, barColor, unitLabel, isKwh, displayValues } = useMemo(() => {
    let cd = energyData.dailyChart;
    let ct = 'Akumulasi Energi Harian (Reset 00:00)';
    let bc = '#2563eb';

    if (period === 'mingguan') {
      cd = energyData.weeklyChart;
      ct = 'Akumulasi Energi Mingguan';
      bc = '#0d9488'; // Teal
    } else if (period === 'bulanan') {
      cd = energyData.monthlyChart;
      ct = 'Akumulasi Energi Bulanan';
      bc = '#7c3aed'; // Purple
    }

    const maxVal = Math.max(0, ...(cd.values || [0]));
    const kwh = maxVal >= 1000;
    const dv = kwh
      ? cd.values.map(v => parseFloat((v / 1000).toFixed(2)))
      : cd.values;
    const ul = kwh ? 'kWh' : 'Wh';

    return {
      chartData: cd,
      chartTitle: ct,
      barColor: bc,
      unitLabel: ul,
      isKwh: kwh,
      displayValues: dv,
    };
  }, [energyData, period]);

  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        textStyle: { color: '#1e293b', fontFamily: 'Inter' },
        formatter: (params) => {
          const item = params[0];
          return `${item.name}<br/><b>${item.value} ${unitLabel}</b>`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      yAxis: {
        type: 'value',
        name: `Energi (${unitLabel})`,
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      series: [
        {
          name: `Total ${unitLabel} Accumulation`,
          type: 'bar',
          barWidth: '35%',
          itemStyle: {
            color: barColor,
            borderRadius: [6, 6, 0, 0]
          },
          data: displayValues
        }
      ]
    };
  }, [chartData, displayValues, unitLabel, barColor]);

  return (
    <div className="white-card rounded-2xl p-6 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{chartTitle}</h2>
          <p className="text-xs text-slate-400">Produksi Daya Solar Per {period === 'harian' ? 'Hari (Reset 00:00)' : period === 'mingguan' ? 'Minggu' : 'Bulan'} (Watt-Hour)</p>
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

      <div className="h-64 w-full">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
      </div>
    </div>
  );
}

export default React.memo(DailyWhEChart);
