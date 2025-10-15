<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class LoginController extends Controller
{
    /**
     * 🧑‍💻 Handle login request
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

    
        // Log the attempt (helps debugging login issues)
        Log::info('Login attempt', ['email' => $credentials['email']]);

        // API routes don't always have session middleware enabled. Authenticate
        // by checking the user's password hash directly so we avoid relying on
        // session-based guards which can produce "Session store not set" errors.
        try {
            $user = User::where('email', $credentials['email'])->first();
        } catch (\Exception $e) {
            Log::error('Login: DB lookup failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Server error during login. Check logs.'], 500);
        }

        if (!$user) {
            Log::warning('Login failed - user not found', ['email' => $credentials['email']]);
            return response()->json(['message' => '❌ Invalid email or password'], 401);
        }

        // If the user is soft-deleted (archived), disallow login
        if (method_exists($user, 'trashed') && $user->trashed()) {
            Log::warning('Login attempt on archived user', ['email' => $credentials['email']]);
            return response()->json(['message' => '🚫 Account archived. Please restore before login.'], 403);
        }

        try {
            $passwordValid = Hash::check($credentials['password'], $user->password);

            if (!$passwordValid) {
                // Some older imports may have stored plain-text passwords accidentally.
                // If the stored password equals the provided password, rehash and accept.
                if ($user->password === $credentials['password']) {
                    $user->password = Hash::make($credentials['password']);
                    $user->save();
                    Log::info('Login: detected plain-text password; rehashed for user', ['email' => $credentials['email']]);
                    $passwordValid = true;
                }
            }

            if ($passwordValid) {
                // If hash algorithm changed, ensure we rehash to current algorithm
                if (Hash::needsRehash($user->password)) {
                    $user->password = Hash::make($credentials['password']);
                    $user->save();
                    Log::info('Login: password rehashed to current algorithm', ['email' => $credentials['email']]);
                }
            } else {
                Log::warning('Login failed - invalid password', ['email' => $credentials['email']]);
                return response()->json(['message' => '❌ Invalid email or password'], 401);
            }
        } catch (\Exception $e) {
            Log::error('Login: password verification failed', ['error' => $e->getMessage(), 'email' => $credentials['email']]);
            return response()->json(['message' => 'Server error during login. Check logs.'], 500);
        }

        if ($user->is_locked) {
            return response()->json(['message' => '🚫 Account is locked. Please contact admin.'], 403);
        }

        return response()->json([
            'message' => '✅ Login successful!',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * 🚪 Handle logout
     */
    public function logout(Request $request)
    {
        // For API routes we avoid session operations. If a session-based login
        // exists, log it out; otherwise just return success so clients can
        // clear local state.
        if (Auth::check()) {
            Auth::logout();
        }

        return response()->json(['message' => '👋 Logged out successfully']);
    }

    /**
     * Development helper: return diagnostics for a login attempt.
     * POST /api/_debug-login { email, password }
     */
    public function debugLogin(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $user = User::withTrashed()->where('email', $data['email'])->first();
        } catch (\Exception $e) {
            return response()->json(['error' => 'DB lookup failed', 'details' => $e->getMessage()], 500);
        }

        if (!$user) {
            return response()->json(['exists' => false]);
        }

        $hashCheck = null;
        $plainMatch = null;
        try {
            $hashCheck = Hash::check($data['password'], $user->password);
        } catch (\Throwable $t) {
            $hashCheck = 'error: ' . $t->getMessage();
        }

        $plainMatch = ($user->password === $data['password']);

        return response()->json([
            'exists' => true,
            'is_locked' => (bool) $user->is_locked,
            'trashed' => method_exists($user, 'trashed') ? $user->trashed() : false,
            'hash_check' => $hashCheck,
            'plain_text_match' => $plainMatch,
            'stored_password_preview' => substr($user->password, 0, 40),
            'role' => $user->role,
        ]);
    }

    /**
     * Development helper: list first 10 users with diagnostic fields.
     * GET /api/_debug-users
     */
    public function debugUsers(Request $request)
    {
        try {
            $users = User::withTrashed()->orderBy('id','desc')->take(10)->get()->map(function($u){
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role,
                    'is_locked' => (bool)$u->is_locked,
                    'trashed' => method_exists($u,'trashed') ? $u->trashed() : false,
                    'password_preview' => substr($u->password,0,40),
                ];
            });
            return response()->json($users);
        } catch (\Exception $e) {
            return response()->json(['error' => 'DB lookup failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Secure development-only endpoint to reset or create the admin user.
     * Requires a matching token in the request body: { token: '...' }
     * POST /api/_reset-admin { token }
     */
    public function resetAdmin(Request $request)
    {
        $token = $request->input('token');
        $expected = env('DEBUG_RESET_TOKEN');

        if (!$expected || !$token || $token !== $expected) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $user = User::withTrashed()->updateOrCreate(
                ['email' => 'admin@urios.gmail.com'],
                [
                    'name' => 'System Admin',
                    'password' => Hash::make('admin123'),
                    'role' => 'admin',
                    'is_locked' => false,
                ]
            );

            if (method_exists($user, 'restore')) {
                $user->restore();
            }

            return response()->json(['message' => 'Admin reset/created', 'user' => ['email' => $user->email, 'id' => $user->id]]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }
}
