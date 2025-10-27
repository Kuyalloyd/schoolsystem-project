<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Student;
use App\Models\User;
use App\Models\Course;

// Ensure there is a student; create a test one if not
$student = Student::first();
if (!$student) {
    $user = User::create(['name' => 'Test Student', 'email' => 'teststudent@example.local', 'password' => bcrypt('secret'), 'role' => 'student']);
    $student = Student::create(['user_id' => $user->id, 'student_id' => 'STU-CLI', 'first_name' => 'Test', 'last_name' => 'Student', 'email' => $user->email]);
    echo "Created student id={$student->id}\n";
} else {
    echo "Using student id={$student->id}\n";
}

$course = Course::find(1);
if (!$course) {
    $course = Course::create(['course_name' => 'CLI Test Course', 'course_code' => 'CLI101', 'units' => 3]);
    echo "Created course id={$course->id}\n";
}

try {
    $course->students()->attach($student->id);
    echo "Enrolled student {$student->id} into course {$course->id}\n";
} catch (Exception $e) {
    echo "Enroll failed: " . $e->getMessage() . "\n";
}

// Show current enrollment count
$count = $course->students()->count();
echo "Enrollment count for course {$course->id}: {$count}\n";
