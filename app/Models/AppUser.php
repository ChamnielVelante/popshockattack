<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class AppUser extends Model
{
    // Allow mass assignment for these specific columns
    protected $fillable = ['username', 'password', 'role','status'];
}