import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Calendar } from 'lucide-react';
import { calculateEnergyPeriods } from '../services/solarService';

function DailyWhEChart({ logs = [], selectedDate, onDateChange, minDate, maxDate }) {
  const [period, setPeriod] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'
  const [localDate, setLocalDate] = useState('');

  const effectiveDate = localDate || selectedDate;

  const handleDateChange = (val) => {
    setLocalDate(val);
    if (onDateChange) onDateChange(val);
  };

  const energyData = useMemo(() => calculateEnergyPeriods(logs, effectiveDate), [logs, effectiveDate]);

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
    const hasSelected = period === 'harian' && Boolean(effectiveDate) && chartData.labels.includes(effectiveDate);

    // Format series items: selected bar is vibrant Royal Blue, other bars softly muted
    const seriesItems = displayValues.map((val, idx) => {
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
            color: 'rgba(37, 99, 235, 0.22)',
            borderRadius: [6, 6, 0, 0],
            borderWidth: 0,
            shadowBlur: 0
          }
        };
      }

      return {
        value: val,
        itemStyle: {
          color: barColor,
          borderRadius: [6, 6, 0, 0],
          borderWidth: 0,
          shadowBlur: 0
        }
      };
    });

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
          const isSelected = period === 'harian' && item.name === effectiveDate;
          return `<b>${item.name}</b> ${isSelected ? '<span style="color:#2563eb;font-weight:bold;">(Dipilih)</span>' : ''}<br/><b>${item.value} ${unitLabel}</b><br/><span style="font-size:10px;color:#64748b;">Klik untuk inspeksi detail 10 menit</span>`;
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
        axisLabel: {
          color: (value) => (period === 'harian' && value === effectiveDate ? '#2563eb' : '#94a3b8'),
          fontWeight: (value) => (period === 'harian' && value === effectiveDate ? 'bold' : 'normal'),
          fontFamily: 'JetBrains Mono'
        }
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
          data: seriesItems
        }
      ]
    };
  }, [chartData, displayValues, unitLabel, barColor, period, effectiveDate]);

  return (
    <div className="white-card rounded-2xl p-6 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{chartTitle}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400">Produksi Daya Solar Per {period === 'harian' ? 'Hari (Reset 00:00)' : period === 'mingguan' ? 'Minggu' : 'Bulan'} (Watt-Hour)</p>
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

export default React.memo(DailyWhEChart);

