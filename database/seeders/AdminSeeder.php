<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Admin;

class AdminSeeder extends Seeder
{
    public function run()
    {
        // ✅ Create or update the built-in admin user
        $user = User::updateOrCreate(
            ['email' => 'admin@urios.gmail.com'], // admin email
            [
                'name' => 'System Admin',
                'password' => Hash::make('admin123'), // admin password
                'role' => 'admin',
                'is_locked' => false,
                'is_archived' => false,
            ]
        );

        // ✅ Ensure Admin profile exists (optional, if you have an admins table)
        if (class_exists(Admin::class)) {
            Admin::updateOrCreate(['user_id' => $user->id]);
        }
    }
}
