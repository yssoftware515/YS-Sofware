<?php

namespace App\Domains\System\Services;

use Mews\Purifier\Facades\Purifier;

/**
 * HtmlSanitizerService — the single boundary where admin-authored rich-text
 * HTML (product long_desc, documentation article content, etc.) gets
 * cleaned before it ever touches the database.
 *
 * WHY THIS EXISTS:
 * Every one of these fields is later rendered on the public frontend via
 * `dangerouslySetInnerHTML` with zero sanitization on that side (by
 * design — the frontend trusts the API). That means THIS is the only
 * place in the entire system where untrusted/attacker-controlled markup
 * (a compromised or malicious admin account, a copy-pasted snippet with a
 * hidden payload, etc.) can be neutralized before it reaches every visitor
 * of a product or docs page. Sanitizing on write (here) instead of on read
 * (in the frontend) means every current AND future consumer of this data
 * — the public site, a future mobile app, a future partner API — inherits
 * the protection automatically, with nothing to remember to do on their end.
 *
 * Uses a config profile ('cms') defined in config/purifier.php with an
 * allow-list appropriate for a rich-text editor: basic formatting, lists,
 * headings, links, and images — no <script>, no inline event handlers, no
 * <iframe>, no <style>. See that config file for the exact allow-list.
 */
class HtmlSanitizerService
{
    public function sanitize(?string $html): ?string
    {
        if ($html === null || $html === '') {
            return $html;
        }

        return Purifier::clean($html, 'cms');
    }

    /**
     * Sanitize only when the string actually contains HTML markup.
     *
     * VULN-04 remediation: fields that are rendered as rich text on the
     * frontend (or that a future consumer might render as HTML) must be
     * neutralized at the write boundary. But fields that hold plain text
     * must NOT be run through the HTML sanitizer — HTMLPurifier would
     * escape literal `&`, `<`, `>` characters (e.g. "R&D" → "R&amp;D"),
     * corrupting display. The heuristic is: if the string contains a
     * tag-like sequence (`<` followed by a letter, `/`, `!` or `?`), it
     * is treated as HTML and sanitized; otherwise it passes through
     * byte-for-byte unchanged.
     */
    public function sanitizeIfHtml(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        if (preg_match('/<[\x09\x0A\x0D\x20]*[a-zA-Z\/!?]/', $value) !== 1) {
            return $value;
        }

        return $this->sanitize($value);
    }

    /**
     * Recursively sanitize HTML-looking string values inside a nested
     * structure (homepage section content JSON, career requirements,
     * release changelog, ...). Scalars and nested arrays pass through;
     * only tag-bearing strings are cleaned, so plain text is untouched.
     */
    public function sanitizeNestedHtml(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }

        $clean = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $clean[$key] = $this->sanitizeNestedHtml($value);
            } elseif (is_string($value)) {
                $clean[$key] = $this->sanitizeIfHtml($value);
            } else {
                $clean[$key] = $value;
            }
        }

        return $clean;
    }

    /**
     * Static-page content columns hold a JSON-encoded array of sections
     * (e.g. [{"label": "...", "text": "..."}]). Sanitize the HTML-looking
     * string values INSIDE the JSON without corrupting the JSON encoding;
     * if the column does not hold valid JSON, fall back to sanitizing the
     * whole string as HTML.
     */
    public function sanitizeJsonContent(?string $json): ?string
    {
        if ($json === null || $json === '') {
            return $json;
        }

        if (preg_match('/<[\x09\x0A\x0D\x20]*[a-zA-Z\/!?]/', $json) !== 1) {
            return $json;
        }

        $decoded = json_decode($json, true);

        if (is_array($decoded)) {
            return json_encode($this->sanitizeNestedHtml($decoded));
        }

        return $this->sanitize($json);
    }
}
