<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

class SettingsHelper
{
    /**
     * Get a system setting value
     * 
     * @param string $key The setting key to retrieve
     * @param mixed $default Default value if setting doesn't exist
     * @return mixed
     */
    public static function get($key, $default = null)
    {
        $settings = self::all();
        return $settings[$key] ?? $default;
    }

    /**
     * Get all system settings
     * 
     * @return array
     */
    public static function all()
    {
        return Cache::remember('system_settings', 3600, function () {
            $path = 'system_settings.json';
            if (!Storage::exists($path)) {
                return self::defaults();
            }

            $contents = Storage::get($path);
            $data = @json_decode($contents, true) ?: [];
            
            return array_merge(self::defaults(), $data);
        });
    }

    /**
     * Get appearance settings
     * 
     * @return array
     */
    public static function appearance()
    {
        return Cache::remember('appearance_settings', 3600, function () {
            $path = 'appearance_settings.json';
            if (!Storage::exists($path)) {
                return self::appearanceDefaults();
            }

            $contents = Storage::get($path);
            $data = @json_decode($contents, true) ?: [];
            
            return array_merge(self::appearanceDefaults(), $data);
        });
    }

    /**
     * Clear settings cache
     */
    public static function clearCache()
    {
        Cache::forget('system_settings');
        Cache::forget('appearance_settings');
    }

    /**
     * Default system settings
     * 
     * @return array
     */
    protected static function defaults()
    {
        return [
            'schoolName' => 'Saint Joseph Institute of Technology',
            'schoolCode' => 'RHS-2025',
            'academicYear' => '2024-2025',
            'timezone' => 'Eastern Time (ET)',
            'defaultLanguage' => 'English',
            'currency' => 'PHP (₱)'
        ];
    }

    /**
     * Default appearance settings
     * 
     * @return array
     */
    protected static function appearanceDefaults()
    {
        return [
            'primaryColor' => '#6366f1',
            'secondaryColor' => '#8b5cf6',
            'themeMode' => 'light',
            'fontFamily' => 'inter',
            'sidebarPosition' => 'left',
            'compactMode' => 'off',
            'logoPath' => null,
            'faviconPath' => null
        ];
    }
}
