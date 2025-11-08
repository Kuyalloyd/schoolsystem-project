<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Total Courses: " . \App\Models\Course::count() . "\n\n";

$courses = \App\Models\Course::all();
foreach ($courses as $course) {
    echo "ID: " . $course->id . "\n";
    echo "Name: " . $course->course_name . "\n";
    echo "Code: " . $course->course_code . "\n";
    echo "Department: " . $course->department . "\n";
    echo "Related Courses: " . json_encode($course->related_courses) . "\n";
    echo "---\n";
}
