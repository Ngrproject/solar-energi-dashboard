import React, { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, History, RotateCcw, Clock } from 'lucide-react';
import { formatIndonesianDate } from '../services/solarService';

export default function DailyDateFilterBar({
  selectedDate,
  onDateChange,
  availableDates = [],
  logs = [],
  latestDateStr = '',
}) {
  const minDate = availableDates[0] || '';
  const maxDate = availableDates[availableDates.length - 1] || '';

  const currentIndex = useMemo(() => {
    return availableDates.indexOf(selectedDate);
  }, [availableDates, selectedDate]);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex !== -1 && currentIndex < availableDates.length - 1;

  // Previous day in dataset
  const yesterdayDate = useMemo(() => {
    if (!latestDateStr) return '';
    const latestIdx = availableDates.indexOf(latestDateStr);
    if (latestIdx > 0) {
      return availableDates[latestIdx - 1];
    }
    return '';
  }, [availableDates, latestDateStr]);

  const isTodayOrLatest = selectedDate === latestDateStr;
  const isYesterday = selectedDate === yesterdayDate && yesterdayDate !== '';

  // Count logs for current selected day
  const dayLogsCount = useMemo(() => {
    if (!selectedDate || !logs) return 0;
    return logs.filter(l => l.wibDateStr === selectedDate).length;
  }, [selectedDate, logs]);

  const handlePrev = () => {
    if (canGoPrev) {
      onDateChange(availableDates[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onDateChange(availableDates[currentIndex + 1]);
    }
  };

  return (
    <div className="white-card rounded-2xl p-4 transition-all border border-slate-200/90 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Side: Info & Badge */}
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
            isTodayOrLatest
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {isTodayOrLatest ? <Calendar className="w-5 h-5" /> : <History className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                Pilih Tanggal Detail (Mode Harian):
              </span>

              {isTodayOrLatest ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Hari Ini (Terbaru)
                </span>
              ) : isYesterday ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Kemarin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Data Historis
                </span>
              )}

              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {dayLogsCount > 0 ? `${dayLogsCount} Data Poin (10 Mnt)` : 'Tidak Ada Data'}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
              <span>{formatIndonesianDate(selectedDate)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">Inspeksi kurva daya, tegangan, penyinaran, dan produksi Wh hari kemarin</span>
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Date Picker & Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">

          {/* Previous Day Button (<) */}
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            title="Hari Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Native HTML Date Input Styled Beautifully */}
          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-inner transition-colors">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <input
              type="date"
              value={selectedDate || ''}
              min={minDate}
              max={maxDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
              title="Ketik atau pilih tanggal dari kalender"
            />
          </div>

          {/* Next Day Button (>) */}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            title="Hari Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Quick Jump: Kemarin */}
          {yesterdayDate && yesterdayDate !== selectedDate && (
            <button
              onClick={() => onDateChange(yesterdayDate)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-colors shadow-sm"
            >
              Kemarin
            </button>
          )}

          {/* Quick Jump: Hari Ini / Terbaru */}
          {!isTodayOrLatest && latestDateStr && (
            <button
              onClick={() => onDateChange(latestDateStr)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors shadow-sm flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-blue-600" />
              <span>Hari Ini (Terbaru)</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
