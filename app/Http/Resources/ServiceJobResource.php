<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceJobResource extends JsonResource
{
    /**
     * The single definition of what the API exposes for a service job.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer' => $this->customer,
            'app_user_id' => $this->app_user_id,
            'moto_model' => $this->moto_model,
            'plate_number' => $this->plate_number,
            'stage' => $this->stage,
            'date_in' => $this->date_in,
            'specs' => $this->specs,
            'mechanic_name' => $this->mechanic_name,
            'is_warranty_claim' => $this->is_warranty_claim,
            'warranty_status' => $this->warranty_status,
            'warranty_expires_at' => $this->warranty_expires_at?->toDateString(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
