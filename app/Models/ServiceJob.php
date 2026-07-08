<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class ServiceJob extends Model
{
    protected $table = 'service_jobs';

    // Fields the intake/workflow forms are allowed to mass-assign.
    // 'specs' and 'warranty_expires_at' are set explicitly by the
    // controller, never straight from request input.
    protected $fillable = [
        'customer',
        'app_user_id',
        'moto_model',
        'plate_number',
        'stage',
        'date_in',
        'mechanic_name',
        'is_warranty_claim',
    ];

    protected $casts = [
        'specs' => 'array',
        'is_warranty_claim' => 'boolean',
        'warranty_expires_at' => 'date',
    ];

    public function appUser()
    {
        return $this->belongsTo(AppUser::class);
    }

    // warranty_status is derived from warranty_expires_at so it can't go stale.
    // Set warranty_expires_at (e.g. on Release) rather than writing this directly.
    protected function warrantyStatus(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (! $this->warranty_expires_at) {
                    return 'Pending';
                }

                return $this->warranty_expires_at->isFuture()
                    ? 'Active (Expires '.$this->warranty_expires_at->format('m/d/Y').')'
                    : 'Expired ('.$this->warranty_expires_at->format('m/d/Y').')';
            },
        );
    }
}
