<?php

namespace App\Domains\Search\Enums;

/**
 * Searchable public content types.
 *
 * Single source of truth shared by the HTTP validation layer and the
 * storage driver — the driver's allow-list follows this enum, so a new
 * type can never be validated at the edge and then silently ignored.
 */
enum SearchType: string
{
    case Service = 'service';
    case Page = 'page';
    case Faq = 'faq';

    /**
     * @return string[] plain values, for Rule::enum() / allow-lists
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
