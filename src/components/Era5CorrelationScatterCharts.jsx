import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, Zap, Sun, Battery } from 'lucide-react';
import { getCorrelationStrength } from '../services/era5Service';

function SingleScatterPlot({
  title,
  xName,
  yName,
  color,
  points = [],
  regression = { m: 0, c: 0 },
  r = 0,
  r2 = 0,
  icon: Icon,
}) {
  const strength = getCorrelationStrength(r);

  const option = useMemo(() => {
    if (!points || points.length === 0) {
      return {
        title: {
          text: 'Tidak ada data',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#94a3b8', fontSize: 12 },
        },
      };
    }

    const scatterData = points.map((p) => [p.x, p.y, p.time, p.samples]);

    // Generate linear regression line points
    const xVals = points.map((p) => p.x);
    const minX = Math.min(...xVals, 0);
    const maxX = Math.max(...xVals, 100);

    const lineData = [
      [minX, parseFloat((regression.m * minX + regression.c).toFixed(2))],
      [maxX, parseFloat((regression.m * maxX + regression.c).toFixed(2))],
    ];

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      grid: {
        left: '4%',
        right: '6%',
        bottom: '12%',
        top: '12%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: [8, 12],
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        textStyle: { color: '#1e293b', fontSize: 11 },
        formatter: (params) => {
          if (params.seriesType === 'line') {
            return `
              <div style="font-weight: 700; color: #475569;">Garis Regresi Linear</div>
              <div style="font-size: 10px; color: #64748b;">y = ${regression.m.toFixed(4)}x + ${regression.c.toFixed(2)}</div>
            `;
          }
          const [xVal, yVal, timeStr, samples] = params.value;
          return `
            <div style="font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px; margin-bottom: 4px;">
              🕒 ${timeStr || '-'}
            </div>
            <div>${xName}: <strong>${xVal}</strong></div>
            <div>${yName}: <strong>${yVal}</strong></div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Sampel sensor: ${samples || 6}</div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: xName,
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
      },
      yAxis: {
        type: 'value',
        name: yName,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
      },
      series: [
        {
          name: 'Data Observasi',
          type: 'scatter',
          symbolSize: 7,
          itemStyle: {
            color: color,
            opacity: 0.75,
            borderColor: '#ffffff',
            borderWidth: 0.5,
          },
          data: scatterData,
        },
        {
          name: 'Regresi Linear',
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: '#dc2626',
            width: 2,
            type: 'dashed',
          },
          data: lineData,
        },
      ],
    };
  }, [points, regression, xName, yName, color]);

  return (
    <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-slate-600" />}
            <h4 className="text-xs font-bold text-slate-800">{title}</h4>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${strength.badgeBg}`}>
            r = {r > 0 ? `+${r}` : r}
          </span>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center justify-between text-[11px] bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs mb-2">
          <span className="text-slate-500 font-medium">Koefisien Determinasi (R²):</span>
          <span className="font-mono font-bold text-slate-800">{(r2 * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Plot container */}
      {points.length === 0 ? (
        <div className="w-full h-[220px] flex items-center justify-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
          Belum ada data
        </div>
      ) : (
        <div className="w-full h-[220px]">
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        </div>
      )}

      <div className="text-[10px] text-slate-400 text-center mt-1">
        Model: y = {regression.m.toFixed(4)}x + {regression.c.toFixed(2)}
      </div>
    </div>
  );
}

export default function Era5CorrelationScatterCharts({ alignedData = [], stats }) {
  const pvPoints = useMemo(() => {
    return alignedData.map((d) => ({
      x: d.era5_w_m2,
      y: d.watt_pv,
      time: d.displayTime,
      samples: d.sample_count,
    }));
  }, [alignedData]);

  const batPoints = useMemo(() => {
    return alignedData.map((d) => ({
      x: d.era5_w_m2,
      y: d.watt_bat,
      time: d.displayTime,
      samples: d.sample_count,
    }));
  }, [alignedData]);

  const luxPoints = useMemo(() => {
    return alignedData.map((d) => ({
      x: d.era5_w_m2,
      y: d.lux,
      time: d.displayTime,
      samples: d.sample_count,
    }));
  }, [alignedData]);

  if (!stats) return null;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Diagram Pencar Korelasi (Scatter Plots & Trendline)
          </h3>
          <p className="text-xs text-slate-500">
            Visualisasi hubungan linear antara Radiasi Satelit ERA5 dengan setiap parameter sensor telemetri.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SingleScatterPlot
          title="ERA5 vs Daya PV (Watt)"
          xName="Radiasi ERA5 (W/m²)"
          yName="Daya PV (W)"
          color="#2563eb"
          points={pvPoints}
          regression={stats.reg_pv}
          r={stats.r_pv}
          r2={stats.r2_pv}
          icon={Zap}
        />
        <SingleScatterPlot
          title="ERA5 vs Daya Baterai (Watt)"
          xName="Radiasi ERA5 (W/m²)"
          yName="Daya Baterai (W)"
          color="#10b981"
          points={batPoints}
          regression={stats.reg_bat}
          r={stats.r_bat}
          r2={stats.r2_bat}
          icon={Battery}
        />
        <SingleScatterPlot
          title="ERA5 vs Sensor Cahaya (Lux)"
          xName="Radiasi ERA5 (W/m²)"
          yName="Sensor Lux (lx)"
          color="#8b5cf6"
          points={luxPoints}
          regression={stats.reg_lux}
          r={stats.r_lux}
          r2={stats.r2_lux}
          icon={Sun}
        />
      </div>
    </div>
  );
}

