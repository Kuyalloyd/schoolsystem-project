<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('student'); // 👈 role field
            $table->boolean('is_locked')->default(false); // 👈 lock control
            $table->boolean('is_archived')->default(false); // 👈 archive status
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes(); // 👈 enable soft delete
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
