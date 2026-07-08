<?php

namespace App\Services;

use App\Models\InventoryItem;

class InventoryDeductionService
{
    /**
     * Deduct every consumable used on a job from inventory.
     * Call inside a DB transaction together with the job save, so a
     * failure can never leave the job updated but the stock untouched.
     */
    public function deductForSpecs(
        ?string $oil,
        ?string $oilSealSize,
        int $oilSealQty,
        ?string $dustSealSize,
        int $dustSealQty,
        ?string $springs,
    ): void {
        $this->deduct($oil);
        $this->deduct($oilSealSize, $oilSealQty);
        $this->deduct($dustSealSize, $dustSealQty);
        $this->deduct($springs);
    }

    /**
     * Decrement stock for a named consumable. "None" and empty values are skipped.
     */
    private function deduct(?string $name, int $qty = 1): void
    {
        if ($name && $name !== 'None' && $qty > 0) {
            InventoryItem::where('name', $name)->decrement('stock', $qty);
        }
    }
}
