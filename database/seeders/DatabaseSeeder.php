<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run()
    {
        // ✅ Only seed the admin user
        $this->call([
            AdminSeeder::class,
        ]);
    }
}
