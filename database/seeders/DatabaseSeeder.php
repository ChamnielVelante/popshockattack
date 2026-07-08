<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call your custom shop seeders
        $this->call([
            InventorySeeder::class,
            AppUserSeeder::class,
        ]);
    }
}
