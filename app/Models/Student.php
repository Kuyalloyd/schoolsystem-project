<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'student_id',
        'first_name', 'last_name', 'sex', 'email', 'date_of_birth',
        'phone_number', 'address', 'course', 'status', 'department',
        'date_of_enrollment', 'year_level'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function courses()
    {
        return $this->belongsToMany(\App\Models\Course::class, 'course_student', 'student_id', 'course_id')->withTimestamps();
    }
}
