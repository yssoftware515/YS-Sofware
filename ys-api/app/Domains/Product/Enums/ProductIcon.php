<?php

namespace App\Domains\Product\Enums;

/**
 * ProductIcon — the fixed, curated set of icons a product can be assigned
 * from the admin panel.
 *
 * WHY A CLOSED LIST INSTEAD OF FREE TEXT:
 * A free-text `icon_key` field would let an admin type anything, and any
 * value that doesn't exactly match a name the frontend recognizes silently
 * renders nothing — a broken card with no error, discovered only by
 * someone actually looking at the live site. A closed list makes an
 * invalid value impossible: the API rejects it at write time with a clear
 * 422, and the admin UI can render this exact list as a picker so there's
 * never a typo to make in the first place.
 *
 * KEEPING THIS IN SYNC WITH THE FRONTEND:
 * Every case here MUST have a matching entry in the frontend's
 * `lib/utils/productIcons.ts` lookup map (ys-web repo). Adding a new icon
 * option to the platform means adding it in BOTH places — that's the one
 * remaining code touch in the whole "add a product" workflow, and it's a
 * one-time, whole-platform change, not a per-product one.
 */
enum ProductIcon: string
{
    case Box = 'box';
    case Activity = 'activity';
    case HeartPulse = 'heart-pulse';
    case TrendingUp = 'trending-up';
    case Shield = 'shield';
    case Zap = 'zap';
    case Globe = 'globe';
    case Layers = 'layers';
    case Database = 'database';
    case Cloud = 'cloud';
    case Cpu = 'cpu';
    case Lock = 'lock';
    case CreditCard = 'credit-card';
    case BarChart = 'bar-chart';
    case Users = 'users';
    case Briefcase = 'briefcase';
    case Rocket = 'rocket';
    case Settings = 'settings';
    case Code = 'code';
    case Smartphone = 'smartphone';
    case Monitor = 'monitor';
    case Server = 'server';
    case Wallet = 'wallet';
    case Calendar = 'calendar';

    /**
     * @return string[] plain values, for use in Rule::in(ProductIcon::values())
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
