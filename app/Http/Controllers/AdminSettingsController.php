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
            'profile_picture' => $user->profile_picture ? Storage::url($user->profile_picture) : null,
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

            // Handle profile picture upload
            if ($request->hasFile('profile_picture')) {
                $file = $request->file('profile_picture');
                
                // Delete old profile picture if exists
                if ($user->profile_picture && Storage::disk('public')->exists($user->profile_picture)) {
                    Storage::disk('public')->delete($user->profile_picture);
                }
                
                // Store new profile picture
                $path = $file->store('profile_pictures', 'public');
                $user->profile_picture = $path;
                
                Log::info('[AdminSettingsController] Profile picture uploaded', [
                    'user_id' => $user->id,
                    'path' => $path
                ]);
            }

            $user->save();

            return response()->json([
                'message' => 'Profile updated successfully!', 
                'user' => [
                    'firstName' => $user->first_name,
                    'lastName' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->contact,
                    'avatar' => $user->avatar,
                    'profile_picture' => $user->profile_picture ? Storage::url($user->profile_picture) : null
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
                'schoolName' => 'Father Saturnino Urios University',
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

    // POST /api/admin/change-password
    public function changePassword(Request $request)
    {
        $this->ensureAdmin($request);
        
        $user = $request->user() ?? auth()->user();
        
        // Validate the request
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
            'new_password_confirmation' => 'required|string'
        ]);
        
        // Check if current password is correct
        if (!\Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 422);
        }
        
        // Update the password
        $user->password = \Hash::make($request->new_password);
        $user->save();
        
        Log::info('[AdminSettingsController] Password changed successfully', [
            'user_id' => $user->id,
            'email' => $user->email
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    }

    // POST /api/admin/generate-2fa
    public function generate2FA(Request $request)
    {
        // Get the admin user (temporary solution - same as getProfile)
        $user = User::where('role', 'admin')->first();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No admin user found'
            ], 404);
        }
        
        // Generate a simple secret key (16 characters base32)
        $secret = $this->generateBase32Secret();
        
        // Store in session temporarily until verified
        session(['temp_2fa_secret' => $secret, 'temp_2fa_user_id' => $user->id]);
        
        // Generate QR code URL for Google Authenticator
        $appName = 'FSUU';
        $email = $user->email;
        $otpUrl = "otpauth://totp/{$appName}:{$email}?secret={$secret}&issuer={$appName}";
        
        // Use QR Server API (free alternative to Google Charts)
        $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($otpUrl);
        
        Log::info('[AdminSettingsController] 2FA QR code generated', [
            'user_id' => $user->id,
            'secret' => $secret,
            'qr_url' => $qrCodeUrl,
            'otp_url' => $otpUrl
        ]);
        
        return response()->json([
            'success' => true,
            'qrCodeUrl' => $qrCodeUrl,
            'secret' => $secret,
            'manualEntry' => $secret  // For manual entry if QR doesn't work
        ]);
    }

    // POST /api/admin/verify-2fa
    public function verify2FA(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6'
        ]);
        
        $secret = session('temp_2fa_secret');
        $userId = session('temp_2fa_user_id');
        
        if (!$secret || !$userId) {
            return response()->json([
                'success' => false,
                'message' => 'No 2FA setup in progress. Please generate a QR code first.'
            ], 400);
        }
        
        // Get the user
        $user = User::find($userId);
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }
        
        // Verify the code
        $isValid = $this->verifyTOTP($secret, $request->code);
        
        if ($isValid) {
            // Save the secret to user's account
            $user->two_factor_secret = $secret;
            $user->two_factor_enabled = true;
            $user->save();
            
            // Clear session
            session()->forget(['temp_2fa_secret', 'temp_2fa_user_id']);
            
            Log::info('[AdminSettingsController] 2FA enabled successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Two-factor authentication enabled successfully'
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification code'
            ], 422);
        }
    }

    private function generateBase32Secret($length = 16)
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= $chars[random_int(0, 31)];
        }
        return $secret;
    }

    private function verifyTOTP($secret, $code, $window = 1)
    {
        $timestamp = floor(time() / 30);
        
        for ($i = -$window; $i <= $window; $i++) {
            if ($this->generateTOTP($secret, $timestamp + $i) === $code) {
                return true;
            }
        }
        
        return false;
    }

    private function generateTOTP($secret, $timestamp)
    {
        $key = $this->base32Decode($secret);
        $time = pack('N*', 0, $timestamp);
        $hash = hash_hmac('sha1', $time, $key, true);
        $offset = ord($hash[19]) & 0xf;
        $code = (
            ((ord($hash[$offset + 0]) & 0x7f) << 24) |
            ((ord($hash[$offset + 1]) & 0xff) << 16) |
            ((ord($hash[$offset + 2]) & 0xff) << 8) |
            (ord($hash[$offset + 3]) & 0xff)
        ) % 1000000;
        
        return str_pad($code, 6, '0', STR_PAD_LEFT);
    }

    private function base32Decode($secret)
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = strtoupper($secret);
        $decoded = '';
        
        for ($i = 0; $i < strlen($secret); $i += 8) {
            $chunk = substr($secret, $i, 8);
            $bits = '';
            
            for ($j = 0; $j < strlen($chunk); $j++) {
                $val = strpos($chars, $chunk[$j]);
                $bits .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
            }
            
            for ($j = 0; $j < strlen($bits); $j += 8) {
                if (strlen($bits) - $j >= 8) {
                    $decoded .= chr(bindec(substr($bits, $j, 8)));
                }
            }
        }
        
        return $decoded;
    }
}
