<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceJob extends Model
{
    // Tell Laravel to use the specific table we created
    protected $table = 'service_jobs';

    // Allow these fields to be filled by your frontend intake form
    protected $fillable = [
        'customer', 
        'moto_model', 
        'plate_number', 
        'stage', 
        'date_in', 
        'mechanic_name', // <--- Add this if it's missing
        'warranty_status',
        'is_warranty_claim'
    ];

    // Tell Laravel that 'specs' is a JSON array, not just text
    protected $casts = [
        'specs' => 'array',
        'is_warranty_claim' => 'boolean'
    ];
}