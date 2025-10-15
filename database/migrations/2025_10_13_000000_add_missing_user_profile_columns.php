<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddMissingUserProfileColumns extends Migration
{
	/**
	 * Run the migrations.
	 */
	public function up(): void
	{
		// Intentionally left minimal: if columns are missing this migration
		// can be extended to add them. For now it's a no-op to allow
		// migrations to proceed in environments where the columns already exist.
		if (!Schema::hasTable('users')) {
			return;
		}

		Schema::table('users', function (Blueprint $table) {
			if (!Schema::hasColumn('users', 'is_locked')) {
				$table->boolean('is_locked')->default(false)->after('role');
			}
			if (!Schema::hasColumn('users', 'is_archived')) {
				$table->boolean('is_archived')->default(false)->after('is_locked');
			}
		});
	}

	/**
	 * Reverse the migrations.
	 */
	public function down(): void
	{
		if (!Schema::hasTable('users')) {
			return;
		}

		Schema::table('users', function (Blueprint $table) {
			if (Schema::hasColumn('users', 'is_archived')) {
				$table->dropColumn('is_archived');
			}
			if (Schema::hasColumn('users', 'is_locked')) {
				$table->dropColumn('is_locked');
			}
		});
	}
}
