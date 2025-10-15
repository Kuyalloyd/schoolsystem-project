<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\AdminController;

Route::post('/login', [LoginController::class, 'login']);
// Debug helper (development only) — returns diagnostic info about a login attempt
Route::post('/_debug-login', [LoginController::class, 'debugLogin']);
// Debug users list (development only)
Route::get('/_debug-users', [LoginController::class, 'debugUsers']);
// Reset or create admin (development only). Requires DEBUG_RESET_TOKEN in .env and token passed in request body.
Route::post('/_reset-admin', [LoginController::class, 'resetAdmin']);
Route::post('/register', [RegisterController::class, 'register']);
Route::post('/logout', [LoginController::class, 'logout']);

Route::prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/users', [AdminController::class, 'index']);
    Route::post('/users', [AdminController::class, 'store']);
    Route::put('/users/{id}', [AdminController::class, 'update']);
    Route::delete('/users/{id}', [AdminController::class, 'destroy']);
    Route::post('/users/{id}/restore', [AdminController::class, 'restore']);
    Route::post('/users/{id}/toggle-lock', [AdminController::class, 'toggleLock']);
    Route::post('/users/{id}/lock', [AdminController::class, 'lock']);
    Route::post('/users/{id}/unlock', [AdminController::class, 'unlock']);
    Route::get('/courses', [AdminController::class, 'courses']);
    Route::post('/courses', [AdminController::class, 'addCourse']);
    Route::get('/activities', [AdminController::class, 'activities']);
    // Documents: list and upload
    Route::get('/documents', [AdminController::class, 'documents']);
    Route::post('/documents', [AdminController::class, 'storeDocument']);
    Route::get('/documents/{id}', [AdminController::class, 'document']);
    Route::get('/documents/{id}/download', [AdminController::class, 'downloadDocument']);
    // Admin settings: departments
    Route::get('/departments', [\App\Http\Controllers\AdminSettingsController::class, 'departments']);
    Route::post('/departments', [\App\Http\Controllers\AdminSettingsController::class, 'storeDepartment']);
    Route::put('/departments/{id}', [\App\Http\Controllers\AdminSettingsController::class, 'updateDepartment']);
    Route::delete('/departments/{id}', [\App\Http\Controllers\AdminSettingsController::class, 'destroyDepartment']);
    Route::post('/departments/{id}/restore', [\App\Http\Controllers\AdminSettingsController::class, 'restoreDepartment']);
});
