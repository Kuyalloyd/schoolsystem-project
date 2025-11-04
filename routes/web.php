<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\SharedDocumentController;


Route::post('/logout', function () {
    Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return response()->json(['success' => true]);
})->middleware('web')->name('logout');

// Force cache clear route
Route::get('/clear-cache-and-reload', function () {
    return response()->view('app')
        ->header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', 'Sat, 01 Jan 2000 00:00:00 GMT')
        ->header('Clear-Site-Data', '"cache", "storage"');
});

// Public shared document routes (no authentication required)
Route::get('/shared/documents/{token}', [SharedDocumentController::class, 'show'])->name('shared.document');
Route::get('/shared/documents/{token}/download', [SharedDocumentController::class, 'download'])->name('shared.document.download');

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
