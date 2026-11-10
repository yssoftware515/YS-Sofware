<?php

namespace App\Domains\Search;

/**
 * Public search contract limits.
 *
 * Shared by request validation, the service layer and the storage driver
 * so the bounds exist once and can never drift apart between layers.
 */
final class SearchRules
{
    public const MIN_QUERY_LENGTH = 2;

    public const MAX_QUERY_LENGTH = 200;

    public const DEFAULT_LIMIT = 20;

    public const MAX_LIMIT = 50;
}
