<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('courses', function (Blueprint $table) {
            if (!Schema::hasColumn('courses', 'description')) {
                $table->text('description')->nullable()->after('course_code');
            }
            if (!Schema::hasColumn('courses', 'department')) {
                $table->string('department')->nullable()->after('description');
            }
            if (!Schema::hasColumn('courses', 'semester')) {
                $table->string('semester')->nullable()->after('department');
            }
            if (!Schema::hasColumn('courses', 'max_students')) {
                $table->integer('max_students')->default(0)->after('units');
            }
            if (!Schema::hasColumn('courses', 'status')) {
                $table->string('status')->default('active')->after('max_students');
            }
        });

        // pivot table for enrollments
        if (!Schema::hasTable('course_student')) {
            Schema::create('course_student', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('course_id');
                $table->unsignedBigInteger('student_id');
                $table->timestamps();

                $table->foreign('course_id')->references('id')->on('courses')->onDelete('cascade');
                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');

                $table->unique(['course_id','student_id']);
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('course_student')) {
            Schema::dropIfExists('course_student');
        }
        Schema::table('courses', function (Blueprint $table) {
            if (Schema::hasColumn('courses', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('courses', 'max_students')) {
                $table->dropColumn('max_students');
            }
            if (Schema::hasColumn('courses', 'semester')) {
                $table->dropColumn('semester');
            }
            if (Schema::hasColumn('courses', 'department')) {
                $table->dropColumn('department');
            }
            if (Schema::hasColumn('courses', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};
