<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;

class RegisterController extends Controller
{
    /**
     * 🧾 Register a new user (Student or Teacher)
     */
    public function register(Request $request)
    {
        // ✅ Validate data
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name'  => 'required|string|max:100',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:6',
            'role'       => 'required|in:student,teacher',
        ]);

        // ✅ Create user record
        $user = User::create([
            'name'       => $request->first_name . ' ' . $request->last_name,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'role'       => $request->role,
            'sex'        => $request->sex ?? 'N/A',
            'contact'    => $request->contact ?? '',
            'is_locked'  => false,
        ]);

        // ✅ If role is student — create student profile
        if ($request->role === 'student') {
            Student::create([
                'user_id'     => $user->id,
                'school_id'   => $request->school_id ?? uniqid('SID-'),
                'course'      => $request->course ?? '',
                'school_name' => $request->school_name ?? '',
                'department'  => $request->department ?? '',
            ]);
        }

        // ✅ If role is teacher — create teacher profile
        if ($request->role === 'teacher') {
            Teacher::create([
                'user_id'        => $user->id,
                'department'     => $request->department ?? '',
                'status'         => $request->status ?? '',
                'courses_handled'=> $request->courses_handled ?? '',
                'position'       => $request->position ?? '',
                'highest_degree' => $request->highest_degree ?? '',
                'specialization' => $request->specialization ?? '',
            ]);
        }

        // ✅ Success response
        return response()->json([
            'message' => '✅ Registration successful',
            'user'    => $user,
        ], 201);
    }
}
