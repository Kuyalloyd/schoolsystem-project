<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('teachers', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('user_id')->nullable();
    $table->string('teacher_id')->unique();
    $table->string('first_name');
    $table->string('last_name');
    $table->string('sex')->nullable();
    $table->string('email')->unique();
    $table->date('date_of_birth')->nullable();
    $table->string('phone_number')->nullable();
    $table->string('address')->nullable();
    $table->string('course')->nullable();
    $table->string('department')->nullable();
    $table->string('status')->default('Active');
    $table->string('courses_handled')->nullable();
    $table->string('position')->nullable();
    $table->timestamps();
});

    }

    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn([
                'first_name', 'last_name', 'sex', 'email', 'date_of_birth', 'phone_number',
                'address', 'course', 'department', 'status', 'courses_handled', 'position'
            ]);
        });
    }
};
