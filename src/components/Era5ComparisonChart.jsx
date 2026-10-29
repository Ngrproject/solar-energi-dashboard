import React, { useMemo, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  LineChart,
  Layers,
  Sun,
  Scale,
  Sparkles,
} from 'lucide-react';

export default function Era5ComparisonChart({
  alignedData = [],
  timeZone = 'WIB',
}) {
  // Metric visibility selector
  // Default: Compare ERA5 with Daya PV (the 2 main metrics user requested)
  const [selectedParams, setSelectedParams] = useState({
    era5: true,
    p_pv: true,
    p_bat: false,
    lux: false,
  });

  // Scale mode:
  // 'separate': Independent Y-axes (Daya 0-100W on Left, ERA5 0-1000 W/m² on Right) -> Easiest to read!
  // 'normalized': 0 - 100% normalized view
  // 'shared': Single shared scale (0 - 1200)
  const [scaleMode, setScaleMode] = useState('separate');

  // Zoom preservation ref: stores user's current slider position so it NEVER resets back to start
  const zoomRangeRef = useRef({ start: 0, end: 35 });

  // Handle datazoom event to remember user's current timeline position
  const onEvents = useMemo(
    () => ({
      datazoom: (evt) => {
        const batch = evt.batch?.[0] || evt;
        if (batch.start !== undefined && batch.end !== undefined) {
          zoomRangeRef.current = {
            start: Math.round(batch.start),
            end: Math.round(batch.end),
          };
        }
      },
    }),
    []
  );

  // Toggle individual metric
  const toggleMetric = (key) => {
    setSelectedParams((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Ensure at least one metric remains active
      const activeCount = Object.values(next).filter(Boolean).length;
      if (activeCount === 0) return prev;
      return next;
    });
  };

  // Quick preset shortcuts
  const applyPreset = (preset) => {
    if (preset === 'pv') {
      setSelectedParams({ era5: true, p_pv: true, p_bat: false, lux: false });
      setScaleMode('separate');
    } else if (preset === 'bat') {
      setSelectedParams({ era5: true, p_pv: false, p_bat: true, lux: false });
      setScaleMode('separate');
    } else if (preset === 'lux') {
      setSelectedParams({ era5: true, p_pv: false, p_bat: false, lux: true });
      setScaleMode('separate');
    } else if (preset === 'all') {
      setSelectedParams({ era5: true, p_pv: true, p_bat: true, lux: true });
      setScaleMode('separate');
    }
  };

  const option = useMemo(() => {
    if (!alignedData || alignedData.length === 0) {
      return {
        title: {
          text: 'Belum ada data untuk ditampilkan',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#94a3b8', fontSize: 14, fontWeight: 'normal' },
        },
      };
    }

    const labels = alignedData.map((d) => d.displayTime);
    const hasPower = selectedParams.p_pv || selectedParams.p_bat;
    const hasEra5 = selectedParams.era5;
    const hasLux = selectedParams.lux;

    // Build Y-Axes dynamically according to scaleMode and selected parameters
    let yAxisConfig = [];
    let powerAxisIndex = 0;
    let era5AxisIndex = 0;
    let luxAxisIndex = 0;

    if (scaleMode === 'normalized') {
      // Single 0 - 100% Axis
      yAxisConfig = [
        {
          type: 'value',
          name: 'Normalisasi (%)',
          min: 0,
          max: 100,
          nameTextStyle: { color: '#64748b', fontSize: 11 },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
        },
      ];
      powerAxisIndex = 0;
      era5AxisIndex = 0;
      luxAxisIndex = 0;
    } else if (scaleMode === 'shared') {
      // Single shared scale
      yAxisConfig = [
        {
          type: 'value',
          name: 'Nilai Terpadu (W, W/m², lx)',
          min: 0,
          max: null,
          nameTextStyle: { color: '#64748b', fontSize: 11 },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', formatter: '{value}' },
        },
      ];
      powerAxisIndex = 0;
      era5AxisIndex = 0;
      luxAxisIndex = 0;
    } else {
      // 'separate' mode: Independent Y-axes so PV power (0-100W) is NOT squished by ERA5 (0-1000 W/m²)!
      let currentIndex = 0;

      if (hasPower) {
        powerAxisIndex = currentIndex++;
        yAxisConfig.push({
          type: 'value',
          name: 'Daya Listrik (Watt)',
          position: 'left',
          min: 0,
          max: null,
          nameTextStyle: { color: '#2563eb', fontWeight: 600, fontSize: 11 },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLine: { show: true, lineStyle: { color: '#2563eb' } },
          axisLabel: {
            color: '#2563eb',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: '{value} W',
          },
        });
      }

      if (hasEra5) {
        era5AxisIndex = currentIndex++;
        yAxisConfig.push({
          type: 'value',
          name: 'Radiasi ERA5 (W/m²)',
          position: hasPower ? 'right' : 'left',
          min: 0,
          max: null,
          nameTextStyle: { color: '#ea580c', fontWeight: 600, fontSize: 11 },
          splitLine: hasPower ? { show: false } : { lineStyle: { color: '#f1f5f9' } },
          axisLine: { show: true, lineStyle: { color: '#ea580c' } },
          axisLabel: {
            color: '#ea580c',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: '{value}',
          },
        });
      }

      if (hasLux) {
        luxAxisIndex = currentIndex++;
        const isOffset = hasPower && hasEra5;
        yAxisConfig.push({
          type: 'value',
          name: 'Sensor Lux (lx)',
          position: 'right',
          offset: isOffset ? 65 : 0,
          min: 0,
          max: null,
          nameTextStyle: { color: '#8b5cf6', fontWeight: 600, fontSize: 11 },
          splitLine: { show: false },
          axisLine: { show: true, lineStyle: { color: '#8b5cf6' } },
          axisLabel: {
            color: '#8b5cf6',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
          },
        });
      }

      // Fallback if no axes created
      if (yAxisConfig.length === 0) {
        yAxisConfig = [{ type: 'value' }];
      }
    }

    // Build series based on active metrics and scaleMode
    const seriesList = [];
    const isNorm = scaleMode === 'normalized';

    if (selectedParams.era5) {
      seriesList.push({
        name: isNorm ? 'Radiasi ERA5 (%)' : 'Radiasi ERA5 (W/m²)',
        type: 'line',
        yAxisIndex: era5AxisIndex,
        smooth: true,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 3, color: '#ea580c' },
        itemStyle: { color: '#ea580c' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(234, 88, 12, 0.22)' },
            { offset: 1, color: 'rgba(234, 88, 12, 0.00)' },
          ]),
        },
        data: alignedData.map((d) => (isNorm ? d.norm_era5 : d.era5_w_m2)),
      });
    }

    if (selectedParams.p_pv) {
      seriesList.push({
        name: isNorm ? 'Daya PV (%)' : 'Daya PV (Watt)',
        type: 'line',
        yAxisIndex: powerAxisIndex,
        smooth: true,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 2.8, color: '#2563eb' },
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37, 99, 235, 0.20)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.00)' },
          ]),
        },
        data: alignedData.map((d) => (isNorm ? d.norm_pv : d.watt_pv)),
      });
    }

    if (selectedParams.p_bat) {
      seriesList.push({
        name: isNorm ? 'Daya Baterai (%)' : 'Daya Baterai (Watt)',
        type: 'line',
        yAxisIndex: powerAxisIndex,
        smooth: true,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 2.2, color: '#10b981', type: 'dashed' },
        itemStyle: { color: '#10b981' },
        data: alignedData.map((d) => (isNorm ? d.norm_bat : d.watt_bat)),
      });
    }

    if (selectedParams.lux) {
      seriesList.push({
        name: isNorm ? 'Sensor Lux (%)' : 'Sensor Lux (lx)',
        type: 'line',
        yAxisIndex: luxAxisIndex,
        smooth: true,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 2, color: '#8b5cf6', type: 'dotted' },
        itemStyle: { color: '#8b5cf6' },
        data: alignedData.map((d) => (isNorm ? d.norm_lux : d.lux)),
      });
    }

    const hasOffsetRightAxis = scaleMode === 'separate' && hasPower && hasEra5 && hasLux;

    return {
      backgroundColor: 'transparent',
      animationDuration: 250,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: [12, 16],
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        textStyle: { color: '#1e293b', fontFamily: 'Inter, sans-serif', fontSize: 12 },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#94a3b8', type: 'dashed' },
          crossStyle: { color: '#3b82f6' },
        },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const item = alignedData[idx];
          if (!item) return '';

          let html = `
            <div style="font-weight: 700; margin-bottom: 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: flex; justify-content: space-between; gap: 16px;">
              <span>🕒 ${item.displayTime} (${timeZone})</span>
              <span style="font-size: 10px; color: #64748b; font-weight: normal;">${item.sample_count} sampel</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
          `;

          if (selectedParams.era5) {
            html += `
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span style="color: #ea580c; font-weight: 600;">☀️ Radiasi ERA5:</span>
                <span style="font-weight: 700; font-family: monospace;">${item.era5_w_m2.toFixed(1)} W/m²</span>
              </div>
            `;
          }

          if (selectedParams.p_pv) {
            html += `
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span style="color: #2563eb; font-weight: 600;">⚡ Daya PV (P_PV):</span>
                <span style="font-weight: 700; font-family: monospace;">${item.watt_pv.toFixed(2)} W</span>
              </div>
            `;
          }

          if (selectedParams.p_bat) {
            html += `
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span style="color: #10b981; font-weight: 600;">🔋 Daya Baterai:</span>
                <span style="font-weight: 700; font-family: monospace;">${item.watt_bat.toFixed(2)} W</span>
              </div>
            `;
          }

          if (selectedParams.lux) {
            html += `
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span style="color: #8b5cf6; font-weight: 600;">💡 Sensor Lux:</span>
                <span style="font-weight: 700; font-family: monospace;">${item.lux.toLocaleString()} lx</span>
              </div>
            `;
          }

          if (item.era5_w_m2 > 0 && selectedParams.p_pv) {
            const ratio = (item.watt_pv / item.era5_w_m2).toFixed(3);
            html += `
              <div style="margin-top: 8px; pt: 6px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: #475569; display: flex; justify-content: space-between;">
                <span>Rasio Daya / Radiasi:</span>
                <span style="font-weight: 700; color: #0284c7;">${ratio} W / (W/m²)</span>
              </div>
            `;
          }

          html += `</div>`;
          return html;
        },
      },
      legend: {
        show: true,
        top: 6,
        right: 16,
        textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        icon: 'circle',
        itemGap: 16,
      },
      grid: {
        left: hasPower ? '4%' : '3%',
        right: hasOffsetRightAxis ? '9%' : '5%',
        bottom: '12%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (value) => {
            if (value && value.length >= 16) {
              return `${value.substring(8, 10)}/${value.substring(5, 7)}\n${value.substring(11, 16)}`;
            }
            return value;
          },
        },
      },
      yAxis: yAxisConfig,
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: zoomRangeRef.current.start,
          end: zoomRangeRef.current.end,
          bottom: 4,
          height: 24,
          borderColor: '#cbd5e1',
          fillerColor: 'rgba(37, 99, 235, 0.12)',
          handleStyle: { color: '#2563eb' },
          textStyle: { color: '#64748b', fontSize: 10 },
        },
        {
          type: 'inside',
          xAxisIndex: [0],
        },
      ],
      series: seriesList,
    };
  }, [alignedData, selectedParams, scaleMode, timeZone]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      {/* Header and Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
              <Sun className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Kurva Komparasi Per Jam: Satelit ERA5 vs Sensor Sistem
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pilih parameter dan skala komparasi yang diinginkan untuk membandingkan bentuk kurva secara presisi ({timeZone}).
          </p>
        </div>

        {/* Scale Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start lg:self-auto text-xs font-semibold">
          <button
            onClick={() => setScaleMode('separate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${scaleMode === 'separate'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
            title="Sumbu Daya (0-100W) di kiri dan Radiasi (0-1000 W/m²) di kanan agar kurva tidak tenggelam"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Skala Mandiri (Ideal)</span>
          </button>
          <button
            onClick={() => setScaleMode('normalized')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${scaleMode === 'normalized'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
            title="Skala persentase 0-100% untuk membandingkan bentuk gelombang"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Normalisasi (%)</span>
          </button>
          <button
            onClick={() => setScaleMode('shared')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${scaleMode === 'shared'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
            title="Satu sumbu nilai asli gabungan"
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Satu Sumbu</span>
          </button>
        </div>
      </div>

      {/* PARAMETER SELECTOR BAR (Presets & Checkbox Pills) */}
      <div className="mt-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-semibold text-[11px] mr-1">Preset Komparasi:</span>
          <button
            onClick={() => applyPreset('pv')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${selectedParams.era5 && selectedParams.p_pv && !selectedParams.p_bat && !selectedParams.lux
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            ⚡ ERA5 vs Daya PV
          </button>
          <button
            onClick={() => applyPreset('bat')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${selectedParams.era5 && !selectedParams.p_pv && selectedParams.p_bat && !selectedParams.lux
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            🔋 ERA5 vs Baterai
          </button>
          <button
            onClick={() => applyPreset('lux')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${selectedParams.era5 && !selectedParams.p_pv && !selectedParams.p_bat && selectedParams.lux
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            💡 ERA5 vs Lux
          </button>
          <button
            onClick={() => applyPreset('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${selectedParams.era5 && selectedParams.p_pv && selectedParams.p_bat && selectedParams.lux
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            ☀️ Semua (4 Parameter)
          </button>
        </div>

        {/* Individual Checkbox Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
          <span className="text-slate-500 font-semibold text-[11px] mr-1">Pilih Manual:</span>
          {/* ERA5 */}
          <button
            onClick={() => toggleMetric('era5')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${selectedParams.era5
                ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedParams.era5 ? 'bg-orange-600' : 'bg-slate-300'}`}></span>
            <span>Radiasi ERA5</span>
          </button>

          {/* PV */}
          <button
            onClick={() => toggleMetric('p_pv')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${selectedParams.p_pv
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedParams.p_pv ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
            <span>Daya PV (Watt)</span>
          </button>

          {/* BAT */}
          <button
            onClick={() => toggleMetric('p_bat')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${selectedParams.p_bat
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedParams.p_bat ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            <span>Daya Baterai</span>
          </button>

          {/* LUX */}
          <button
            onClick={() => toggleMetric('lux')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${selectedParams.lux
                ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedParams.lux ? 'bg-purple-500' : 'bg-slate-300'}`}></span>
            <span>Sensor Lux</span>
          </button>
        </div>
      </div>

      {/* Chart Container */}
      {alignedData.length === 0 ? (
        <div className="h-[430px] w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 text-center mt-3">
          <Sun className="w-10 h-10 text-slate-300 mb-2 animate-pulse" />
          <p className="text-xs font-bold text-slate-600">Belum ada data untuk ditampilkan</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Silakan unggah berkas CSV ERA5 atau klik "Muat Sampel ERA5 Cilacap".
          </p>
        </div>
      ) : (
        <div className="w-full h-[430px] mt-3">
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            onEvents={onEvents}
            notMerge={true}
          />
        </div>
      )}

      {/* Scale Explanation Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            {scaleMode === 'separate' ? (
              <span>
                <strong>Mode Skala Mandiri Aktif:</strong> Daya PV (0-100W) menggunakan sumbu kiri dan Radiasi ERA5 (0-1000 W/m²) menggunakan sumbu kanan sehingga kedua kurva dapat dibandingkan dengan tinggi proporsional.
              </span>
            ) : scaleMode === 'normalized' ? (
              <span>
                <strong>Mode Normalisasi Aktif:</strong> Semua data diskalakan ke 0 - 100% dari nilai puncaknya untuk membandingkan bentuk kurva secara langsung.
              </span>
            ) : (
              <span>
                <strong>Mode Satu Sumbu:</strong> Menampilkan nilai asli semua parameter dalam satu sumbu bersama.
              </span>
            )}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Posisi zoom tersimpan otomatis saat digeser
        </div>
      </div>
    </div>
  );
}
