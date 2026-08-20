<?php

namespace App\Domains\Cms\Actions;

use App\Domains\Cms\Models\HomepageSection;
use App\Domains\System\Services\HtmlSanitizerService;

class UpdateHomepageSectionAction
{
    public function execute(HomepageSection $section, array $data): HomepageSection
    {
        // VULN-04: sanitize section content JSON values on update too.
        $sanitizer = app(HtmlSanitizerService::class);

        if (array_key_exists('content', $data) && is_array($data['content'])) {
            $data['content'] = $sanitizer->sanitizeNestedHtml($data['content']);
        }

        $section->update(array_filter($data, fn ($v) => $v !== null));

        return $section->fresh();
    }
}
