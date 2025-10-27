<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Course;
use App\Models\Student;

$course = Course::first();
$student = Student::first();
if (!$course || !$student) {
    echo "Need at least one course and one student to test.\n";
    exit(1);
}

echo "Course before update: " . json_encode($course->toArray()) . "\n";

// Update course
$course->course_name = $course->course_name . ' (Updated)';
$course->description = 'Updated description from test script';
$course->max_students = ($course->max_students ?: 0) + 10;
$course->save();

echo "Course after update: " . json_encode($course->toArray()) . "\n";

// List enrollments
$students = $course->students()->get();
echo "Enrolled students count: " . $students->count() . "\n";

// Unenroll the student if enrolled
if ($course->students()->where('students.id', $student->id)->exists()) {
    $course->students()->detach($student->id);
    echo "Detached student {$student->id}\n";
} else {
    echo "Student not enrolled, attaching now\n";
    $course->students()->attach($student->id);
    echo "Attached student {$student->id}\n";
}

$students = $course->students()->get();
echo "Final enrolled students count: " . $students->count() . "\n";

// Delete the course - create and delete a temp course instead to be safe
$temp = Course::create(['course_name' => 'Temp Delete', 'course_code' => 'TMP123', 'units' => 1]);
$id = $temp->id;
$temp->delete();
echo "Created and deleted temp course id={$id}\n";
