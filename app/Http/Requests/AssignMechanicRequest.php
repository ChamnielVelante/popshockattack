<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignMechanicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'mechanic' => 'nullable|string|max:255',
        ];
    }
}
