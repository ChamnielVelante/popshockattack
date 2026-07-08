<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'username' => [
                'required', 'string', 'min:3', 'max:50',
                Rule::unique('app_users', 'username')->ignore($this->route('user')),
            ],
            'role' => ['required', Rule::in(UserRole::values())],
            'password' => 'nullable|string|min:6',
        ];
    }
}
