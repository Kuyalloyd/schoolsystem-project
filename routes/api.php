<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\AdminController;

/*
|--------------------------------------------------------------------------
| AUTH ROUTES
|--------------------------------------------------------------------------
*/

Route::post('/login', [LoginController::class, 'login']);
Route::post('/register', [RegisterController::class, 'register']);
Route::post('/logout', [LoginController::class, 'logout']);

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

Route::prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);        // Dashboard stats
    Route::get('/users', [AdminController::class, 'index']);                // List users
    Route::post('/users', [AdminController::class, 'store']);               // Add user
    Route::put('/users/{id}', [AdminController::class, 'update']);          // Edit user
    Route::delete('/users/{id}', [AdminController::class, 'destroy']);      // Archive user
    Route::post('/users/{id}/restore', [AdminController::class, 'restore']); // Restore user
    Route::post('/users/{id}/toggle-lock', [AdminController::class, 'toggleLock']); // Lock/unlock

    // Optional sections for future features
    Route::get('/courses', [AdminController::class, 'courses']);
    Route::post('/courses', [AdminController::class, 'addCourse']);
    Route::get('/activities', [AdminController::class, 'activities']);
});
