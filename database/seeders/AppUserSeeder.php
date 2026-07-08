<?php

namespace Database\Seeders;

use App\Models\AppUser;
use Illuminate\Database\Seeder;

class AppUserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['username' => 'admin', 'password' => 'admin123', 'role' => 'admin', 'status' => 'approved'],
            ['username' => 'staff', 'password' => 'staff123', 'role' => 'staff', 'status' => 'approved'],
            ['username' => 'juan_rider', 'password' => 'pass123', 'role' => 'customer', 'status' => 'approved'],
        ];

        foreach ($users as $user) {
            AppUser::create($user);
        }
    }
}
