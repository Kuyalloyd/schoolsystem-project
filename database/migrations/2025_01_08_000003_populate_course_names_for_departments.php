<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Map department codes to full names
        $departmentNames = [
            'BAP' => 'Business Administration Program',
            'CSP' => 'Computer Studies Program',
            'ICJEEP' => 'Institute of Criminal Justice Education Program',
            'ETP' => 'Engineering & Technology Program',
            'AP' => 'Accountancy Program',
            'NP' => 'Nursing Program',
            'ASP' => 'Arts and Sciences Program',
            'THMP' => 'Tourism and Hospitality Management Program',
        ];

        // Update courses where course_name is empty but department is set
        foreach ($departmentNames as $code => $name) {
            DB::table('courses')
                ->where('department', $code)
                ->where(function ($query) {
                    $query->whereNull('course_name')
                          ->orWhere('course_name', '');
                })
                ->update([
                    'course_name' => $name,
                    'course_code' => $code,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optional: revert changes if needed
        // For safety, we won't automatically clear the names
    }
};
