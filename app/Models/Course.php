<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    /**
     * Mass assignable attributes.
     *
     * @var array
     */
    protected $fillable = [
        // Columns that exist in the courses table (including newly added ones)
        'course_name', 'course_code', 'units', 'teacher', 'description', 'department', 'semester', 'max_students', 'status'
    ];

    /**
     * Students enrolled in this course (many-to-many via course_student pivot)
     */
    public function students()
    {
        return $this->belongsToMany(Student::class, 'course_student', 'course_id', 'student_id')->withTimestamps();
    }
}
