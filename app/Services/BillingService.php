<?php

namespace App\Services;

class BillingService
{
    /**
     * Base front-shock service price per motorcycle class.
     * Must match the classes offered on the tuning-specs form.
     */
    public const BASE_PRICES = [1200, 1500, 2500, 2800, 4500, 6500];

    /** Oil seal price depends on the motorcycle class. */
    private const OIL_SEAL_PRICE_BIG = 500;

    private const OIL_SEAL_PRICE_SMALL = 300;

    private const BIG_BIKE_THRESHOLD = 2800;

    private const DUST_SEAL_PRICE = 75;

    private const SPRING_PRICE = 580;

    /**
     * Compute the total bill on the server so the client-side preview
     * can never be tampered with. Warranty re-service claims are free.
     */
    public function computeTotal(
        int $enginePrice,
        bool $isWarrantyClaim,
        ?string $oilSealSize,
        int $oilSealQty,
        ?string $dustSealSize,
        int $dustSealQty,
        ?string $springs,
    ): int {
        if ($isWarrantyClaim) {
            return 0;
        }

        $total = $enginePrice;

        if ($this->isUsed($oilSealSize)) {
            $oilSealPrice = $enginePrice >= self::BIG_BIKE_THRESHOLD
                ? self::OIL_SEAL_PRICE_BIG
                : self::OIL_SEAL_PRICE_SMALL;
            $total += $oilSealQty * $oilSealPrice;
        }

        if ($this->isUsed($dustSealSize)) {
            $total += $dustSealQty * self::DUST_SEAL_PRICE;
        }

        if ($this->isUsed($springs)) {
            $total += self::SPRING_PRICE;
        }

        return $total;
    }

    private function isUsed(?string $part): bool
    {
        return $part !== null && $part !== '' && $part !== 'None';
    }
}
