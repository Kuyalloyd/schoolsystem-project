<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id','school_id','course','school_name','department'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
