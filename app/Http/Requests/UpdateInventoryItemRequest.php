<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInventoryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('inventory_items', 'name')->ignore($this->route('item')),
            ],
            'description' => 'required|string|max:255',
            'stock' => 'required|integer|min:0',
            'threshold' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
        ];
    }
}
