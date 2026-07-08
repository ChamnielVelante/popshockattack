<?php

namespace App\Http\Requests;

use App\Services\BillingService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSpecsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            // Must be one of the shop's motorcycle-class base prices;
            // the total bill is computed server-side from these inputs.
            'enginePrice' => ['required', 'integer', Rule::in(BillingService::BASE_PRICES)],
            'oil' => 'required|string|max:255',
            'oilSeal' => 'required|string|max:255',
            'dustSeal' => 'required|string|max:255',
            'springs' => 'required|string|max:255',
            'isWarranty' => 'required|boolean',
            'rawOil' => 'nullable|string|max:255',
            'rawOsSize' => 'nullable|string|max:255',
            'rawOsQty' => 'nullable|integer|min:0|max:10',
            'rawDsSize' => 'nullable|string|max:255',
            'rawDsQty' => 'nullable|integer|min:0|max:10',
            'rawSprings' => 'nullable|string|max:255',
        ];
    }
}
