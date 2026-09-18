import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { calculateSunshinePeriods } from '../services/solarService';
import { SunDim } from 'lucide-react';

function SunshineEChart({ logs = [] }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'

  const sunshineData = useMemo(() => calculateSunshinePeriods(logs), [logs]);

  const { chartData, chartTitle, barColor, gradientColor } = useMemo(() => {
    let cd = sunshineData.dailyChart;
    let ct = 'Lama Penyinaran Matahari Harian (Reset 00:00)';
    let bc = '#f59e0b';
    let gc = 'rgba(245, 158, 11, 0.25)';

    if (period === 'mingguan') {
      cd = sunshineData.weeklyChart;
      ct = 'Lama Penyinaran Matahari Mingguan';
      bc = '#d97706';
      gc = 'rgba(217, 119, 6, 0.25)';
    } else if (period === 'bulanan') {
      cd = sunshineData.monthlyChart;
      ct = 'Lama Penyinaran Matahari Bulanan';
      bc = '#ea580c';
      gc = 'rgba(234, 88, 12, 0.25)';
    }

    return {
      chartData: cd,
      chartTitle: ct,
      barColor: bc,
      gradientColor: gc,
    };
  }, [sunshineData, period]);

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
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params[0];
          return `<b>${item.name}</b><br/>Lama Penyinaran: <b>${item.value} Jam</b>`;
        }
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
        data: chartData.labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      yAxis: {
        type: 'value',
        name: 'Durasi (Jam)',
        nameTextStyle: { color: '#d97706', fontWeight: 'bold' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      series: [
        {
          name: 'Sunshine Duration',
          type: 'bar',
          barWidth: '35%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: barColor },
              { offset: 1, color: gradientColor }
            ]),
            borderRadius: [6, 6, 0, 0]
          },
          data: chartData.values
        }
      ]
    };
  }, [chartData, barColor, gradientColor]);

  return (
    <div className="white-card rounded-2xl p-6 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SunDim className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{chartTitle}</h2>
          </div>
          <p className="text-xs text-slate-400">Total jam durasi penyinaran efektif matahari (sunshine duration in hours)</p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 self-start sm:self-auto">
          <button
            onClick={() => setPeriod('harian')}
            className={`px-3 py-1.5 rounded-lg transition-all ${period === 'harian' ? 'bg-amber-500 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
          >
            Harian
          </button>
          <button
            onClick={() => setPeriod('mingguan')}
            className={`px-3 py-1.5 rounded-lg transition-all ${period === 'mingguan' ? 'bg-amber-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
          >
            Mingguan
          </button>
          <button
            onClick={() => setPeriod('bulanan')}
            className={`px-3 py-1.5 rounded-lg transition-all ${period === 'bulanan' ? 'bg-orange-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
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

export default React.memo(SunshineEChart);
