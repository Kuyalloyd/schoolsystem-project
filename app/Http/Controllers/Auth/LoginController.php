<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    /**
     * 🧑‍💻 Handle user login
     */
    public function login(Request $request)
    {
        // ✅ Validate credentials
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        // ✅ Attempt login
        if (!Auth::attempt($credentials)) {
            return response()->json(['message' => '❌ Invalid email or password'], 401);
        }

        $user = Auth::user();

        // ✅ Prevent locked accounts from logging in
        if ($user->is_locked) {
            Auth::logout();
            return response()->json(['message' => '🚫 Account is locked. Please contact admin.'], 403);
        }

        // ✅ Login success
        return response()->json([
            'message' => '✅ Login successful',
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ]);
    }

    /**
     * 🚪 Handle logout
     */
    public function logout(Request $request)
    {
        Auth::logout();

        // Optional: clear session data
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => '👋 Logged out successfully']);
    }
}
