<?php

namespace App\Domains\Search\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * LIKE pattern helpers for admin search boxes.
 *
 * A user-supplied search term is wrapped in "%...%" so it matches anywhere.
 * The LIKE metacharacters % and _ must be escaped, otherwise a search for
 * "a_b" also matches "axb" and a search for "%" matches everything - the
 * search box silently stops searching for what was typed.
 *
 * PostgresSearchDriver already had this (VULN-19); the admin controllers
 * had their own "%{$search}%" pattern without the escaping. This is the
 * single implementation both now use.
 */
final class LikePattern
{
    /**
     * Build a "%term%" pattern with the LIKE wildcards escaped.
     */
    public static function contains(string $term): string
    {
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $term);

        return '%'.$escaped.'%';
    }

    /**
     * Apply the escaped "contains" pattern to a set of columns.
     *
     * @param  array<int, string>  $columns
     */
    public static function applyTo(Builder $query, array $columns, string $term): void
    {
        $pattern = self::contains($term);

        $query->where(function ($sub) use ($columns, $pattern) {
            foreach ($columns as $column) {
                $sub->orWhere($column, 'ilike', $pattern);
            }
        });
    }
}
