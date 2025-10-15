<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;


Route::post('/logout', function () {
    Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return response()->json(['success' => true]);
})->middleware('web')->name('logout');


Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
