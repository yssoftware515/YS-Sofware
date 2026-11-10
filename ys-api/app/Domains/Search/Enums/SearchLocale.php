<?php

namespace App\Domains\Search\Enums;

/**
 * Locales the public search accepts.
 *
 * The locale is interpolated into SQL column names, so this list is also
 * the driver's safety whitelist — never a free-form string.
 */
enum SearchLocale: string
{
    case English = 'en';
    case Arabic = 'ar';

    /**
     * @return string[]
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
