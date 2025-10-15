<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Teacher extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'teacher_id',
        'first_name', 'last_name', 'sex', 'email', 'date_of_birth',
        'phone_number', 'address', 'course', 'department', 'status',
        'courses_handled', 'position'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
