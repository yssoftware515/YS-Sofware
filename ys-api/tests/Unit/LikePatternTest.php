<?php

namespace Tests\Unit;

use App\Domains\Search\Support\LikePattern;
use Tests\TestCase;

/**
 * The admin search boxes wrap the term in "%...%" so it matches anywhere.
 * The LIKE metacharacters % and _ must be escaped, otherwise a search for
 * "a_b" also matches "axb" and a search for "%" matches every row - the
 * box silently stops searching for what was typed.
 */
class LikePatternTest extends TestCase
{
    public function test_wraps_the_term_in_wildcards(): void
    {
        $this->assertSame('%ys%', LikePattern::contains('ys'));
    }

    public function test_escapes_the_percent_wildcard(): void
    {
        // A literal % in the term must not act as a wildcard.
        $this->assertSame('%\\%50\\% off%', LikePattern::contains('%50% off'));
    }

    public function test_escapes_the_underscore_wildcard(): void
    {
        $this->assertSame('%a\\_b%', LikePattern::contains('a_b'));
    }

    public function test_escapes_the_backslash_first_so_escapes_stay_balanced(): void
    {
        // A literal backslash is doubled BEFORE % and _ are escaped, so the
        // backslashes this method adds are not escaped a second time.
        $this->assertSame('%\\\\%', LikePattern::contains('\\'));
        $this->assertSame('%a\\\\\\_b%', LikePattern::contains('a\\_b'));
    }

    public function test_leaves_ordinary_terms_untouched(): void
    {
        $this->assertSame('%Business Websites%', LikePattern::contains('Business Websites'));
    }
}
