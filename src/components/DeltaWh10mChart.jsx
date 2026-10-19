import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { TrendingUp, Calendar } from 'lucide-react';
import { filterLogsByPeriod } from '../services/solarService';

function DeltaWh10mChart({ logs = [], selectedDate, onDateChange, minDate, maxDate }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'
  const [localDate, setLocalDate] = useState('');

  const effectiveDate = localDate || selectedDate;

  const handleDateChange = (val) => {
    setLocalDate(val);
    if (onDateChange) onDateChange(val);
  };

  const filteredLogs = useMemo(() => filterLogsByPeriod(logs, period, effectiveDate), [logs, period, effectiveDate]);

  const chartData = useMemo(() => {
    if (!filteredLogs || filteredLogs.length === 0) return { labels: [], values: [] };

    const labels = [];
    const values = [];

    for (let i = 0; i < filteredLogs.length; i++) {
      const item = filteredLogs[i];
      const timeLabel = period === 'harian'
        ? (item.wibTimeStr || (item.timestamp && item.timestamp.length >= 16 ? item.timestamp.substring(11, 16) : item.timestamp || ''))
        : (item.wibShortDateStr || item.timestamp || '');

      let delta = 0;
      if (i > 0) {
        const prev = filteredLogs[i - 1];
        const diff = Number(item.wh_pv_daily || 0) - Number(prev.wh_pv_daily || 0);
        if (diff >= 0 && diff < 300) {
          delta = diff;
        } else {
          // Fallback to power-based calculation if log reset or day boundary occurred
          delta = (Number(item.p_pv || 0) * 10) / 60;
        }
      } else {
        delta = (Number(item.p_pv || 0) * 10) / 60;
      }

      labels.push(timeLabel);
      values.push(parseFloat(delta.toFixed(2)));
    }

    return { labels, values };
  }, [filteredLogs, period]);

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
          return `<b>${item.name}</b><br/>Perubahan Wh (10m): <b style="color:#10b981">+${item.value} Wh</b>`;
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
        name: 'Δ Wh (10 Mnt)',
        nameTextStyle: { color: '#059669', fontWeight: 'bold' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono' }
      },
      series: [
        {
          name: 'Delta Wh (10 Mnt)',
          type: 'bar',
          barWidth: '45%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.2)' }
            ]),
            borderRadius: [4, 4, 0, 0]
          },
          data: chartData.values
        }
      ]
    };
  }, [chartData]);

  return (
    <div className="white-card rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Grafik Delta Wh Per 10 Menit
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400">Pertambahan energi tergenerasi setiap interval 10 menit (Wh)</p>
            {period === 'harian' && effectiveDate && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                {effectiveDate} ({filteredLogs.length} titik)
              </span>
            )}
          </div>
        </div>

        {/* Action Controls: Date Input (in Harian mode) + Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {period === 'harian' && (
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-xl text-xs shadow-sm transition-all">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <input
                type="date"
                value={effectiveDate || ''}
                min={minDate}
                max={maxDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
                title="Pilih tanggal hari kemarin untuk melihat pertambahan Wh interval 10 menit"
              />
            </div>
          )}

          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setPeriod('harian')}
              className={`px-3 py-1.5 rounded-lg transition-all ${period === 'harian' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
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
              className={`px-3 py-1.5 rounded-lg transition-all ${period === 'bulanan' ? 'bg-emerald-700 text-white shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Bulanan
            </button>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="h-64 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4 text-center">
          <Calendar className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">Tidak ada data delta Wh pada tanggal {effectiveDate}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Silakan pilih tanggal lain yang memiliki rekaman data.</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
        </div>
      )}
    </div>
  );
}

export default React.memo(DeltaWh10mChart);

