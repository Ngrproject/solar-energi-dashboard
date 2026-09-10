import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatToWIB, formatToUTC } from '../services/solarService';

function RealTimeClock() {
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const wibClockStr = formatToWIB(nowTime).substring(11);
  const utcClockStr = formatToUTC(nowTime).substring(11);

  return (
    <div className="flex items-center gap-2 bg-white text-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm font-mono text-xs font-semibold">
      <Clock className="w-3.5 h-3.5 text-blue-600" />
      <div className="flex items-center gap-2">
        <span>WIB: <span className="text-blue-600 font-bold">{wibClockStr}</span></span>
        <span className="text-slate-300">|</span>
        <span>UTC: <span className="text-amber-600 font-bold">{utcClockStr}</span></span>
      </div>
    </div>
  );
}

export default React.memo(RealTimeClock);
