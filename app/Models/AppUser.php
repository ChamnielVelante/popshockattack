<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class AppUser extends Authenticatable
{
    use HasApiTokens;

    // Allow mass assignment for these specific columns
    protected $fillable = ['username', 'password', 'role', 'status'];

    // Never expose the password hash in JSON responses
    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            // Automatically bcrypt-hashes on set, verifies via Hash::check on read
            'password' => 'hashed',
        ];
    }
}