<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;

class RegisterController extends Controller
{
    /**
     * 🧾 Handle user registration
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            // allow frontend to send 'faculty' as role value; we'll normalize it below
            'role' => 'required|string',
        ]);

        // Normalize role and make the whole create operation atomic
        $role = strtolower($request->role);
        if ($role === 'faculty') $role = 'teacher';

        Log::info('Register attempt', $request->all());

        DB::beginTransaction();
        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $role,
                'is_locked' => false,
            ]);

            // If the user registered as a student or teacher, create the related profile record.
            if ($user->role === 'student') {
                // ensure we populate the required student fields
                $studentPayload = [
                    'user_id' => $user->id,
                    'student_id' => $request->input('student_id') ?: 'STU-' . strtoupper(uniqid()),
                    'first_name' => $request->input('first_name') ?: explode(' ', $request->input('name'))[0] ?? null,
                    'last_name' => $request->input('last_name') ?: implode(' ', array_slice(explode(' ', $request->input('name')), 1)) ?? null,
                    'email' => $request->input('email') ?: $user->email,
                    'course' => $request->input('course') ?? null,
                    'department' => $request->input('department') ?? null,
                    'status' => $request->input('status') ?? 'Active',
                    'date_of_enrollment' => $request->input('date_of_enrollment') ?: now(),
                    'year_level' => $request->input('year_level') ?? null,
                ];

                Student::create($studentPayload);
            }

            if ($user->role === 'teacher') {
                Teacher::create([
                    'user_id' => $user->id,
                    'department' => $request->input('department') ?? null,
                    'status' => $request->input('status') ?? null,
                    'courses_handled' => $request->input('courses_handled') ?? null,
                    'position' => $request->input('position') ?? null,
                    'highest_degree' => $request->input('highest_degree') ?? null,
                    'specialization' => $request->input('specialization') ?? null,
                ]);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Registration failed', ['error' => $e->getMessage(), 'payload' => $request->all()]);
            return response()->json(['message' => 'Server error while creating account. Check logs.'], 500);
        }

        return response()->json([
            'message' => '✅ Registration successful!',
            'user' => $user,
        ], 201);
    }
}
