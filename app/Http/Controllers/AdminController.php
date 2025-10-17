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
use Illuminate\Support\Facades\Validator;
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
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => bcrypt($validated['password']),
                'role' => $validated['role'],
                'is_locked' => false,
            ]);

            if ($validated['role'] === 'student') {
                // derive first/last name from provided name when frontend omits them
                $nameParts = preg_split('/\s+/', trim($validated['name']));
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
                // derive first/last name from provided name when frontend omits them
                $namePartsT = preg_split('/\s+/', trim($validated['name']));
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

        DB::beginTransaction();
        try {
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

            $user->update($request->only(['name', 'email', 'role']));

            // ensure profile exists for role and update available fields
            if ($user->role === 'student') {
                if (!$user->student) {
                    Student::create(['user_id' => $user->id, 'student_id' => $request->input('student_id') ?? 'STU-' . strtoupper(uniqid())]);
                }
                // only update fields that are provided (and not null) to avoid wiping required columns
                $studentUpdates = array_filter($request->only(['student_id','first_name','last_name','sex','date_of_birth','phone_number','address','course','department','status','year_level','date_of_enrollment']), function ($v) { return !is_null($v); });
                if (!empty($studentUpdates)) $user->student->update($studentUpdates);
            } elseif ($user->role === 'teacher') {
                if (!$user->teacher) {
                    Teacher::create(['user_id' => $user->id, 'teacher_id' => $request->input('teacher_id') ?? $request->input('faculty_id') ?? 'TEA-' . strtoupper(uniqid())]);
                }
                $teacherUpdates = array_filter($request->only(['teacher_id','first_name','last_name','sex','date_of_birth','phone_number','address','department','status','courses_handled','position','highest_degree','specialization']), function ($v) { return !is_null($v); });
                if (!empty($teacherUpdates)) $user->teacher->update($teacherUpdates);
            }

            DB::commit();

            // Log activity
            try {
                SystemActivity::create([
                    'action' => 'user_updated',
                    'performed_by' => auth()->id() ? (string)auth()->id() : 'system',
                    'details' => 'Updated user id=' . $id
                ]);
            } catch (\Exception $e) { Log::warning('Failed to record system activity', ['error' => $e->getMessage()]); }

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
            return [
                'id' => $d->id,
                'title' => $d->title,
                'description' => $d->description,
                'mime' => $d->mime,
                'size' => $d->size,
                'visibility' => $d->visibility,
                'url' => $d->url,
                'created_at' => $d->created_at->toDateTimeString(),
            ];
        });
        return response()->json($docs);
    }

    // Store uploaded document(s)
    public function storeDocument(Request $request)
    {
    // support single or multiple files (accept 'files' or 'files[]' keys)
    $files = $request->file('files') ?: $request->file('files[]');
        if (!$files) {
            return response()->json(['message' => 'No files uploaded'], 400);
        }

        $saved = [];
        $files = is_array($files) ? $files : [$files];
        foreach ($files as $file) {
            try {
                $path = $file->store('documents');
                $doc = Document::create([
                    'title' => $file->getClientOriginalName(),
                    'description' => $file->getClientOriginalExtension() . ' • ' . round($file->getSize() / 1024) . ' KB',
                    'path' => $path,
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'visibility' => 'Public',
                    'created_by' => auth()->id() ?: null,
                ]);

                // record activity
                try { SystemActivity::create(['action' => 'document_uploaded', 'performed_by' => auth()->id() ? (string)auth()->id() : 'system', 'details' => 'Uploaded document id=' . $doc->id . ' title=' . $doc->title]); } catch (\Exception $e) {}

                $saved[] = [
                    'id' => $doc->id,
                    'title' => $doc->title,
                    'description' => $doc->description,
                    'mime' => $doc->mime,
                    'size' => $doc->size,
                    'visibility' => $doc->visibility,
                    'url' => $doc->url,
                    'created_at' => $doc->created_at->toDateTimeString(),
                ];
            } catch (\Exception $e) {
                Log::error('Document upload failed', ['error' => $e->getMessage()]);
            }
        }

        return response()->json(['uploaded' => $saved]);
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
}
