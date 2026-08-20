<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * VULN-04/VULN-25 remediation — URL scheme validation.
 *
 * Blocks dangerous URI schemes (javascript:, data:, vbscript:, file: and
 * any other non-allowed scheme) that would execute script when rendered
 * into an href/src by any consumer.
 *
 * Two modes:
 *  - default (menu items): relative internal links (`/about`, `#contact`,
 *    protocol-relative `//...`) are allowed, as are http/https/mailto/tel
 *    absolute URLs. This preserves the existing navigation contract
 *    while rejecting executable schemes.
 *  - strict (product external URLs, settings social URLs): only absolute
 *    https:// URLs are accepted.
 *
 * Whitespace/control characters inside a scheme (e.g. `java\tscript:`,
 * `java script:`) are normalized before matching, closing the classic
 * scheme-obfuscation bypass.
 */
class SafeUrl implements ValidationRule
{
    public function __construct(private readonly bool $strictHttps = false) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || trim($value) === '') {
            $fail('The :attribute must be a non-empty URL.');

            return;
        }

        $value = trim($value);

        if ($this->strictHttps) {
            if (preg_match('#^https://#i', $value) !== 1) {
                $fail('The :attribute must be an absolute https:// URL.');
            }

            return;
        }

        // Relative internal links are a legitimate navigation contract.
        if (str_starts_with($value, '/') || str_starts_with($value, '#') || str_starts_with($value, '//')) {
            return;
        }

        // Strip whitespace/control characters so `java\tscript:` is caught.
        $normalized = preg_replace('/[\x00-\x20\x7F]/', '', $value);

        if (preg_match('#^([a-z][a-z0-9+.\-]*):#i', $normalized, $m) !== 1) {
            $fail('The :attribute must be a relative path or an absolute URL.');

            return;
        }

        if (! in_array(strtolower($m[1]), ['http', 'https', 'mailto', 'tel'], true)) {
            $fail('The :attribute uses a blocked URL scheme.');
        }
    }
}
