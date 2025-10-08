<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class AdminController extends Controller
{
    // 📊 Dashboard stats
    public function dashboard()
    {
        return response()->json([
            'total_students'    => User::where('role', 'student')->count(),
            'total_teachers'    => User::where('role', 'teacher')->count(),
            'locked_accounts'   => User::where('is_locked', true)->count(),
            'archived_accounts' => User::onlyTrashed()->count(),
        ]);
    }

    // 👥 List all users (including archived)
    public function index()
    {
        return response()->json(User::withTrashed()->orderBy('id', 'desc')->get());
    }

    // ➕ Add user
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role'     => 'required|in:admin,teacher,student',
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => bcrypt($data['password']),
            'role'      => $data['role'],
            'is_locked' => false,
        ]);

        return response()->json(['message' => 'User added successfully', 'user' => $user]);
    }

    // ✏️ Update user
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'role'  => 'sometimes|in:admin,teacher,student',
        ]);

        $user->update($data);

        return response()->json(['message' => 'User updated successfully', 'user' => $user]);
    }

    // ❌ Archive user
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User archived successfully']);
    }

    // ♻️ Restore user
    public function restore($id)
    {
        $user = User::withTrashed()->findOrFail($id);
        $user->restore();

        return response()->json(['message' => 'User restored successfully']);
    }

    // 🔒 Lock or Unlock user
    public function toggleLock($id)
    {
        $user = User::findOrFail($id);
        $user->is_locked = !$user->is_locked;
        $user->save();

        return response()->json([
            'message' => $user->is_locked ? 'User locked.' : 'User unlocked.',
            'is_locked' => $user->is_locked,
        ]);
    }

    // 📚 Placeholder routes
    public function courses()
    {
        return response()->json(['message' => 'Courses endpoint working']);
    }

    public function addCourse()
    {
        return response()->json(['message' => 'Course added (placeholder)']);
    }

    public function activities()
    {
        return response()->json(['message' => 'Activities endpoint working']);
    }
}
