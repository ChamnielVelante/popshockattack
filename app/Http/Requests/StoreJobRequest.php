<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'customer' => 'required|string|max:255',
            'moto' => 'required|string|max:255',
            'plate' => 'required|string|max:255',
            'dateIn' => 'required|date',
        ];
    }
}
