<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Existing seeded/registered users had their passwords stored as plain text.
        // Hash any row that isn't already a bcrypt hash so Hash::check() works going forward.
        foreach (DB::table('app_users')->select('id', 'password')->get() as $user) {
            if (! str_starts_with($user->password, '$2y$')) {
                DB::table('app_users')
                    ->where('id', $user->id)
                    ->update(['password' => Hash::make($user->password)]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Hashing is not reversible.
    }
};
