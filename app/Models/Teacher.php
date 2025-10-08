<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Teacher extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id','department','status','courses_handled','position','highest_degree','specialization'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
