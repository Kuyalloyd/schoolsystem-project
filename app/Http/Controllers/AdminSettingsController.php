<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Department;
use Illuminate\Support\Facades\Log;

class AdminSettingsController extends Controller
{
    // simple admin check helper
    protected function ensureAdmin(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Forbidden');
        }
    }

    // GET /api/admin/departments
    public function departments(Request $request)
    {
        $this->ensureAdmin($request);
        $query = Department::query()->orderBy('name');

        if ($request->filled('search')) {
            $q = $request->get('search');
            $query->where('name', 'like', "%{$q}%");
        }

        return response()->json($query->get());
    }

    // POST /api/admin/departments
    public function storeDepartment(Request $request)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
            'code' => 'nullable|string|max:50|unique:departments,code',
            'description' => 'nullable|string',
        ]);

        $dept = Department::create($data);
        return response()->json($dept, 201);
    }

    // PUT /api/admin/departments/{id}
    public function updateDepartment(Request $request, $id)
    {
        $this->ensureAdmin($request);
        $dept = Department::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255|unique:departments,name,' . $id,
            'code' => 'nullable|string|max:50|unique:departments,code,' . $id,
            'description' => 'nullable|string',
        ]);

        $dept->update($data);
        return response()->json($dept);
    }

    // DELETE: soft-delete
    public function destroyDepartment(Request $request, $id)
    {
        $this->ensureAdmin($request);
        $dept = Department::findOrFail($id);
        $dept->delete();
        return response()->json(['message' => 'Department archived']);
    }

    public function restoreDepartment(Request $request, $id)
    {
        $this->ensureAdmin($request);
        $dept = Department::withTrashed()->findOrFail($id);
        $dept->restore();
        return response()->json(['message' => 'Department restored']);
    }
}
