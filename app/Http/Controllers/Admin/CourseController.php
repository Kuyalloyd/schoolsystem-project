<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course; // make sure you have a Course model
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index()
    {
        $courses = Course::withCount('students')->get();

        return response()->json([
            'success' => true,
            'data' => $courses
        ]);
    }
}
