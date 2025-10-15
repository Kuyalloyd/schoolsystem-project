<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'code', 'description'];

    public function teachers()
    {
        return $this->hasMany(Teacher::class, 'department', 'name');
    }

    public function students()
    {
        return $this->hasMany(Student::class, 'department', 'name');
    }
}
