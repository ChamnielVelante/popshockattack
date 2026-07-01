<?php

namespace App\Models;

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
        'price' // The new column we added!
    ];
}