import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { calculateSunshinePeriods } from '../services/solarService';
import { SunDim, Calendar } from 'lucide-react';

function SunshineEChart({ logs = [], selectedDate, onDateChange, minDate, maxDate }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'
  const [localDate, setLocalDate] = useState('');

  const effectiveDate = localDate || selectedDate;

  const handleDateChange = (val) => {
    setLocalDate(val);
    if (onDateChange) onDateChange(val);
  };

  const sunshineData = useMemo(() => calculateSunshinePeriods(logs, effectiveDate), [logs, effectiveDate]);

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
    const hasSelected = period === 'harian' && Boolean(effectiveDate) && chartData.labels.includes(effectiveDate);

    // Format series items: selected bar is vibrant gold/amber, other bars softly muted
    const seriesItems = chartData.values.map((val, idx) => {
      const labelDate = chartData.labels[idx];
      const isSelected = period === 'harian' && labelDate === effectiveDate;

      if (isSelected) {
        return {
          value: val,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1d4ed8' }
            ]),
            borderRadius: [6, 6, 0, 0],
            borderWidth: 0,
            shadowBlur: 0
          }
        };
      }

      if (hasSelected) {
        return {
          value: val,
          itemStyle: {
            color: 'rgba(245, 158, 11, 0.22)',
            borderRadius: [6, 6, 0, 0],
            borderWidth: 0,
            shadowBlur: 0
          }
        };
      }

      return {
        value: val,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: barColor },
            { offset: 1, color: gradientColor }
          ]),
          borderRadius: [6, 6, 0, 0],
          borderWidth: 0,
          shadowBlur: 0
        }
      };
    });

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
          const isSelected = period === 'harian' && item.name === effectiveDate;
          return `<b>${item.name}</b> ${isSelected ? '<span style="color:#2563eb;font-weight:bold;">(Dipilih)</span>' : ''}<br/>Lama Penyinaran: <b>${item.value} Jam</b><br/><span style="font-size:10px;color:#64748b;">Klik untuk inspeksi detail 10 menit</span>`;
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
        axisLabel: {
          color: (value) => (period === 'harian' && value === effectiveDate ? '#2563eb' : '#64748b'),
          fontWeight: (value) => (period === 'harian' && value === effectiveDate ? 'bold' : 'normal'),
          fontFamily: 'JetBrains Mono'
        }
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
          data: seriesItems
        }
      ]
    };
  }, [chartData, barColor, gradientColor, period, effectiveDate]);

  return (
    <div className="white-card rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SunDim className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{chartTitle}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400">Total jam durasi penyinaran efektif matahari (sunshine duration in hours)</p>
            {period === 'harian' && effectiveDate && (
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Terpilih: {effectiveDate}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls: Date Input + Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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
                title="Pilih tanggal hari kemarin untuk disorot dan diinspeksi"
              />
            </div>
          )}

          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
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
      </div>

      <div className="h-64 w-full">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
          onEvents={{
            click: (params) => {
              if (params.name && onDateChange && period === 'harian') {
                handleDateChange(params.name);
              }
            }
          }}
        />
      </div>
    </div>
  );
}

export default React.memo(SunshineEChart);

