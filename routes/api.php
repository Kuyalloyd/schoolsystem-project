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
    Route::put('/courses/{course}', [AdminController::class, 'updateCourse']);
    Route::delete('/courses/{course}', [AdminController::class, 'deleteCourse']);
    Route::get('/courses/{course}/enrollments', [AdminController::class, 'courseEnrollments']);
    // Return student ids that are enrolled in any course (used by frontend to prevent multi-enrollments)
    Route::get('/students/enrolled', [AdminController::class, 'studentsWithEnrollments']);
    Route::post('/courses/{course}/unenroll', [AdminController::class, 'unenrollStudent']);
    // Enroll a student into a course
    Route::post('/courses/{course}/enroll', [AdminController::class, 'enrollStudent']);
    Route::get('/activities', [AdminController::class, 'activities']);
    // Documents: list and upload
    Route::get('/documents', [AdminController::class, 'documents']);
    Route::post('/documents', [AdminController::class, 'storeDocument']);
    Route::get('/documents/{id}', [AdminController::class, 'document']);
    Route::put('/documents/{id}', [AdminController::class, 'updateDocument']);
    Route::get('/documents/{id}/download', [AdminController::class, 'downloadDocument']);
    Route::post('/documents/{id}/share', [AdminController::class, 'generateShareLink']);
    Route::post('/documents/{id}/unshare', [AdminController::class, 'revokeShareLink']);
    // Admin settings: departments
    // School settings (get/update)
    Route::get('/school-settings', [\App\Http\Controllers\AdminSettingsController::class, 'getSchoolSettings']);
    Route::put('/school-settings', [\App\Http\Controllers\AdminSettingsController::class, 'updateSchoolSettings']);
    // Admin profile (get/update)
    Route::get('/profile', [\App\Http\Controllers\AdminSettingsController::class, 'getProfile']);
    Route::put('/profile', [\App\Http\Controllers\AdminSettingsController::class, 'updateProfile']);
    
    // System settings
    Route::get('/settings', [\App\Http\Controllers\AdminSettingsController::class, 'getSettings']);
    Route::put('/settings', [\App\Http\Controllers\AdminSettingsController::class, 'updateSettings']);
    Route::post('/settings/appearance', [\App\Http\Controllers\AdminSettingsController::class, 'updateAppearance']);
    Route::get('/settings/appearance', [\App\Http\Controllers\AdminSettingsController::class, 'getAppearance']);

    Route::get('/departments', [\App\Http\Controllers\AdminSettingsController::class, 'departments']);
    Route::post('/departments', [\App\Http\Controllers\AdminSettingsController::class, 'storeDepartment']);
    Route::put('/departments/{id}', [\App\Http\Controllers\AdminSettingsController::class, 'updateDepartment']);
    Route::delete('/departments/{id}', [\App\Http\Controllers\AdminSettingsController::class, 'destroyDepartment']);
    Route::post('/departments/{id}/restore', [\App\Http\Controllers\AdminSettingsController::class, 'restoreDepartment']);
    // Download all files and activity as a zip
    Route::get('/download-site-report', [\App\Http\Controllers\Admin\SiteReportController::class, 'download']);
});
