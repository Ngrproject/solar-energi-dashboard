<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Http\Controllers\SolarDashboardController;
use Carbon\Carbon;

class SolarExportController extends SolarDashboardController
{
    /**
     * Stream CSV log file identical to ESP32 SD Card format.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');

        // Fetch logs (uses parent class Google Sheets fetch with fallback mechanism)
        try {
            $rawRows = $this->fetchFromGoogleSheets();
            if (empty($rawRows) || count($rawRows) <= 1) {
                $logs = $this->generateMockLogs();
            } else {
                $logs = $this->parseRowsToCollection($rawRows);
            }
        } catch (\Exception $e) {
            $logs = $this->generateMockLogs();
        }

        // Apply Date Filtering if specified
        if ($dateFrom || $dateTo) {
            $logs = $logs->filter(function ($item) use ($dateFrom, $dateTo) {
                if (!$item['timestamp_parsed']) return true;
                $dateStr = $item['timestamp_parsed']->format('Y-m-d');
                $afterFrom = $dateFrom ? ($dateStr >= $dateFrom) : true;
                $beforeTo  = $dateTo ? ($dateStr <= $dateTo) : true;
                return $afterFrom && $beforeTo;
            })->values();
        }

        // Sort chronologically (oldest to newest for standard log files)
        $logs = $logs->sortBy('timestamp_parsed')->values();

        $fileName = 'solar_log_' . ($dateFrom ?: 'all') . '_to_' . ($dateTo ?: 'now') . '_' . date('Ymd_His') . '.csv';

        $columnsHeader = [
            'timestamp',
            'v_pv',
            'i_pv',
            'p_pv',
            'wh_pv_daily',
            'v_bat',
            'i_bat',
            'p_bat',
            'scc_eff',
            'load_status',
            'uptime_sec',
            'esp_temp',
            'free_heap',
            'wifi_rssi',
            'sd_status'
        ];

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($logs, $columnsHeader) {
            $file = fopen('php://output', 'w');
            
            // Write CSV Header matching SD Card log format
            fputcsv($file, $columnsHeader);

            // Write Data Rows
            foreach ($logs as $row) {
                fputcsv($file, [
                    $row['timestamp'] ?? '',
                    number_format((float)($row['v_pv'] ?? 0), 2, '.', ''),
                    number_format((float)($row['i_pv'] ?? 0), 2, '.', ''),
                    number_format((float)($row['p_pv'] ?? 0), 2, '.', ''),
                    number_format((float)($row['wh_pv_daily'] ?? 0), 2, '.', ''),
                    number_format((float)($row['v_bat'] ?? 0), 2, '.', ''),
                    number_format((float)($row['i_bat'] ?? 0), 2, '.', ''),
                    number_format((float)($row['p_bat'] ?? 0), 2, '.', ''),
                    number_format((float)($row['scc_eff'] ?? 0), 1, '.', ''),
                    $row['load_status'] ?? 'ON',
                    (int)($row['uptime_sec'] ?? 0),
                    number_format((float)($row['esp_temp'] ?? 0), 1, '.', ''),
                    (int)($row['free_heap'] ?? 0),
                    (int)($row['wifi_rssi'] ?? 0),
                    $row['sd_status'] ?? 'MOUNTED',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
