<?php

return [
    'encoding' => 'UTF-8',
    'finalize' => true,
    'ignoreNonStrings' => false,
    'cachePath' => storage_path('app/purifier'),
    'cacheFileMode' => 0755,

    'settings' => [

        // 'cms' — the ONLY profile used in this codebase. Deliberately not
        // named 'default' so nothing ever falls back to it silently; every
        // call site must ask for 'cms' by name (see HtmlSanitizerService).
        //
        // Allow-list philosophy: HTMLPurifier strips anything not
        // explicitly listed here. <script>, <iframe>, <style>, and every
        // on* event handler are absent on purpose — do not add them.
        'cms' => [
            'HTML.Doctype' => 'HTML 4.01 Transitional',
            'HTML.Allowed' => 'p,br,strong,b,em,i,u,s,'.
                'h2,h3,h4,'.
                'ul,ol,li,'.
                'a[href|title|target|rel],'.
                'img[src|alt|width|height],'.
                'blockquote,code,pre,'.
                'table,thead,tbody,tr,th,td,'.
                'span[class]',

            // Links: force rel="noopener noreferrer nofollow" on anything
            // opening in a new tab, and only allow http/https/mailto
            // schemes — blocks `javascript:` URIs in an <a href>.
            'HTML.TargetBlank' => true,
            'URI.AllowedSchemes' => ['http' => true, 'https' => true, 'mailto' => true],

            // No inline CSS at all — removes another whole class of
            // injection (CSS-based exfiltration / layout attacks).
            'CSS.AllowedProperties' => '',

            'AutoFormat.RemoveEmpty' => true,
        ],
    ],
];
