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

// Public shared document routes (no authentication required)
Route::get('/shared/documents/{token}', [SharedDocumentController::class, 'show'])->name('shared.document');
Route::get('/shared/documents/{token}/download', [SharedDocumentController::class, 'download'])->name('shared.document.download');

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
