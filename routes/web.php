<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SolarDashboardController;
use App\Http\Controllers\SolarExportController;

/*
|--------------------------------------------------------------------------
| Web Routes - Solar Energy Monitoring Dashboard
|--------------------------------------------------------------------------
*/

// Main Solar Energy Dashboard Route
Route::get('/', [SolarDashboardController::class, 'index'])->name('dashboard');

// Export CSV Route (Identical to ESP32 SD Card Log)
Route::get('/export', [SolarExportController::class, 'exportCsv'])->name('solar.export');
