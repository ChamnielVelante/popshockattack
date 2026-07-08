<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'qty' => 'required|integer|min:1',
        ];
    }
}
