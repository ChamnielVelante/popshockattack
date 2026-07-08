<?php

namespace App\Enums;

enum JobStage: string
{
    case Intake = 'Intake';
    case Disassembly = 'Disassembly';
    case Tuning = 'Tuning';
    case QA = 'QA';
    case Release = 'Release';

    /**
     * All stage values in workflow order, for validation rules.
     *
     * @return string[]
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
