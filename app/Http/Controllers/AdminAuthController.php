<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminAuthController extends Controller
{
    /**
     * Handle admin login request
     */
    public function login(Request $request)
    {
        // ✅ Validate input
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        // ✅ Look up admin by email and role
        $user = User::where('email', $request->email)
                    ->where('role', 'admin')
                    ->first();

        // ❌ Not found or wrong password
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid admin credentials'
            ], 401);
        }

        // ❌ Account locked
        if ($user->is_locked ?? false) {
            return response()->json([
                'message' => 'Admin account is locked'
            ], 403);
        }

        // ✅ Create Sanctum token
        $token = $user->createToken('admin_auth_token')->plainTextToken;

        // ✅ Always ensure role = 'admin' in response
        $user->role = 'admin';

        // ✅ Return clean JSON response
        return response()->json([
            'message' => 'Admin login successful',
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => 'admin',
            ],
        ], 200);
    }

    /**
     * Logout admin and revoke token
     */
    public function logout(Request $request)
    {
        // ✅ Delete current access token
        if ($request->user() && $request->user()->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'message' => 'Admin logged out successfully',
        ]);
    }
}
