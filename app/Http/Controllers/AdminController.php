<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Models\SystemActivity;
use App\Models\Document;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    // Dashboard
    public function dashboard()
    {
        // compute some recent activity numbers (last 30 days)
        $since = now()->subDays(30);
        $newStudents = Student::where('created_at', '>=', $since)->count();
        $newFaculty = Teacher::where('created_at', '>=', $since)->count();
        $newCourses = \App\Models\Course::where('created_at', '>=', $since)->count();

        return response()->json([
            'total_students' => Student::count(),
            'total_teachers' => Teacher::count(),
            'locked_accounts' => User::where('is_locked', true)->count(),
            'archived_accounts' => User::onlyTrashed()->count(),
            'new_students_30' => $newStudents,
            'new_faculty_30' => $newFaculty,
            'new_courses_30' => $newCourses,
        ]);
    }

    // List courses (returns lightweight structure expected by frontend)
    public function courses(Request $request)
    {
        $rows = \App\Models\Course::orderBy('created_at', 'desc')->get();
        $out = $rows->map(function($c) {
            $enrolled = null;
            try {
                $enrolled = $c->students()->count();
            } catch (\Exception $e) {
                // fallback to enrollment_count column if present
                $enrolled = $c->enrollment_count ?? 0;
            }

            return [
                'id' => $c->id,
                // map DB columns to frontend-friendly names
                'name' => $c->course_name ?? null,
                'code' => $c->course_code ?? null,
                'description' => $c->description ?? null,
                'credits' => $c->units ?? null,
                'department' => $c->department ?? null,
                'semester' => $c->semester ?? null,
                // legacy teacher column stores a name string in this schema
                'teacher_name' => $c->teacher ?? null,
                'teacher_id' => $c->teacher_id ?? null,
                'max_students' => $c->max_students ?? null,
                'status' => $c->status ?? null,
                'enrollment_count' => $enrolled,
                'created_at' => $c->created_at ? $c->created_at->toDateTimeString() : null,
            ];
        });
        return response()->json(['courses' => $out]);
    }

    // Create a new course
    public function addCourse(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'nullable|string|max:64',
                'description' => 'nullable|string',
                'credits' => 'nullable|integer|min:0',
                'department' => 'nullable|string|max:255',
                'semester' => 'nullable|string|max:64',
                'teacher_id' => 'nullable|integer',
                'max_students' => 'nullable|integer|min:0',
                'status' => 'nullable|string|in:active,inactive,completed',
            ]);
        } catch (ValidationException $ve) {
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        }

        try {
            // map frontend fields to the existing schema: course_name, course_code, teacher, units
            $teacherName = null;
            if (!empty($validated['teacher_id'])) {
                $t = \App\Models\Teacher::find($validated['teacher_id']);
                if ($t) $teacherName = trim(($t->first_name ?? '') . ' ' . ($t->last_name ?? ''));
            }

            // Persist available fields (columns added by migration)
            $course = \App\Models\Course::create([
                'course_name' => $validated['name'],
                'course_code' => $validated['code'] ?? null,
                'description' => $validated['description'] ?? null,
                'units' => $validated['credits'] ?? 3,
                'department' => $validated['department'] ?? null,
                'semester' => $validated['semester'] ?? null,
                'max_students' => $validated['max_students'] ?? 0,
                'status' => $validated['status'] ?? 'active',
                'teacher' => $teacherName ?? null,
            ]);

            return response()->json(['message' => 'Course created', 'course' => [
                'id' => $course->id,
                'name' => $course->course_name,
                'code' => $course->course_code,
                'description' => $course->description,
                'credits' => $course->units,
                'department' => $course->department,
                'semester' => $course->semester,
                'teacher_name' => $course->teacher,
                'created_at' => $course->created_at ? $course->created_at->toDateTimeString() : null,
            ]], 201);
        } catch (\Exception $e) {
            Log::error('addCourse failed', ['error' => $e->getMessage(), 'payload' => $request->all()]);
            return response()->json(['message' => 'Server error while creating course.'], 500);
        }
    }

    // Enroll a student into a course
    public function enrollStudent(Request $request, $courseId)
    {
        try {
            $validated = $request->validate([
                'student_id' => 'required|integer|exists:students,id',
            ]);
        } catch (ValidationException $ve) {
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        }

        $course = \App\Models\Course::findOrFail($courseId);
        $student = \App\Models\Student::findOrFail($validated['student_id']);

        // Prevent student from enrolling into more than one course
        try {
            $existing = $student->courses()->count();
            if ($existing > 0) {
                return response()->json(['message' => 'Student is already enrolled in another course.'], 409);
            }
        } catch (\Exception $e) {
            // ignore and continue - fallback to attach unique constraint
        }

        try {
            // attach via pivot; unique constraint prevents duplicates
            $course->students()->attach($student->id);

            // update enrollment_count cached column if present (or compute on the fly)
            if (Schema::hasColumn('courses', 'enrollment_count')) {
                $course->enrollment_count = $course->students()->count();
                $course->save();
            }

            return response()->json(['message' => 'Student enrolled successfully', 'course_id' => $course->id, 'student_id' => $student->id]);
        } catch (\Illuminate\Database\QueryException $qe) {
            // unique violation -> already enrolled
            return response()->json(['message' => 'Student is already enrolled in this course.'], 409);
        } catch (\Exception $e) {
            Log::error('Enroll failed', ['error' => $e->getMessage(), 'course' => $courseId, 'student' => $validated['student_id']]);
            return response()->json(['message' => 'Server error while enrolling student.'], 500);
        }
    }

    // Return list of student ids that already have enrollments (any course)
    public function studentsWithEnrollments(Request $request)
    {
        try {
            $ids = \DB::table('course_student')->select('student_id')->distinct()->pluck('student_id')->toArray();
            return response()->json(['student_ids' => $ids]);
        } catch (\Exception $e) {
            Log::error('studentsWithEnrollments failed', ['error' => $e->getMessage()]);
            return response()->json(['student_ids' => []]);
        }
    }

    // Update an existing course
    public function updateCourse(Request $request, $courseId)
    {
        try {
            $course = \App\Models\Course::findOrFail($courseId);
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'nullable|string|max:64',
                'description' => 'nullable|string',
                'credits' => 'nullable|integer|min:0',
                'department' => 'nullable|string|max:255',
                'semester' => 'nullable|string|max:64',
                'teacher_id' => 'nullable|integer',
                'max_students' => 'nullable|integer|min:0',
                'status' => 'nullable|string|in:active,inactive,completed',
            ]);

            if (!empty($validated['teacher_id'])) {
                $t = \App\Models\Teacher::find($validated['teacher_id']);
                $teacherName = $t ? trim(($t->first_name ?? '') . ' ' . ($t->last_name ?? '')) : null;
            } else {
                $teacherName = null;
            }

            $course->course_name = $validated['name'];
            $course->course_code = $validated['code'] ?? $course->course_code;
            $course->description = $validated['description'] ?? $course->description;
            $course->units = $validated['credits'] ?? $course->units;
            $course->department = $validated['department'] ?? $course->department;
            $course->semester = $validated['semester'] ?? $course->semester;
            $course->max_students = $validated['max_students'] ?? $course->max_students;
            $course->status = $validated['status'] ?? $course->status;
            if ($teacherName !== null) $course->teacher = $teacherName;

            $course->save();

            return response()->json(['message' => 'Course updated', 'course' => [
                'id' => $course->id,
                'name' => $course->course_name,
                'code' => $course->course_code,
                'description' => $course->description,
                'credits' => $course->units,
                'department' => $course->department,
                'semester' => $course->semester,
                'teacher_name' => $course->teacher,
                'max_students' => $course->max_students,
                'status' => $course->status,
            ]]);
        } catch (ValidationException $ve) {
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        } catch (\Exception $e) {
            Log::error('updateCourse failed', ['error' => $e->getMessage(), 'payload' => $request->all()]);
            return response()->json(['message' => 'Server error while updating course.'], 500);
        }
    }

    // Delete a course
    public function deleteCourse(Request $request, $courseId)
    {
        try {
            $course = \App\Models\Course::findOrFail($courseId);
            $course->delete();
            return response()->json(['message' => 'Course deleted']);
        } catch (\Exception $e) {
            Log::error('deleteCourse failed', ['error' => $e->getMessage(), 'course' => $courseId]);
            return response()->json(['message' => 'Server error while deleting course.'], 500);
        }
    }

    // List enrollments for a course
    public function courseEnrollments(Request $request, $courseId)
    {
        $course = \App\Models\Course::findOrFail($courseId);
        $students = $course->students()->get()->map(function($s) {
            return [
                'id' => $s->id,
                'student_id' => $s->student_id,
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'name' => $s->first_name . ' ' . $s->last_name,
                'email' => $s->email,
            ];
        });
        return response()->json(['students' => $students]);
    }

    // Unenroll a student
    public function unenrollStudent(Request $request, $courseId)
    {
        try {
            $validated = $request->validate(['student_id' => 'required|integer|exists:students,id']);
        } catch (ValidationException $ve) {
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        }

        try {
            $course = \App\Models\Course::findOrFail($courseId);
            $course->students()->detach($validated['student_id']);
            return response()->json(['message' => 'Student unenrolled']);
        } catch (\Exception $e) {
            Log::error('unenrollStudent failed', ['error' => $e->getMessage(), 'course' => $courseId, 'student' => $validated['student_id']]);
            return response()->json(['message' => 'Server error while unenrolling student.'], 500);
        }
    }

    // Get all users
    public function index(Request $request)
    {
        // allow fetching archived users when requested
        $archived = $request->query('archived') == 1;

        // When asking for archived rows, return only trashed users. Previously
        // withTrashed() was used which returned both active and trashed rows and
        // caused the frontend to double-count (active + archived lists overlapped).
        if ($archived) {
            $query = User::onlyTrashed()->with(['student', 'teacher']);
        } else {
            $query = User::with(['student', 'teacher']);
        }

        $query = $query->orderBy('id', 'desc');

        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        return response()->json($query->get());
    }

    // Add user
    public function store(Request $request)
    {
        // Debug: log incoming payload to help diagnose why creations may not persist
        try { Log::debug('AdminController::store payload', ['payload' => $request->all()]); } catch(
            \Exception $e) { /* ignore logging failures */ }

        // Normalize name fields: if the frontend sent a combined `name` but omitted
        // `first_name` or `last_name`, derive and merge them into the request so
        // validation and DB writes always have non-null strings for required
        // profile columns.
        if ($request->filled('name')) {
            $nameParts = preg_split('/\\s+/', trim($request->input('name')));
            if (!$request->filled('first_name')) {
                $request->merge(['first_name' => $nameParts[0] ?? '']);
            }
            if (!$request->filled('last_name')) {
                $request->merge(['last_name' => count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '']);
            }
        }

        try {
            // Accept either a full 'name' or first_name+last_name combination from frontends.
            $validated = $request->validate([
                'name' => 'required_without:first_name|string|max:255',
                'first_name' => 'required_without:name|string|max:255',
                'last_name' => 'required_without:name|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'role' => 'required|in:student,teacher,admin',
            ]);
        } catch (ValidationException $ve) {
            Log::warning('Admin store initial validation failed', ['errors' => $ve->errors(), 'payload' => $request->all()]);
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        }
        // Build a safe full name regardless of whether the client sent 'name' or split fields
        $fullName = $request->input('name');
        if (!$fullName || trim($fullName) === '') {
            $fn = $request->input('first_name') ?: '';
            $ln = $request->input('last_name') ?: '';
            $fullName = trim($fn . ' ' . $ln);
        }
        if (!$fullName || trim($fullName) === '') {
            // As a last resort, default based on role so user creation never fails due to empty name
            $fullName = ($request->input('role') === 'teacher') ? 'Teacher Account' : 'Student Account';
        }
        // extra uniqueness checks for student/teacher identifiers so we can
        // return friendly 422 field errors to the frontend before attempting
        // the DB insert (avoids a generic 500 or a transaction rollback log noise).
        if (isset($validated['role']) && $validated['role'] === 'student') {
            $v = Validator::make($request->all(), [
                'student_id' => 'nullable|unique:students,student_id',
            ]);
            if ($v->fails()) {
                Log::warning('Admin store student id validation failed', ['errors' => $v->errors(), 'payload' => $request->all()]);
                return response()->json(['message' => 'The given data was invalid.', 'errors' => $v->errors()], 422);
            }
        }
        if (isset($validated['role']) && $validated['role'] === 'teacher') {
            $v = Validator::make($request->all(), [
                'teacher_id' => 'nullable|unique:teachers,teacher_id',
            ]);
            if ($v->fails()) {
                Log::warning('Admin store teacher id validation failed', ['errors' => $v->errors(), 'payload' => $request->all()]);
                return response()->json(['message' => 'The given data was invalid.', 'errors' => $v->errors()], 422);
            }
        }

        DB::beginTransaction();
        try {
            $user = User::create([
                'name' => $fullName,
                'email' => $validated['email'],
                'password' => bcrypt($validated['password']),
                'role' => $validated['role'],
                'is_locked' => false,
            ]);

            if ($validated['role'] === 'student') {
                // derive first/last name from provided (or computed) name when frontend omits them
                $nameParts = preg_split('/\s+/', trim($fullName));
                $derivedFirst = $request->input('first_name') ?: ($nameParts[0] ?? '');
                $derivedLast = $request->input('last_name') ?: (count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '');

                $studentData = [
                    'user_id' => $user->id,
                    // ensure student_id is always present; generate if missing
                    'student_id' => $request->input('student_id') ?: 'STU-' . strtoupper(uniqid()),
                    'first_name' => $derivedFirst,
                    'last_name' => $derivedLast,
                    'sex' => $request->input('sex') ?? null,
                    'email' => $request->input('email') ?: $user->email,
                    'date_of_birth' => $request->input('date_of_birth') ?: null,
                    'phone_number' => $request->input('phone_number') ?: null,
                    'address' => $request->input('address') ?: null,
                    'course' => $request->input('course') ?: null,
                    'department' => $request->input('department') ?: null,
                    'status' => $request->input('status') ?: 'Active',
                    'date_of_enrollment' => $request->input('date_of_enrollment') ?: now(),
                    'year_level' => $request->input('year_level') ?: null,
                ];

                try {
                    // Prefer linking by explicit student_id if provided and exists
                    $sid = $request->input('student_id');

                    // Also perform a pre-check for duplicate email since the students
                    // table enforces unique email in migration and we've seen many
                    // QueryExceptions for emails.
                    if (!empty($studentData['email'])) {
                        $emailOwner = Student::where('email', $studentData['email'])->first();
                        if ($emailOwner && $emailOwner->user_id && $emailOwner->user_id !== $user->id) {
                            DB::rollBack();
                            return response()->json(['message' => 'The given data was invalid.', 'errors' => ['email' => ['The email has already been taken.']]], 422);
                        }
                    }

                    if ($sid) {
                        $existingById = Student::where('student_id', $sid)->first();
                        if ($existingById) {
                            // If the student record exists but is already linked to another
                            // user, reject with a clear error.
                            if ($existingById->user_id && $existingById->user_id !== $user->id) {
                                DB::rollBack();
                                return response()->json(['message' => 'The given data was invalid.', 'errors' => ['student_id' => ['The student id is already linked to another account.']]], 422);
                            }
                            $existingById->user_id = $user->id;
                            $existingById->fill($studentData);
                            $existingById->save();
                        } else {
                            $created = Student::create($studentData);
                        }
                    } else {
                        // otherwise try linking by email if present
                        if (!empty($studentData['email'])) {
                            $existing = Student::where('email', $studentData['email'])->first();
                            if ($existing) {
                                if ($existing->user_id && $existing->user_id !== $user->id) {
                                    DB::rollBack();
                                    return response()->json(['message' => 'The given data was invalid.', 'errors' => ['email' => ['The email is already linked to another student.']]], 422);
                                }
                                $existing->user_id = $user->id;
                                $existing->fill($studentData);
                                $existing->save();
                            } else {
                                $created = Student::create($studentData);
                            }
                        } else {
                            $created = Student::create($studentData);
                        }
                    }
                } catch (QueryException $qe) {
                    // convert DB uniqueness errors into 422 so frontend can show field errors
                    Log::error('Student create QueryException', ['error' => $qe->getMessage(), 'data' => $studentData]);
                    DB::rollBack();
                    $msg = $qe->getMessage();
                    if (stripos($msg, 'student_id') !== false || stripos($msg, 'students_student_id_unique') !== false) {
                        return response()->json(['message' => 'The given data was invalid.', 'errors' => ['student_id' => ['The student id has already been taken.']]], 422);
                    }
                    if (stripos($msg, 'email') !== false || stripos($msg, 'students_email_unique') !== false) {
                        return response()->json(['message' => 'The given data was invalid.', 'errors' => ['email' => ['The email has already been taken.']]], 422);
                    }
                    return response()->json(['message' => 'Database error while creating student.'], 500);
                }
            }

            if ($validated['role'] === 'teacher') {
                // derive first/last name from provided (or computed) name when frontend omits them
                $namePartsT = preg_split('/\s+/', trim($fullName));
                $derivedFirstT = $request->input('first_name') ?: ($namePartsT[0] ?? '');
                $derivedLastT = $request->input('last_name') ?: (count($namePartsT) > 1 ? implode(' ', array_slice($namePartsT, 1)) : '');

                $teacherData = [
                    'user_id' => $user->id,
                    // prefer teacher_id but accept legacy faculty_id from older frontends
                    'teacher_id' => $request->input('teacher_id') ?: $request->input('faculty_id') ?: 'TEA-' . strtoupper(uniqid()),
                    'first_name' => $derivedFirstT,
                    'last_name' => $derivedLastT,
                    'sex' => $request->input('sex') ?? null,
                    'email' => $request->input('email') ?: $user->email,
                    'date_of_birth' => $request->input('date_of_birth') ?: null,
                    'phone_number' => $request->input('phone_number') ?: null,
                    'address' => $request->input('address') ?: null,
                    'department' => $request->input('department') ?: null,
                    'status' => $request->input('status') ?: 'Active',
                    'courses_handled' => $request->input('courses_handled') ?: null,
                    'position' => $request->input('position') ?: null,
                ];

                try {
                    // ensure required name fields are not empty (DB may require non-null)
                    if (empty(trim((string)($teacherData['first_name'] ?? '')))) {
                        $teacherData['first_name'] = ($derivedFirstT ?: 'Teacher');
                    }
                    if (empty(trim((string)($teacherData['last_name'] ?? '')))) {
                        $teacherData['last_name'] = ($derivedLastT ?: 'Account');
                    }
                    $tid = $request->input('teacher_id') ?: $request->input('faculty_id');
                    if ($tid) {
                        $existingById = Teacher::where('teacher_id', $tid)->first();
                        if ($existingById) {
                            $existingById->user_id = $user->id;
                            $existingById->save();
                        } else {
                            Teacher::create($teacherData);
                        }
                    } else {
                        if (!empty($teacherData['email'])) {
                            $existingT = Teacher::where('email', $teacherData['email'])->first();
                            if ($existingT) {
                                $existingT->user_id = $user->id;
                                $existingT->save();
                            } else {
                                Teacher::create($teacherData);
                            }
                        } else {
                            Teacher::create($teacherData);
                        }
                    }
                } catch (QueryException $qe) {
                    Log::error('Teacher create QueryException', ['error' => $qe->getMessage(), 'data' => $teacherData]);
                    DB::rollBack();
                    $msg = $qe->getMessage();
                    if (stripos($msg, 'teacher_id') !== false || stripos($msg, 'teachers_teacher_id_unique') !== false) {
                        return response()->json(['message' => 'The given data was invalid.', 'errors' => ['teacher_id' => ['The teacher id has already been taken.']]], 422);
                    }
                    return response()->json(['message' => 'Database error while creating teacher.'], 500);
                }
            }

            DB::commit();

            // Log a simple system activity for UI
            try {
                SystemActivity::create([
                    'action' => 'user_created',
                    // performed_by column is non-nullable string in migration; write a safe string
                    'performed_by' => auth()->id() ? (string)auth()->id() : 'system',
                    'details' => 'Created user id=' . $user->id . ' role=' . $user->role
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to record system activity', ['error' => $e->getMessage()]);
            }

            $stats = [
                'total_students' => Student::count(),
                'total_teachers' => Teacher::count(),
                'locked_accounts' => User::where('is_locked', true)->count(),
                'archived_accounts' => User::onlyTrashed()->count(),
            ];

            return response()->json(['message' => 'User added successfully', 'user' => $user, 'stats' => $stats]);
        } catch (ValidationException $ve) {
            DB::rollBack();
            // Return validation errors to client with 422 so UI can show messages
            Log::warning('Admin store validation failed', ['errors' => $ve->errors(), 'payload' => $request->all()]);
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Admin store failed', ['error' => $e->getMessage(), 'payload' => $request->all()]);
            return response()->json(['message' => 'Server error while creating user. Check logs.'], 500);
        }
    }

    // Update user
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Normalize incoming name fields the same way as store(), to avoid
        // attempting to write NULL into non-nullable profile columns.
        if ($request->filled('name')) {
            $nameParts = preg_split('/\\s+/', trim($request->input('name')));
            if (!$request->filled('first_name')) {
                $request->merge(['first_name' => $nameParts[0] ?? '']);
            }
            if (!$request->filled('last_name')) {
                $request->merge(['last_name' => count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '']);
            }
        }

        $targetRole = $request->input('role', $user->role);

        try {
            $emailRules = [Rule::unique('users', 'email')->ignore($user->id)];
            if ($targetRole === 'student') {
                $emailRules[] = Rule::unique('students', 'email')->ignore(optional($user->student)->id);
            } elseif ($targetRole === 'teacher') {
                $emailRules[] = Rule::unique('teachers', 'email')->ignore(optional($user->teacher)->id);
            }

            $rules = [
                'name' => ['required_without:first_name', 'string', 'max:255'],
                'first_name' => ['required_without:name', 'string', 'max:255'],
                'last_name' => ['required_without:name', 'string', 'max:255'],
                'email' => array_merge(['required', 'email'], $emailRules),
                'role' => ['sometimes', Rule::in(['student', 'teacher', 'admin'])],
            ];

            if ($targetRole === 'student') {
                $rules['student_id'] = ['nullable', 'string', 'max:255', Rule::unique('students', 'student_id')->ignore(optional($user->student)->id)];
            }

            if ($targetRole === 'teacher') {
                $rules['teacher_id'] = ['nullable', 'string', 'max:255', Rule::unique('teachers', 'teacher_id')->ignore(optional($user->teacher)->id)];
                $rules['faculty_id'] = ['nullable', 'string', 'max:255', Rule::unique('teachers', 'teacher_id')->ignore(optional($user->teacher)->id)];
            }

            $validated = $request->validate($rules);
        } catch (ValidationException $ve) {
            Log::warning('Admin update validation failed', ['errors' => $ve->errors(), 'payload' => $request->all(), 'id' => $id]);
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $targetRole = $validated['role'] ?? $targetRole;

            $firstName = $request->input('first_name');
            $lastName = $request->input('last_name');
            $sourceName = $request->filled('name') ? $request->input('name') : ($user->name ?? '');
            $nameParts = $sourceName !== '' ? preg_split('/\s+/', trim((string) $sourceName)) : [];
            if (!$firstName || !$lastName) {
                if ($firstName === null && $user->student) {
                    $firstName = $user->student->first_name;
                }
                if ($lastName === null && $user->student) {
                    $lastName = $user->student->last_name;
                }
                if ($firstName === null && $user->teacher) {
                    $firstName = $user->teacher->first_name;
                }
                if ($lastName === null && $user->teacher) {
                    $lastName = $user->teacher->last_name;
                }
            }
            if ((!$firstName || !$lastName) && !empty($nameParts)) {
                $firstName = $firstName ?: ($nameParts[0] ?? '');
                $lastName = $lastName ?: (count($nameParts) > 1 ? implode(' ', array_slice((array) $nameParts, 1)) : '');
            }

            if ($request->has('name')) {
                $user->name = $request->input('name');
            } elseif ($firstName || $lastName) {
                $user->name = trim($firstName . ' ' . $lastName) ?: $user->name;
            }

            if ($request->has('email')) {
                $user->email = $request->input('email');
            }

            if ($request->has('role')) {
                $user->role = $targetRole;
            }

            $user->save();

            if ($targetRole === 'student') {
                $student = $user->student ?: new Student();
                if (!$student->exists) {
                    $student->user_id = $user->id;
                }
                $student->student_id = $request->input('student_id') ?: ($student->student_id ?: 'STU-' . strtoupper(uniqid()));
                $student->first_name = $firstName ?: ($student->first_name ?: '');
                $student->last_name = $lastName ?: ($student->last_name ?: '');
                if (trim($student->first_name) === '' && trim($student->last_name) === '') {
                    $student->first_name = $nameParts[0] ?? 'Student';
                    $student->last_name = (count($nameParts) > 1 ? implode(' ', array_slice((array) $nameParts, 1)) : '') ?: 'Account';
                }
                $student->email = $user->email;

                foreach (['sex', 'date_of_birth', 'phone_number', 'address', 'course', 'department', 'status', 'date_of_enrollment', 'year_level'] as $field) {
                    if ($request->has($field)) {
                        $student->{$field} = $request->input($field);
                    }
                }

                $student->save();
            } elseif ($targetRole === 'teacher') {
                $teacher = $user->teacher ?: new Teacher();
                if (!$teacher->exists) {
                    $teacher->user_id = $user->id;
                }
                $teacherId = $request->input('teacher_id') ?: $request->input('faculty_id');
                $teacher->teacher_id = $teacherId ?: ($teacher->teacher_id ?: 'TEA-' . strtoupper(uniqid()));
                $teacher->first_name = $firstName ?: ($teacher->first_name ?: '');
                $teacher->last_name = $lastName ?: ($teacher->last_name ?: '');
                if (trim($teacher->first_name) === '' && trim($teacher->last_name) === '') {
                    $teacher->first_name = $nameParts[0] ?? 'Teacher';
                    $teacher->last_name = (count($nameParts) > 1 ? implode(' ', array_slice((array) $nameParts, 1)) : '') ?: 'Account';
                }
                $teacher->email = $user->email;

                foreach (['sex', 'date_of_birth', 'phone_number', 'address', 'department', 'status', 'courses_handled', 'position', 'course'] as $field) {
                    if ($request->has($field)) {
                        $teacher->{$field} = $request->input($field);
                    }
                }

                $teacher->save();
            }

            DB::commit();

            try {
                SystemActivity::create([
                    'action' => 'user_updated',
                    'performed_by' => auth()->id() ? (string)auth()->id() : 'system',
                    'details' => 'Updated user id=' . $id
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to record system activity', ['error' => $e->getMessage()]);
            }

            $stats = [
                'total_students' => Student::count(),
                'total_teachers' => Teacher::count(),
                'locked_accounts' => User::where('is_locked', true)->count(),
                'archived_accounts' => User::onlyTrashed()->count(),
            ];

            return response()->json(['message' => 'User updated successfully', 'stats' => $stats]);
        } catch (ValidationException $ve) {
            DB::rollBack();
            Log::warning('Admin update validation failed', ['errors' => $ve->errors(), 'payload' => $request->all(), 'id' => $id]);
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $ve->errors()], 422);
        } catch (QueryException $qe) {
            DB::rollBack();
            $msg = $qe->getMessage();
            Log::error('Admin update query failed', ['error' => $msg, 'payload' => $request->all(), 'id' => $id]);

            if (stripos($msg, 'users_email_unique') !== false) {
                return response()->json(['message' => 'The given data was invalid.', 'errors' => ['email' => ['The email has already been taken.']]], 422);
            }
            if (stripos($msg, 'students_student_id_unique') !== false || stripos($msg, 'student_id') !== false) {
                return response()->json(['message' => 'The given data was invalid.', 'errors' => ['student_id' => ['The student id has already been taken.']]], 422);
            }
            if (stripos($msg, 'teachers_teacher_id_unique') !== false || stripos($msg, 'teacher_id') !== false) {
                return response()->json(['message' => 'The given data was invalid.', 'errors' => ['teacher_id' => ['The teacher id has already been taken.']]], 422);
            }
            if (stripos($msg, 'students_email_unique') !== false || stripos($msg, 'teachers_email_unique') !== false) {
                return response()->json(['message' => 'The given data was invalid.', 'errors' => ['email' => ['The email has already been linked to another profile.']]], 422);
            }

            return response()->json(['message' => 'Database error while updating user.'], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Admin update failed', ['error' => $e->getMessage(), 'payload' => $request->all(), 'id' => $id]);
            return response()->json(['message' => 'Server error while updating user. Check logs.'], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        // Support soft-delete (archive) and force deletion via ?force=1
        $force = $request->query('force') == 1 || $request->input('force') == 1;

        // Try to find including trashed when force-deleting
        $user = $force ? User::withTrashed()->findOrFail($id) : User::findOrFail($id);

        if ($force) {
            // remove related profiles (students/teachers) if present
            try {
                if ($user->student) {
                    // attempt to delete student record permanently
                    $user->student->delete();
                }
            } catch (\Exception $e) {
                Log::warning('Failed to delete student profile during force delete', ['id' => $user->id, 'error' => $e->getMessage()]);
            }

            try {
                if ($user->teacher) {
                    $user->teacher->delete();
                }
            } catch (\Exception $e) {
                Log::warning('Failed to delete teacher profile during force delete', ['id' => $user->id, 'error' => $e->getMessage()]);
            }

            // permanently remove the user from DB
            $user->forceDelete();
            try { SystemActivity::create(['action' => 'user_deleted', 'performed_by' => auth()->id() ? (string)auth()->id() : 'system', 'details' => 'Permanently deleted user id=' . $id]); } catch (\Exception $e) {}
            return response()->json(['message' => 'User permanently deleted']);
        }

        // Soft delete / archive
        if ($user->deleted_at) {
            // already archived
            return response()->json(['message' => 'User is already archived'], 400);
        }

        $user->delete();
    try { SystemActivity::create(['action' => 'user_archived', 'performed_by' => auth()->id() ? (string)auth()->id() : 'system', 'details' => 'Archived user id=' . $id]); } catch (\Exception $e) {}
        return response()->json(['message' => 'User archived successfully']);
    }

    public function restore($id)
    {
        $user = User::withTrashed()->findOrFail($id);
        $user->restore();
        return response()->json(['message' => 'User restored successfully']);
    }

    // Lock a user account
    public function lock($id)
    {
    try { Log::info('AdminController::lock called', ['id' => $id, 'requester' => auth()->id(), 'ip' => request()->ip(), 'time' => now()->toDateTimeString()]); } catch (\Exception $e) {}
        $user = User::findOrFail($id);
        $user->is_locked = true;
        $user->save();

        $stats = [
            'total_students' => Student::count(),
            'total_teachers' => Teacher::count(),
            'locked_accounts' => User::where('is_locked', true)->count(),
            'archived_accounts' => User::onlyTrashed()->count(),
        ];

    try { SystemActivity::create(['action' => 'user_locked', 'performed_by' => auth()->id() ? (string)auth()->id() : 'system', 'details' => 'Locked user id=' . $id]); } catch (\Exception $e) {}
        return response()->json(['message' => 'User locked', 'stats' => $stats]);
    }

    // Unlock a user account
    public function unlock($id)
    {
    try { Log::info('AdminController::unlock called', ['id' => $id, 'requester' => auth()->id(), 'ip' => request()->ip(), 'time' => now()->toDateTimeString()]); } catch (\Exception $e) {}
        $user = User::findOrFail($id);
        $user->is_locked = false;
        $user->save();

        $stats = [
            'total_students' => Student::count(),
            'total_teachers' => Teacher::count(),
            'locked_accounts' => User::where('is_locked', true)->count(),
            'archived_accounts' => User::onlyTrashed()->count(),
        ];

    try { SystemActivity::create(['action' => 'user_unlocked', 'performed_by' => auth()->id() ? (string)auth()->id() : 'system', 'details' => 'Unlocked user id=' . $id]); } catch (\Exception $e) {}
        return response()->json(['message' => 'User unlocked', 'stats' => $stats]);
    }

    // Toggle lock
    public function toggleLock($id)
    {
    try { Log::info('AdminController::toggleLock called', ['id' => $id, 'requester' => auth()->id(), 'ip' => request()->ip(), 'time' => now()->toDateTimeString()]); } catch (\Exception $e) {}
        $user = User::findOrFail($id);
        $user->is_locked = !$user->is_locked;
        $user->save();

        $stats = [
            'total_students' => Student::count(),
            'total_teachers' => Teacher::count(),
            'locked_accounts' => User::where('is_locked', true)->count(),
            'archived_accounts' => User::onlyTrashed()->count(),
        ];

    try { SystemActivity::create(['action' => 'user_lock_toggled', 'performed_by' => auth()->id() ? (string)auth()->id() : 'system', 'details' => 'Toggled lock for user id=' . $id]); } catch (\Exception $e) {}
        return response()->json(['message' => 'User lock toggled', 'stats' => $stats]);
    }

    // Return recent system activities for dashboard
    public function activities(Request $request)
    {
        $limit = intval($request->query('limit', 20));
        $rows = SystemActivity::orderBy('created_at', 'desc')->limit($limit)->get();
        // map to lightweight objects for the client
        $out = $rows->map(function($r) {
            return [
                'id' => $r->id,
                'action' => $r->action,
                'details' => $r->details,
                'performed_by' => $r->performed_by,
                'created_at' => $r->created_at->diffForHumans(),
                'time' => $r->created_at->diffForHumans(),
                'title' => ucfirst(str_replace('_',' ', $r->action)),
            ];
        });
        return response()->json($out);
    }

    // List documents
    public function documents(Request $request)
    {
        $docs = Document::orderBy('created_at', 'desc')->get()->map(function($d) {
            // Calculate file size
            $fileSize = $d->size ? round($d->size / 1024) : 0;
            $sizeStr = $fileSize < 1024 ? $fileSize . ' KB' : round($fileSize / 1024, 1) . ' MB';
            
            // Get file type from mime or title
            $type = 'pdf';
            if ($d->mime) {
                if (strpos($d->mime, 'pdf') !== false) $type = 'pdf';
                elseif (strpos($d->mime, 'word') !== false || strpos($d->mime, 'doc') !== false) $type = 'word';
                elseif (strpos($d->mime, 'sheet') !== false || strpos($d->mime, 'excel') !== false) $type = 'excel';
            }
            
            return [
                'id' => $d->id,
                'title' => $d->title,
                'description' => $d->description,
                'mime' => $d->mime,
                'size' => $sizeStr,
                'type' => $type,
                'category' => $d->category ?? 'General',
                'author' => 'Admin',
                'date' => $d->created_at ? $d->created_at->format('M d, Y') : '',
                'visibility' => $d->visibility,
                'url' => $d->url,
                'path' => $d->path,
                'share_token' => $d->share_token,
                'share_link' => $d->share_link,
                'starred' => $d->starred,
                'created_at' => $d->created_at->toDateTimeString(),
            ];
        });
        return response()->json(['documents' => $docs]);
    }

    // Store uploaded document(s)
    public function storeDocument(Request $request)
    {
    // support single or multiple files (accept 'files' or 'files[]' keys)
    $files = $request->file('files') ?: $request->file('files[]');
        if (!$files) {
            return response()->json(['message' => 'No files uploaded'], 400);
        }

        // Get category, author, and description from request
        $category = $request->input('category', 'General');
        $author = $request->input('author', 'Admin');
        $description = $request->input('description', '');

        $saved = [];
        $files = is_array($files) ? $files : [$files];
        foreach ($files as $file) {
            try {
                $path = $file->store('documents');
                
                // Build document description with size and custom description
                $fileSize = round($file->getSize() / 1024);
                $sizeStr = $fileSize < 1024 ? $fileSize . ' KB' : round($fileSize / 1024, 1) . ' MB';
                $docDescription = $description ?: ($file->getClientOriginalExtension() . ' • ' . $sizeStr);
                
                $doc = Document::create([
                    'title' => $file->getClientOriginalName(),
                    'description' => $docDescription,
                    'path' => $path,
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'visibility' => 'Public',
                    'created_by' => auth()->id() ?: null,
                    'category' => $category,
                ]);

                // record activity
                try { SystemActivity::create(['action' => 'document_uploaded', 'performed_by' => auth()->id() ? (string)auth()->id() : 'system', 'details' => 'Uploaded document id=' . $doc->id . ' title=' . $doc->title . ' category=' . $category]); } catch (\Exception $e) {}

                $saved[] = [
                    'id' => $doc->id,
                    'title' => $doc->title,
                    'description' => $doc->description,
                    'mime' => $doc->mime,
                    'size' => $sizeStr,
                    'type' => $file->getClientOriginalExtension(),
                    'category' => $category,
                    'author' => $author,
                    'date' => $doc->created_at->format('Y-m-d'),
                    'visibility' => $doc->visibility,
                    'url' => $doc->url,
                    'created_at' => $doc->created_at->toDateTimeString(),
                ];
            } catch (\Exception $e) {
                Log::error('Document upload failed', ['error' => $e->getMessage()]);
            }
        }

        return response()->json(['documents' => $saved]);
    }

    // Return a single document metadata
    public function document($id)
    {
        $d = Document::findOrFail($id);
        return response()->json([
            'id' => $d->id,
            'title' => $d->title,
            'description' => $d->description,
            'mime' => $d->mime,
            'size' => $d->size,
            'visibility' => $d->visibility,
            'url' => $d->url,
            'created_at' => $d->created_at->toDateTimeString(),
            'uploaded_by' => $d->created_by,
        ]);
    }

    // Update a document
    public function updateDocument(Request $request, $id)
    {
        $d = Document::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string|nullable',
            'visibility' => 'sometimes|string|in:Public,Private,Shared',
            'category' => 'sometimes|string|max:255',
            'starred' => 'sometimes|boolean',
        ]);

        $d->update($validated);

        // Log activity
        try {
            SystemActivity::create([
                'action' => 'document_updated',
                'performed_by' => auth()->id() ? (string)auth()->id() : 'system',
                'details' => 'Updated document id=' . $d->id . ' title=' . $d->title
            ]);
        } catch (\Exception $e) {}

        return response()->json([
            'message' => 'Document updated successfully',
            'document' => [
                'id' => $d->id,
                'title' => $d->title,
                'description' => $d->description,
                'visibility' => $d->visibility,
                'category' => $d->category,
                'starred' => $d->starred,
            ]
        ]);
    }

    // Download a document file
    public function downloadDocument($id)
    {
        $d = Document::findOrFail($id);
        if (!Storage::exists($d->path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        // Stream download with original filename
        return Storage::download($d->path, $d->title);
    }

    // Generate a shareable link for a document
    public function generateShareLink($id)
    {
        $doc = Document::findOrFail($id);
        
        // Generate token if doesn't exist
        if (!$doc->share_token) {
            $doc->generateShareToken();
        }

        // Log activity
        try {
            SystemActivity::create([
                'action' => 'document_share_link_generated',
                'performed_by' => auth()->id() ? (string)auth()->id() : 'system',
                'details' => 'Generated share link for document id=' . $doc->id . ' title=' . $doc->title
            ]);
        } catch (\Exception $e) {}

        return response()->json([
            'share_link' => $doc->share_link,
            'share_token' => $doc->share_token,
            'message' => 'Share link generated successfully'
        ]);
    }

    // Revoke share link
    public function revokeShareLink($id)
    {
        $doc = Document::findOrFail($id);
        $doc->share_token = null;
        $doc->share_expires_at = null;
        $doc->save();

        return response()->json(['message' => 'Share link revoked successfully']);
    }
}
