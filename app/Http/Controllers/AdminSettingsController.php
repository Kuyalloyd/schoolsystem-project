<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Helpers\SettingsHelper;

class AdminSettingsController extends Controller
{
    // simple admin check helper
    protected function ensureAdmin(Request $request)
    {
        // Try to get user from request or auth
        $user = $request->user() ?? auth()->user();
        
        Log::info('[AdminSettingsController] ensureAdmin check', [
            'user_exists' => $user ? 'yes' : 'no',
            'user_id' => $user ? $user->id : null,
            'user_role' => $user ? $user->role : null,
            'auth_check' => auth()->check(),
            'auth_id' => auth()->id(),
            'session_id' => session()->getId()
        ]);
        
        if (!$user) {
            Log::warning('[AdminSettingsController] No user found in request or auth');
            abort(403, 'Forbidden: Not authenticated');
        }
        
        if ($user->role !== 'admin') {
            Log::warning('[AdminSettingsController] User is not admin', [
                'user_id' => $user->id,
                'role' => $user->role
            ]);
            abort(403, 'Forbidden: Admin access required');
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

    // GET /api/admin/school-settings
    public function getSchoolSettings(Request $request)
    {
        $path = 'school_settings.json';
        if (!Storage::exists($path)) {
            // return default skeleton
            return response()->json([
                'schoolName' => '',
                'address' => '',
                'city' => '',
                'state' => '',
                'zipCode' => '',
                'country' => ''
            ]);
        }

        $contents = Storage::get($path);
        $data = @json_decode($contents, true) ?: [];
        return response()->json($data);
    }

    // PUT /api/admin/school-settings
    public function updateSchoolSettings(Request $request)
    {
        $data = $request->validate([
            'schoolName' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:200',
            'state' => 'nullable|string|max:200',
            'zipCode' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:200'
        ]);

        $path = 'school_settings.json';
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        Storage::put($path, $json);

        return response()->json(['message' => 'School settings saved', 'data' => $data]);
    }

    // GET /api/admin/profile
    public function getProfile(Request $request)
    {
        // Get the first admin user (temporary solution)
        $user = User::where('role', 'admin')->first();
        if (!$user) {
            return response()->json(['message' => 'No admin user found'], 404);
        }

        return response()->json([
            'firstName' => $user->first_name ?? '',
            'lastName' => $user->last_name ?? '',
            'email' => $user->email ?? '',
            'phone' => $user->contact ?? '',
            'avatar' => $user->avatar ?? null,
        ]);
    }

    // PUT /api/admin/profile
    public function updateProfile(Request $request)
    {
        // Get the first admin user (temporary solution)
        $user = User::where('role', 'admin')->first();
        
        if (!$user) {
            return response()->json(['message' => 'No admin user found'], 404);
        }

        // Just accept whatever data comes in without strict validation
        $data = $request->all();
        
        try {
            if (isset($data['firstName'])) {
                $user->first_name = $data['firstName'];
            }
            
            if (isset($data['lastName'])) {
                $user->last_name = $data['lastName'];
            }
            
            if (isset($data['firstName']) || isset($data['lastName'])) {
                $fname = $user->first_name ?? '';
                $lname = $user->last_name ?? '';
                $user->name = trim(($fname ?: '') . ' ' . ($lname ?: '')) ?: 'Admin User';
            }

            if (isset($data['email']) && $data['email']) {
                // Check if email is already used by another user
                $emailExists = User::where('email', $data['email'])
                    ->where('id', '!=', $user->id)
                    ->exists();
                    
                if ($emailExists) {
                    return response()->json(['message' => 'This email is already in use by another user'], 422);
                }
                
                $user->email = $data['email'];
            }
            
            if (isset($data['phone'])) {
                $user->contact = $data['phone'];
            }
            
            if (isset($data['avatar'])) {
                $user->avatar = $data['avatar'];
            }

            $user->save();

            return response()->json([
                'message' => 'Profile updated successfully!', 
                'user' => [
                    'firstName' => $user->first_name,
                    'lastName' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->contact,
                    'avatar' => $user->avatar
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('[AdminSettingsController] Profile update failed', [
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

    // GET /api/admin/settings
    public function getSettings(Request $request)
    {
        $path = 'system_settings.json';
        if (!Storage::exists($path)) {
            // Return default settings
            return response()->json([
                'schoolName' => 'Saint Joseph Institute of Technology',
                'schoolCode' => 'RHS-2025',
                'academicYear' => '2024-2025',
                'timezone' => 'Eastern Time (ET)',
                'defaultLanguage' => 'English',
                'currency' => 'USD ($)'
            ]);
        }

        $contents = Storage::get($path);
        $data = @json_decode($contents, true) ?: [];
        return response()->json($data);
    }

    // PUT /api/admin/settings
    public function updateSettings(Request $request)
    {
        try {
            $data = $request->validate([
                'schoolName' => 'required|string|max:255',
                'schoolCode' => 'required|string|max:50',
                'academicYear' => 'required|string|max:50',
                'timezone' => 'required|string|max:100',
                'defaultLanguage' => 'required|string|max:100',
                'currency' => 'required|string|max:50'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[AdminSettingsController] Validation failed', [
                'errors' => $e->errors(),
                'input' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $e->errors()
            ], 422);
        }

        $path = 'system_settings.json';
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        Storage::put($path, $json);

        // Clear settings cache
        SettingsHelper::clearCache();

        return response()->json(['message' => 'Settings saved successfully!', 'data' => $data]);
    }

    // POST /api/admin/settings/appearance
    public function updateAppearance(Request $request)
    {
        try {
            $data = $request->validate([
                'primaryColor' => 'nullable|string|max:20',
                'secondaryColor' => 'nullable|string|max:20',
                'themeMode' => 'nullable|string|max:20',
                'fontFamily' => 'nullable|string|max:50',
                'sidebarPosition' => 'nullable|string|max:20',
                'compactMode' => 'nullable|string|max:20',
                'logo' => 'nullable|file|max:10240',
                'favicon' => 'nullable|file|max:10240'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[AdminSettingsController] Appearance validation failed', [
                'errors' => $e->errors(),
                'files' => $request->allFiles(),
                'input' => $request->except(['logo', 'favicon'])
            ]);
            
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $e->errors()
            ], 422);
        }

        // Handle file uploads
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('appearance', 'public');
            $data['logoPath'] = $logoPath;
            unset($data['logo']); // Remove file object from data
        }

        if ($request->hasFile('favicon')) {
            $faviconPath = $request->file('favicon')->store('appearance', 'public');
            $data['faviconPath'] = $faviconPath;
            unset($data['favicon']); // Remove file object from data
        }

        // Load existing appearance settings
        $path = 'appearance_settings.json';
        $existing = [];
        if (Storage::exists($path)) {
            $contents = Storage::get($path);
            $existing = @json_decode($contents, true) ?: [];
        }

        // Merge with new data
        $merged = array_merge($existing, $data);
        
        // Save to storage
        $json = json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        Storage::put($path, $json);

        // Clear settings cache
        SettingsHelper::clearCache();

        return response()->json(['message' => 'Appearance settings saved successfully!', 'data' => $merged]);
    }

    // GET /api/admin/settings/appearance
    public function getAppearance(Request $request)
    {
        $appearance = SettingsHelper::appearance();
        return response()->json($appearance);
    }
}
