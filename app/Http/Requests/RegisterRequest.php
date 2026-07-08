<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // public endpoint
    }

    public function rules(): array
    {
        return [
            'username' => 'required|string|min:3|max:50|unique:app_users,username',
            'password' => 'required|string|min:6',
        ];
    }
}
