<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Google Sheets Service Account Connection
    |--------------------------------------------------------------------------
    |
    | Configuration for revolution/laravel-google-sheets package.
    | Spreadsheet ID default set to user's solar energy monitoring sheet.
    |
    */

    'default' => 'service_account',

    'connections' => [
        'service_account' => [
            'auth_type' => 'service_account',
            'credentials' => storage_path(env('GOOGLE_SHEETS_AUTH_FILE', 'app/google-sheets/service-account.json')),
            'spreadsheet_id' => env('GOOGLE_SHEETS_SPREADSHEET_ID', '1tNRnoSC2yC3ejFei0OsqDqz2w4rHcmbnRGLwnv9aRXc'),
            'sheet_id' => env('GOOGLE_SHEETS_SHEET_ID', 'Sheet1'),
        ],
    ],
];
