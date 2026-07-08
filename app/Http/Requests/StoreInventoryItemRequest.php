<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'item_no' => 'required|string|max:50|unique:inventory_items,item_no',
            'name' => 'required|string|max:255|unique:inventory_items,name',
            'description' => 'required|string|max:255',
            'stock' => 'required|integer|min:0',
            'threshold' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
        ];
    }
}
