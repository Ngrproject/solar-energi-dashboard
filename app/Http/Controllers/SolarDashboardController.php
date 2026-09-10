<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Revolution\Google\Sheets\Facades\Sheets;
use Carbon\Carbon;
use Exception;

class SolarDashboardController extends Controller
{
    /**
     * Spreadsheet ID default from project configuration.
     */
    protected string $spreadsheetId;
    protected string $sheetName;

    public function __construct()
    {
        $this->spreadsheetId = config('sheets.connections.service_account.spreadsheet_id', '1tNRnoSC2yC3ejFei0OsqDqz2w4rHcmbnRGLwnv9aRXc');
        $this->sheetName = config('sheets.connections.service_account.sheet_id', 'Sheet1');
    }

    /**
     * Main Dashboard Index Method.
     */
    public function index(Request $request)
    {
        $dateFrom = $request->query('date_from', Carbon::now()->subDays(2)->format('Y-m-d'));
        $dateTo = $request->query('date_to', Carbon::now()->format('Y-m-d'));
        $page = (int) $request->query('page', 1);
        $perPage = 15;

        $isFallbackData = false;
        $errorMessage = null;

        // Fetch logs from Google Sheets or Fallback
        try {
            $rawRows = $this->fetchFromGoogleSheets();
            if (empty($rawRows) || count($rawRows) <= 1) {
                throw new Exception("Google Sheets returned no log records.");
            }
            $allLogs = $this->parseRowsToCollection($rawRows);
        } catch (Exception $e) {
            Log::warning("SolarDashboard - Google Sheets API Exception: " . $e->getMessage());
            $isFallbackData = true;
            $errorMessage = $e->getMessage();
            $allLogs = $this->generateMockLogs();
        }

        // Sort logs chronologically (newest last for calculation, newest first for table)
        $sortedChronological = $allLogs->sortBy('timestamp_parsed')->values();

        // System Diagnostic & Health Panel (based on latest record)
        $latestRecord = $sortedChronological->last() ?? $this->getEmptyRecord();
        $diagnostics = $this->calculateDiagnostics($latestRecord);

        // Summary Real-Time Cards Metrics
        $summary = $this->calculateSummaryMetrics($latestRecord, $sortedChronological);

        // Filter logs based on date range for charts and table
        $filteredLogs = $sortedChronological->filter(function ($item) use ($dateFrom, $dateTo) {
            if (!$item['timestamp_parsed']) return true;
            $dateStr = $item['timestamp_parsed']->format('Y-m-d');
            return $dateStr >= $dateFrom && $dateStr <= $dateTo;
        })->values();

        // If filtering results in empty, use all logs for charts
        $chartSource = $filteredLogs->isNotEmpty() ? $filteredLogs : $sortedChronological;

        // Chart Data Preparation
        $powerChart = [
            'labels' => $chartSource->map(fn($item) => $item['timestamp_parsed'] ? $item['timestamp_parsed']->format('H:i') : $item['timestamp'])->toArray(),
            'p_pv' => $chartSource->pluck('p_pv')->toArray(),
            'p_bat' => $chartSource->pluck('p_bat')->toArray(),
        ];

        $voltageChart = [
            'labels' => $chartSource->map(fn($item) => $item['timestamp_parsed'] ? $item['timestamp_parsed']->format('H:i') : $item['timestamp'])->toArray(),
            'v_pv' => $chartSource->pluck('v_pv')->toArray(),
            'v_bat' => $chartSource->pluck('v_bat')->toArray(),
        ];

        // Daily Wh Accumulation Bar Chart (Grouping max wh_pv_daily per day)
        $dailyWhGrouped = $sortedChronological->groupBy(function ($item) {
            return $item['timestamp_parsed'] ? $item['timestamp_parsed']->format('Y-m-d') : 'Unknown';
        })->map(function ($group) {
            return round($group->max('wh_pv_daily'), 2);
        });

        $dailyWhChart = [
            'labels' => $dailyWhGrouped->keys()->toArray(),
            'values' => $dailyWhGrouped->values()->toArray(),
        ];

        // Paginated Logs Table (Newest first)
        $tableLogs = $filteredLogs->sortByDesc('timestamp_parsed')->values();
        $paginatedLogs = new LengthAwarePaginator(
            $tableLogs->forPage($page, $perPage)->values(),
            $tableLogs->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return view('dashboard', [
            'diagnostics'    => $diagnostics,
            'summary'        => $summary,
            'powerChart'     => $powerChart,
            'voltageChart'   => $voltageChart,
            'dailyWhChart'   => $dailyWhChart,
            'paginatedLogs'  => $paginatedLogs,
            'dateFrom'       => $dateFrom,
            'dateTo'         => $dateTo,
            'isFallbackData' => $isFallbackData,
            'errorMessage'   => $errorMessage,
        ]);
    }

    /**
     * Fetch raw data matrix from Google Sheets via revolution/laravel-google-sheets
     */
    protected function fetchFromGoogleSheets(): array
    {
        // Attempts connection using package facade
        $rows = Sheets::spreadsheet($this->spreadsheetId)
            ->sheet($this->sheetName)
            ->get();

        return is_array($rows) ? $rows : [];
    }

    /**
     * Parses raw Google Sheets rows into structured collections with typed fields.
     */
    protected function parseRowsToCollection(array $rawRows): Collection
    {
        $header = array_shift($rawRows); // Remove header row
        $collection = collect();

        $expectedColumns = [
            'timestamp', 'v_pv', 'i_pv', 'p_pv', 'wh_pv_daily',
            'v_bat', 'i_bat', 'p_bat', 'scc_eff', 'load_status',
            'uptime_sec', 'esp_temp', 'free_heap', 'wifi_rssi', 'sd_status'
        ];

        foreach ($rawRows as $row) {
            if (empty($row) || count($row) < 3) continue;

            $item = [];
            foreach ($expectedColumns as $index => $colName) {
                $item[$colName] = isset($row[$index]) ? trim($row[$index]) : '';
            }

            // Numeric casting
            $item['v_pv']         = (float) ($item['v_pv'] ?? 0);
            $item['i_pv']         = (float) ($item['i_pv'] ?? 0);
            $item['p_pv']         = (float) ($item['p_pv'] ?? 0);
            $item['wh_pv_daily']  = (float) ($item['wh_pv_daily'] ?? 0);
            $item['v_bat']        = (float) ($item['v_bat'] ?? 0);
            $item['i_bat']        = (float) ($item['i_bat'] ?? 0);
            $item['p_bat']        = (float) ($item['p_bat'] ?? 0);
            $item['scc_eff']      = (float) ($item['scc_eff'] ?? 0);
            $item['uptime_sec']   = (int)   ($item['uptime_sec'] ?? 0);
            $item['esp_temp']     = (float) ($item['esp_temp'] ?? 0);
            $item['free_heap']    = (float) ($item['free_heap'] ?? 0);
            $item['wifi_rssi']    = (int)   ($item['wifi_rssi'] ?? 0);
            $item['load_status']  = strtoupper($item['load_status'] ?: 'OFF');
            $item['sd_status']    = strtoupper($item['sd_status'] ?: 'READY');

            // Parse timestamp safely
            try {
                $item['timestamp_parsed'] = Carbon::parse($item['timestamp']);
            } catch (Exception $e) {
                $item['timestamp_parsed'] = null;
            }

            $collection->push($item);
        }

        return $collection;
    }

    /**
     * Calculate System Diagnostic & Health metrics.
     */
    protected function calculateDiagnostics(array $latestRecord): array
    {
        // 1. Connection Status (ONLINE if log is within 5 minutes or generated recently)
        $isOnline = false;
        if ($latestRecord['timestamp_parsed']) {
            $diffMinutes = Carbon::now()->diffInMinutes($latestRecord['timestamp_parsed']);
            $isOnline = abs($diffMinutes) <= 15; // consider online if within 15 min
        }

        // 2. Uptime formatting: X Hari, Y Jam, Z Menit
        $uptimeSec = $latestRecord['uptime_sec'] ?? 0;
        $days = floor($uptimeSec / 86400);
        $hours = floor(($uptimeSec % 86400) / 3600);
        $minutes = floor(($uptimeSec % 3600) / 60);

        $uptimeFormatted = sprintf("%d Hari, %d Jam, %d Mnt", $days, $hours, $minutes);

        // 3. Temperature level status
        $temp = $latestRecord['esp_temp'] ?? 0;
        $tempStatus = $temp > 50 ? 'HIGH' : ($temp > 40 ? 'WARM' : 'NORMAL');

        // 4. Wi-Fi RSSI evaluation
        $rssi = $latestRecord['wifi_rssi'] ?? -90;
        $wifiQuality = 'Weak';
        if ($rssi >= -60) {
            $wifiQuality = 'Excellent';
        } elseif ($rssi >= -75) {
            $wifiQuality = 'Good';
        } elseif ($rssi >= -85) {
            $wifiQuality = 'Fair';
        }

        return [
            'is_online'         => $isOnline,
            'status_label'      => $isOnline ? 'ONLINE' : 'OFFLINE',
            'uptime_raw'        => $uptimeSec,
            'uptime_formatted'  => $uptimeFormatted,
            'esp_temp'          => round($temp, 1),
            'temp_status'       => $tempStatus,
            'free_heap_kb'      => round(($latestRecord['free_heap'] ?? 0) / 1024, 1), // convert bytes to KB if bytes or keep KB
            'wifi_rssi'         => $rssi,
            'wifi_quality'      => $wifiQuality,
            'sd_status'         => $latestRecord['sd_status'] ?? 'MOUNTED',
            'last_seen'         => $latestRecord['timestamp'] ?? '-',
        ];
    }

    /**
     * Calculate Summary Metric Cards.
     */
    protected function calculateSummaryMetrics(array $latest, Collection $allLogs): array
    {
        $previous = $allLogs->count() > 1 ? $allLogs->get($allLogs->count() - 2) : $latest;

        return [
            'v_pv'          => round($latest['v_pv'], 2),
            'i_pv'          => round($latest['i_pv'], 2),
            'p_pv'          => round($latest['p_pv'], 2),
            'v_bat'         => round($latest['v_bat'], 2),
            'i_bat'         => round($latest['i_bat'], 2),
            'p_bat'         => round($latest['p_bat'], 2),
            'wh_pv_daily'   => round($latest['wh_pv_daily'], 2),
            'scc_eff'       => round($latest['scc_eff'], 1),
            'load_status'   => $latest['load_status'] ?: 'ON',
            
            // Delta / Trends
            'p_pv_diff'     => round($latest['p_pv'] - $previous['p_pv'], 2),
            'p_bat_diff'    => round($latest['p_bat'] - $previous['p_bat'], 2),
            'v_bat_diff'    => round($latest['v_bat'] - $previous['v_bat'], 2),
        ];
    }

    /**
     * Fallback Realistic Solar Time-Series Mock Data Generator.
     */
    protected function generateMockLogs(): Collection
    {
        $collection = collect();
        $startTime = Carbon::now()->subHours(24)->startOfHour();
        $uptimeCounter = 172800; // 2 days uptime
        $whAccumulator = 0.0;

        for ($i = 0; $i < 144; $i++) { // 24 hours * 6 logs per hour (every 10 min)
            $timestamp = $startTime->copy()->addMinutes($i * 10);
            $hour = (int) $timestamp->format('H');
            $minute = (int) $timestamp->format('i');

            // Reset Wh at midnight
            if ($hour == 0 && $minute == 0) {
                $whAccumulator = 0.0;
            }

            // Solar generation curve (peak around 12:00 - 13:00)
            if ($hour >= 6 && $hour <= 18) {
                $sunFactor = sin(($hour - 6 + ($minute / 60)) / 12 * M_PI);
                $sunFactor = max(0, $sunFactor);

                // Add minor cloud noise
                $noise = (rand(90, 105) / 100);
                $v_pv = round(16.5 + (2.5 * $sunFactor) * $noise, 2);
                $i_pv = round((4.8 * $sunFactor) * $noise, 2);
                $p_pv = round($v_pv * $i_pv, 2);

                // Battery charging dynamics (12V system charging up to 14.4V)
                $v_bat = round(12.6 + (1.6 * $sunFactor) * $noise, 2);
                $scc_eff = round(92.5 + (5.5 * $sunFactor), 1);
                $p_bat = round($p_pv * ($scc_eff / 100), 2);
                $i_bat = $v_bat > 0 ? round($p_bat / $v_bat, 2) : 0;
            } else {
                // Night time - No solar generation
                $v_pv = round(0.2 + (rand(0, 10) / 100), 2);
                $i_pv = 0.0;
                $p_pv = 0.0;

                // Battery discharging / resting voltage
                $v_bat = round(12.4 - (rand(0, 30) / 100), 2);
                $i_bat = -0.35; // load current drawing
                $p_bat = round($v_bat * $i_bat, 2);
                $scc_eff = 0.0;
            }

            // Energy accumulation increment (10 minutes interval = 1/6 hour)
            $whAccumulator += round(($p_pv / 6), 2);

            $uptimeCounter += 600;
            $esp_temp = round(32.0 + ($p_pv > 10 ? ($p_pv / 8) : 0) + (rand(-10, 10) / 10), 1);
            $free_heap = rand(215000, 228000);
            $wifi_rssi = -62 + rand(-4, 4);

            $collection->push([
                'timestamp'        => $timestamp->format('Y-m-d H:i:s'),
                'timestamp_parsed' => $timestamp,
                'v_pv'             => $v_pv,
                'i_pv'             => $i_pv,
                'p_pv'             => $p_pv,
                'wh_pv_daily'      => round($whAccumulator, 2),
                'v_bat'            => $v_bat,
                'i_bat'            => $i_bat,
                'p_bat'            => $p_bat,
                'scc_eff'          => $scc_eff,
                'load_status'      => 'ON',
                'uptime_sec'       => $uptimeCounter,
                'esp_temp'         => $esp_temp,
                'free_heap'        => $free_heap,
                'wifi_rssi'        => $wifi_rssi,
                'sd_status'        => 'MOUNTED',
            ]);
        }

        return $collection;
    }

    /**
     * Default empty record structure.
     */
    protected function getEmptyRecord(): array
    {
        return [
            'timestamp'        => Carbon::now()->format('Y-m-d H:i:s'),
            'timestamp_parsed' => Carbon::now(),
            'v_pv'             => 0,
            'i_pv'             => 0,
            'p_pv'             => 0,
            'wh_pv_daily'      => 0,
            'v_bat'            => 0,
            'i_bat'            => 0,
            'p_bat'            => 0,
            'scc_eff'          => 0,
            'load_status'      => 'OFF',
            'uptime_sec'       => 0,
            'esp_temp'         => 0,
            'free_heap'        => 0,
            'wifi_rssi'        => -90,
            'sd_status'        => 'ERROR',
        ];
    }
}
