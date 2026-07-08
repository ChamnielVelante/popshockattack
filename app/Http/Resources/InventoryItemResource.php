<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryItemResource extends JsonResource
{
    /**
     * The single definition of what the API exposes for an inventory item.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_no' => $this->item_no,
            'name' => $this->name,
            'description' => $this->description,
            'stock' => $this->stock,
            'threshold' => $this->threshold,
            'price' => $this->price,
            'is_low_stock' => $this->is_low_stock,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
