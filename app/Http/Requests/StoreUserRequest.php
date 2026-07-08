<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'username' => 'required|string|min:3|max:50|unique:app_users,username',
            'password' => 'required|string|min:6',
            'role' => ['required', Rule::in(UserRole::values())],
        ];
    }
}
