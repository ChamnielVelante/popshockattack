<?php

namespace App\Http\Requests;

use App\Enums\JobStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // role checked by route middleware
    }

    public function rules(): array
    {
        return [
            'stage' => ['required', Rule::in(JobStage::values())],
        ];
    }
}
