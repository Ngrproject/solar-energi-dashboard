<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solar Energy Monitoring Dashboard - 50Wp/100Wp</title>
    
    <!-- Google Fonts Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        dark: {
                            bg: '#090d16',
                            card: '#111827',
                            border: '#1f293d',
                            hover: '#1e293b',
                        },
                        pv: {
                            primary: '#38bdf8', // Sky Blue
                            glow: 'rgba(56, 189, 248, 0.25)',
                        },
                        bat: {
                            primary: '#10b981', // Emerald Green
                            glow: 'rgba(16, 185, 129, 0.25)',
                        },
                        solar: {
                            yellow: '#f59e0b', // Amber/Yellow
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Alpine.js CDN -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <style>
        body {
            background-color: #090d16;
            color: #f3f4f6;
            font-family: 'Inter', sans-serif;
        }
        .glass-card {
            background: rgba(17, 24, 39, 0.75);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .glow-online {
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
        }
        .glow-offline {
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
        }
        .glow-pv {
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
        }
        .glow-bat {
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }
        .glow-amber {
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
        }
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #090d16;
        }
        ::-webkit-scrollbar-thumb {
            background: #1f293d;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #374151;
        }
    </style>
</head>
<body class="min-h-screen pb-12 antialiased selection:bg-sky-500 selection:text-white">

    <div x-data="{ activeTab: 'dashboard' }" class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        <!-- HEADER BAR -->
        <header class="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-800/80 gap-4">
            <div>
                <div class="flex items-center gap-3">
                    <div class="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 glow-amber">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                            Solar Energy Monitoring System
                            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">50Wp / 100Wp</span>
                        </h1>
                        <p class="text-xs text-gray-400 mt-0.5">Real-Time ESP32 IoT Data Logging & Google Sheets Cloud Sync</p>
                    </div>
                </div>
            </div>

            <!-- Header Action Controls -->
            <div class="flex items-center gap-3 self-start md:self-auto">
                @if($isFallbackData)
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium" title="{{ $errorMessage }}">
                        <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <span>Fallback Local Mock Mode</span>
                    </div>
                @else
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Google Sheets Live Cloud</span>
                    </div>
                @endif

                <button onclick="window.location.reload()" class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700" title="Refresh Dashboard">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </button>
            </div>
        </header>

        <!-- PAGE NAVIGATION TABS BAR (PAGE 1: DASHBOARD, PAGE 2: DATA ENERGI) -->
        <nav class="flex items-center gap-2 my-6 bg-gray-900/80 p-1.5 rounded-2xl max-w-md border border-gray-800">
            <button 
                @click="activeTab = 'dashboard'"
                :class="activeTab === 'dashboard' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold scale-[1.02]' : 'text-gray-400 hover:text-white hover:bg-gray-800/60 font-semibold'"
                class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs transition-all duration-200"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
                Dashboard
            </button>

            <button 
                @click="activeTab = 'data'"
                :class="activeTab === 'data' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold scale-[1.02]' : 'text-gray-400 hover:text-white hover:bg-gray-800/60 font-semibold'"
                class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs transition-all duration-200"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                </svg>
                Data Energi
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-sky-400 border border-sky-500/20 font-bold">
                    {{ $paginatedLogs->total() }}
                </span>
            </button>
        </nav>

        <!-- PAGE 1: DASHBOARD VIEW (DIAGNOSTICS, SUMMARY CARDS, ECHARTS) -->
        <main x-show="activeTab === 'dashboard'" class="space-y-6">

        <!-- 1. SYSTEM DIAGNOSTIC & HEALTH PANEL (TOP WIDGET BAR) -->
        <section class="mt-2">
            <div class="glass-card rounded-2xl p-4 sm:p-5">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
                    <span class="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        System Diagnostic & Health Panel
                    </span>
                    <span class="text-xs text-gray-400 font-mono">Last Log: {{ $diagnostics['last_seen'] }}</span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

                    <!-- Status Alat -->
                    <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
                        <div class="text-[11px] text-gray-400 uppercase font-semibold">Status Koneksi</div>
                        <div class="mt-1.5 flex items-center gap-2">
                            @if($diagnostics['is_online'])
                                <span class="relative flex h-3 w-3">
                                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 glow-online"></span>
                                </span>
                                <span class="font-extrabold text-emerald-400 text-sm tracking-wide">ONLINE</span>
                            @else
                                <span class="relative flex h-3 w-3">
                                  <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500 glow-offline"></span>
                                </span>
                                <span class="font-extrabold text-rose-400 text-sm tracking-wide">OFFLINE</span>
                            @endif
                        </div>
                    </div>

                    <!-- ESP32 Uptime -->
                    <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
                        <div class="text-[11px] text-gray-400 uppercase font-semibold">ESP32 Uptime</div>
                        <div class="mt-1 font-mono text-sm font-bold text-sky-300">
                            {{ $diagnostics['uptime_formatted'] }}
                        </div>
                    </div>

                    <!-- Suhu Box / Internal -->
                    <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
                        <div class="text-[11px] text-gray-400 uppercase font-semibold">Suhu Box ESP</div>
                        <div class="mt-1 flex items-baseline gap-1">
                            <span class="text-lg font-bold font-mono text-amber-400">{{ $diagnostics['esp_temp'] }}</span>
                            <span class="text-xs text-gray-400">°C</span>
                            <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">{{ $diagnostics['temp_status'] }}</span>
                        </div>
                    </div>

                    <!-- Free Heap Memory -->
                    <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
                        <div class="text-[11px] text-gray-400 uppercase font-semibold">Free Heap RAM</div>
                        <div class="mt-1 flex items-baseline gap-1">
                            <span class="text-lg font-bold font-mono text-purple-400">{{ $diagnostics['free_heap_kb'] }}</span>
                            <span class="text-xs text-gray-400">KB</span>
                        </div>
                    </div>

                    <!-- Wi-Fi RSSI -->
                    <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
                        <div class="text-[11px] text-gray-400 uppercase font-semibold">Sinyal Wi-Fi</div>
                        <div class="mt-1 flex items-center justify-between">
                            <span class="text-sm font-bold font-mono text-gray-200">{{ $diagnostics['wifi_rssi'] }} <span class="text-xs font-normal text-gray-400">dBm</span></span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">{{ $diagnostics['wifi_quality'] }}</span>
                        </div>
                    </div>

                    <!-- SD Card Status -->
                    <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
                        <div class="text-[11px] text-gray-400 uppercase font-semibold">Status SD Card</div>
                        <div class="mt-1 flex items-center gap-1.5">
                            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span class="font-bold text-xs text-emerald-400 font-mono">{{ $diagnostics['sd_status'] }}</span>
                        </div>
                    </div>

                </div>
            </div>
        </section>


        <!-- 2. REAL-TIME METRIC CARDS -->
        <section class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">

            <!-- Card 1: PANEL SURYA (PV) METRICS -->
            <div class="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-sky-500/40 transition-all">
                <div class="absolute -right-8 -top-8 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all"></div>
                
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-sky-400"></span>
                        Panel Surya (PV Input)
                    </span>
                    <span class="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium">50Wp / 100Wp</span>
                </div>

                <div class="mt-4 flex items-baseline gap-2">
                    <span class="text-4xl font-extrabold font-mono text-white tracking-tight">{{ $summary['p_pv'] }}</span>
                    <span class="text-lg font-bold text-sky-400">Watt</span>
                </div>

                <div class="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/80">
                    <div>
                        <div class="text-xs text-gray-400">Tegangan (V_PV)</div>
                        <div class="text-lg font-bold font-mono text-gray-100 mt-0.5">{{ $summary['v_pv'] }} <span class="text-xs text-gray-400 font-normal">V</span></div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">Arus (I_PV)</div>
                        <div class="text-lg font-bold font-mono text-gray-100 mt-0.5">{{ $summary['i_pv'] }} <span class="text-xs text-gray-400 font-normal">A</span></div>
                    </div>
                </div>
            </div>

            <!-- Card 2: BATERAI (BATTERY) METRICS -->
            <div class="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div class="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Pengisian Baterai (BAT)
                    </span>
                    <span class="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                        {{ $summary['p_bat'] >= 0 ? 'CHARGING' : 'DISCHARGING' }}
                    </span>
                </div>

                <div class="mt-4 flex items-baseline gap-2">
                    <span class="text-4xl font-extrabold font-mono text-white tracking-tight">{{ $summary['p_bat'] }}</span>
                    <span class="text-lg font-bold text-emerald-400">Watt</span>
                </div>

                <div class="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/80">
                    <div>
                        <div class="text-xs text-gray-400">Tegangan (V_BAT)</div>
                        <div class="text-lg font-bold font-mono text-gray-100 mt-0.5">{{ $summary['v_bat'] }} <span class="text-xs text-gray-400 font-normal">V</span></div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">Arus (I_BAT)</div>
                        <div class="text-lg font-bold font-mono text-gray-100 mt-0.5">{{ $summary['i_bat'] }} <span class="text-xs text-gray-400 font-normal">A</span></div>
                    </div>
                </div>
            </div>

            <!-- Card 3: ENERGY ACCUMULATION & SYSTEM METRICS -->
            <div class="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div class="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
                
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                        Akumulasi Energi Harian
                    </span>
                    <span class="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">Hari Ini</span>
                </div>

                <div class="mt-4 flex items-baseline gap-2">
                    <span class="text-4xl font-extrabold font-mono text-white tracking-tight">{{ $summary['wh_pv_daily'] }}</span>
                    <span class="text-lg font-bold text-amber-400">Wh</span>
                </div>

                <div class="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/80">
                    <div>
                        <div class="text-xs text-gray-400">Efisiensi SCC</div>
                        <div class="text-lg font-bold font-mono text-gray-100 mt-0.5">{{ $summary['scc_eff'] }}<span class="text-xs text-gray-400">%</span></div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">Status Relay Load</div>
                        <div class="mt-1">
                            @if($summary['load_status'] === 'ON')
                                <span class="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">RELAY ON</span>
                            @else
                                <span class="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">RELAY OFF</span>
                            @endif
                        </div>
                    </div>
                </div>
            </div>

        </section>


        <!-- 3. INTERACTIVE CHARTS SECTION -->
        <section class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Chart 1: Kurva Daya Panel (p_pv) vs Daya Baterai (p_bat) -->
            <div class="glass-card rounded-2xl p-5 sm:p-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-200">Kurva Daya Solar vs Baterai</h2>
                        <p class="text-xs text-gray-400">Perbandingan P_PV vs P_BAT (Watt)</p>
                    </div>
                    <div class="flex items-center gap-3 text-xs">
                        <span class="flex items-center gap-1 text-sky-400 font-semibold">
                            <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Daya PV
                        </span>
                        <span class="flex items-center gap-1 text-emerald-400 font-semibold">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Daya Bat
                        </span>
                    </div>
                </div>
                <div class="h-72 w-full">
                    <canvas id="powerChartCanvas"></canvas>
                </div>
            </div>

            <!-- Chart 2: Kurva Tegangan Panel (v_pv) vs Tegangan Baterai (v_bat) -->
            <div class="glass-card rounded-2xl p-5 sm:p-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-200">Kurva Tegangan Solar vs Baterai</h2>
                        <p class="text-xs text-gray-400">Perbandingan V_PV vs V_BAT (Volt)</p>
                    </div>
                    <div class="flex items-center gap-3 text-xs">
                        <span class="flex items-center gap-1 text-sky-400 font-semibold">
                            <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Tegangan PV
                        </span>
                        <span class="flex items-center gap-1 text-amber-400 font-semibold">
                            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Tegangan Bat
                        </span>
                    </div>
                </div>
                <div class="h-72 w-full">
                    <canvas id="voltageChartCanvas"></canvas>
                </div>
            </div>

            <!-- Chart 3: Total Wh Harian (Bar Chart) -->
            <div class="glass-card rounded-2xl p-5 sm:p-6 lg:col-span-2">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-200">Total Akumulasi Energi Harian (Wh)</h2>
                        <p class="text-xs text-gray-400">Produksi Daya Solar Per Hari (Watt-Hour)</p>
                    </div>
                </div>
                <div class="h-64 w-full">
                    <canvas id="dailyWhChartCanvas"></canvas>
                </div>
            </div>

        </section>
        </main>


        <!-- PAGE 2: DATA ENERGI VIEW (DATA TABLE & CSV EXPORTER SECTION) -->
        <main x-show="activeTab === 'data'">
        <section class="mt-2">
            <div class="glass-card rounded-2xl p-5 sm:p-6">
                
                <!-- Filter Bar & Export CSV Trigger -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-800">
                    <div>
                        <h2 class="text-base font-bold text-white flex items-center gap-2">
                            Histori Data Log Solar IoT
                            <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 font-mono">{{ $paginatedLogs->total() }} Total Entri</span>
                        </h2>
                        <p class="text-xs text-gray-400 mt-0.5">Format log 100% presisi dengan penyimpanan Micro SD Card mikrokontroler ESP32.</p>
                    </div>

                    <!-- Date Filter Form & Export Button -->
                    <form method="GET" action="{{ route('dashboard') }}" class="flex flex-wrap items-center gap-3">
                        <div class="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800">
                            <label class="text-xs text-gray-400 font-medium">Dari:</label>
                            <input type="date" name="date_from" value="{{ $dateFrom }}" class="bg-transparent text-xs text-white focus:outline-none font-mono">
                        </div>

                        <div class="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800">
                            <label class="text-xs text-gray-400 font-medium">Sampai:</label>
                            <input type="date" name="date_to" value="{{ $dateTo }}" class="bg-transparent text-xs text-white focus:outline-none font-mono">
                        </div>

                        <button type="submit" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-sky-600/20">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                            </svg>
                            Filter
                        </button>

                        <a href="{{ route('solar.export', ['date_from' => $dateFrom, 'date_to' => $dateTo]) }}" 
                           class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                           title="Download CSV 100% Identik dengan Log SD Card">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Export / Download CSV
                        </a>
                    </form>
                </div>

                <!-- Log Data Table -->
                <div class="mt-4 overflow-x-auto rounded-xl border border-gray-800/80">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-gray-900/90 text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-800">
                            <tr>
                                <th class="p-3">Timestamp</th>
                                <th class="p-3">V_PV (V)</th>
                                <th class="p-3">I_PV (A)</th>
                                <th class="p-3 text-sky-400">P_PV (W)</th>
                                <th class="p-3 text-amber-400">Wh Daily</th>
                                <th class="p-3">V_BAT (V)</th>
                                <th class="p-3">I_BAT (A)</th>
                                <th class="p-3 text-emerald-400">P_BAT (W)</th>
                                <th class="p-3">SCC Eff (%)</th>
                                <th class="p-3">Load</th>
                                <th class="p-3">Uptime (s)</th>
                                <th class="p-3">Temp (°C)</th>
                                <th class="p-3">Wi-Fi (dBm)</th>
                                <th class="p-3">SD Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-800/60 font-mono text-gray-300">
                            @forelse($paginatedLogs as $log)
                                <tr class="hover:bg-gray-800/40 transition-colors">
                                    <td class="p-3 text-gray-200 font-semibold whitespace-nowrap">{{ $log['timestamp'] }}</td>
                                    <td class="p-3">{{ number_format($log['v_pv'], 2) }}</td>
                                    <td class="p-3">{{ number_format($log['i_pv'], 2) }}</td>
                                    <td class="p-3 text-sky-300 font-bold">{{ number_format($log['p_pv'], 2) }}</td>
                                    <td class="p-3 text-amber-300 font-bold">{{ number_format($log['wh_pv_daily'], 2) }}</td>
                                    <td class="p-3">{{ number_format($log['v_bat'], 2) }}</td>
                                    <td class="p-3">{{ number_format($log['i_bat'], 2) }}</td>
                                    <td class="p-3 text-emerald-300 font-bold">{{ number_format($log['p_bat'], 2) }}</td>
                                    <td class="p-3">{{ number_format($log['scc_eff'], 1) }}%</td>
                                    <td class="p-3 font-sans">
                                        @if($log['load_status'] === 'ON')
                                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ON</span>
                                        @else
                                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">OFF</span>
                                        @endif
                                    </td>
                                    <td class="p-3 text-gray-400">{{ $log['uptime_sec'] }}</td>
                                    <td class="p-3 text-amber-400 font-medium">{{ $log['esp_temp'] }}</td>
                                    <td class="p-3 text-gray-400">{{ $log['wifi_rssi'] }}</td>
                                    <td class="p-3 font-sans">
                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-emerald-400 border border-emerald-500/30">
                                            {{ $log['sd_status'] }}
                                        </span>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="14" class="p-8 text-center text-gray-500 font-sans">
                                        Tidak ada data log yang sesuai dengan filter tanggal.
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <!-- Custom Pagination Links & Per Page Selector Below Data Table -->
                <div class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-800/80 pt-4">
                    <form method="GET" action="{{ route('dashboard') }}" class="flex items-center gap-2">
                        <input type="hidden" name="date_from" value="{{ $dateFrom }}">
                        <input type="hidden" name="date_to" value="{{ $dateTo }}">
                        <div class="flex items-center gap-1.5 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs font-semibold text-gray-300">
                            <label class="text-xs text-gray-400 font-medium">Tampilkan:</label>
                            <select name="per_page" onchange="this.form.submit()" class="bg-transparent text-xs text-sky-400 font-bold focus:outline-none cursor-pointer font-mono">
                                <option value="15" {{ $perPage == 15 ? 'selected' : '' }}>15 / hal</option>
                                <option value="50" {{ $perPage == 50 ? 'selected' : '' }}>50 / hal</option>
                                <option value="100" {{ $perPage == 100 ? 'selected' : '' }}>100 / hal</option>
                            </select>
                        </div>
                    </form>

                    <div>
                        {{ $paginatedLogs->links() }}
                    </div>
                </div>

            </div>
        </section>
        </main>

        <!-- FOOTER -->
        <footer class="mt-12 text-center text-xs text-gray-500 border-t border-gray-800/80 pt-6">
            <p>Solar Panel Energy Monitoring System &copy; {{ date('Y') }} — Built with Laravel 11, Tailwind CSS & Google Sheets API</p>
        </footer>

    </div>


    <!-- CHART.JS INTEGRATION SCRIPT -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {

            // Global Chart Defaults for Dark Theme
            Chart.defaults.color = '#9ca3af';
            Chart.defaults.font.family = 'Inter, sans-serif';

            const powerData = @json($powerChart);
            const voltageData = @json($voltageChart);
            const dailyWhData = @json($dailyWhChart);

            // 1. POWER CHART (P_PV vs P_BAT)
            const ctxPower = document.getElementById('powerChartCanvas').getContext('2d');
            
            const gradPvPower = ctxPower.createLinearGradient(0, 0, 0, 300);
            gradPvPower.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
            gradPvPower.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

            const gradBatPower = ctxPower.createLinearGradient(0, 0, 0, 300);
            gradBatPower.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
            gradBatPower.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

            new Chart(ctxPower, {
                type: 'line',
                data: {
                    labels: powerData.labels,
                    datasets: [
                        {
                            label: 'Daya Solar (P_PV)',
                            data: powerData.p_pv,
                            borderColor: '#38bdf8',
                            backgroundColor: gradPvPower,
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 1.5,
                            pointHoverRadius: 5
                        },
                        {
                            label: 'Daya Baterai (P_BAT)',
                            data: powerData.p_bat,
                            borderColor: '#10b981',
                            backgroundColor: gradBatPower,
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 1.5,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#1f293d',
                            titleColor: '#f3f4f6',
                            bodyColor: '#e5e7eb',
                            borderColor: '#374151',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: { 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: true, text: 'Daya (Watt)', color: '#6b7280' }
                        }
                    }
                }
            });

            // 2. VOLTAGE CHART (V_PV vs V_BAT)
            const ctxVoltage = document.getElementById('voltageChartCanvas').getContext('2d');
            new Chart(ctxVoltage, {
                type: 'line',
                data: {
                    labels: voltageData.labels,
                    datasets: [
                        {
                            label: 'Tegangan PV (V)',
                            data: voltageData.v_pv,
                            borderColor: '#38bdf8',
                            fill: false,
                            tension: 0.3,
                            borderWidth: 2,
                            pointRadius: 1
                        },
                        {
                            label: 'Tegangan Bat (V)',
                            data: voltageData.v_bat,
                            borderColor: '#f59e0b',
                            fill: false,
                            tension: 0.3,
                            borderWidth: 2,
                            pointRadius: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#1f293d',
                            titleColor: '#f3f4f6',
                            bodyColor: '#e5e7eb',
                            borderColor: '#374151',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: { 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: true, text: 'Tegangan (Volt)', color: '#6b7280' }
                        }
                    }
                }
            });

            // 3. DAILY WH BAR CHART
            const ctxDailyWh = document.getElementById('dailyWhChartCanvas').getContext('2d');
            new Chart(ctxDailyWh, {
                type: 'bar',
                data: {
                    labels: dailyWhData.labels,
                    datasets: [{
                        label: 'Total Wh Daily',
                        data: dailyWhData.values,
                        backgroundColor: 'rgba(245, 158, 11, 0.65)',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1f293d',
                            titleColor: '#f3f4f6',
                            bodyColor: '#e5e7eb',
                            borderColor: '#374151',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: { 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: true, text: 'Energi (Wh)', color: '#6b7280' }
                        }
                    }
                }
            });

        });
    </script>
</body>
</html>
