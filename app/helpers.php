<?php

use App\Helpers\SettingsHelper;

if (!function_exists('setting')) {
    /**
     * Get a system setting value
     * 
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    function setting($key, $default = null)
    {
        return SettingsHelper::get($key, $default);
    }
}

if (!function_exists('appearance')) {
    /**
     * Get appearance settings
     * 
     * @param string|null $key
     * @param mixed $default
     * @return mixed
     */
    function appearance($key = null, $default = null)
    {
        $settings = SettingsHelper::appearance();
        
        if ($key === null) {
            return $settings;
        }
        
        return $settings[$key] ?? $default;
    }
}

if (!function_exists('school_name')) {
    /**
     * Get the school name
     * 
     * @return string
     */
    function school_name()
    {
        return setting('schoolName', 'School Management System');
    }
}

if (!function_exists('school_code')) {
    /**
     * Get the school code
     * 
     * @return string
     */
    function school_code()
    {
        return setting('schoolCode', 'SMS-2025');
    }
}

if (!function_exists('academic_year')) {
    /**
     * Get the current academic year
     * 
     * @return string
     */
    function academic_year()
    {
        return setting('academicYear', '2024-2025');
    }
}
