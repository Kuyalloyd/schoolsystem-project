<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Student;

class AdminCreateStudentTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_student()
    {
        // create an admin user and act as them
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $payload = [
            'name' => 'Test Student',
            'first_name' => 'Test',
            'last_name' => 'Student',
            'email' => 'teststudent@example.com',
            'password' => 'secret123',
            'role' => 'student',
            'student_id' => 'STU-TEST-001',
            'date_of_birth' => '2000-01-01',
            'phone_number' => '09123456789',
            'address' => '123 Test Ave',
            'course' => 'it',
            'year_level' => 'Freshman',
        ];

        $response = $this->postJson('/api/admin/users', $payload);
        $response->assertStatus(200);
        $response->assertJson(['message' => 'User added successfully']);

        $this->assertDatabaseHas('users', ['email' => 'teststudent@example.com']);
        $this->assertDatabaseHas('students', ['student_id' => 'STU-TEST-001', 'email' => 'teststudent@example.com']);
    }
}
