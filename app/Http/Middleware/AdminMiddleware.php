<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // 🚫 Block anyone who is not logged in or not an admin
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Access denied. Admins only.'], 403);
        }

        // ✅ Allow admin to continue
        return $next($request);
    }
}
