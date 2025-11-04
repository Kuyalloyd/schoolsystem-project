<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        if (!Schema::hasTable('documents')) {
            Schema::create('documents', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('path')->nullable();
                $table->string('mime')->nullable();
                $table->integer('size')->default(0);
                // visibility is expected by later migrations
                $table->string('visibility')->default('private');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                // optional: index on created_by for lookups
                $table->index('created_by');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('documents');
    }
};
