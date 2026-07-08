<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    // Allow these columns to be saved via API
    protected $fillable = [
        'item_no',
        'name',
        'description',
        'stock',
        'threshold',
        'price',
    ];

    // Always include is_low_stock in JSON output so any listing can flag it
    protected $appends = ['is_low_stock'];

    protected function isLowStock(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->stock <= $this->threshold,
        );
    }
}
