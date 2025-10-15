<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('user_id')->nullable();
    $table->string('student_id')->unique();
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
    $table->date('date_of_enrollment')->nullable();
    $table->string('year_level')->nullable();
    $table->timestamps();
});

    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
