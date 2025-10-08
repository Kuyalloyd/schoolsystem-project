<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * ✅ Register a new user (Student, Teacher, or Admin)
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role'     => 'required|in:student,teacher,admin',
        ]);

        $user = User::create([
            'name'        => $request->name,
            'email'       => $request->email,
            'password'    => Hash::make($request->password),
            'role'        => strtolower($request->role), // ensure consistency
            'is_locked'   => false,
            'sex'         => $request->sex ?? 'N/A',
            'contact'     => $request->contact ?? '',
            'course'      => $request->course ?? '',
            'school_name' => $request->school_name ?? '',
            'department'  => $request->department ?? '',
        ]);

        return response()->json([
            'message' => '✅ Registration successful!',
            'user'    => $user
        ], 201);
    }

    /**
     * ✅ Login existing user
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => '❌ Invalid credentials'], 401);
        }

        if ($user->is_locked) {
            return response()->json(['message' => '🚫 Account is locked. Please contact admin.'], 403);
        }

        // ✅ Log in user using session
        Auth::login($user);

        return response()->json([
            'message' => '✅ Login successful!',
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role
            ]
        ]);
    }

    /**
     * ✅ Logout user
     */
    public function logout()
    {
        Auth::logout();
        return response()->json(['message' => '👋 Logged out successfully']);
    }
}
