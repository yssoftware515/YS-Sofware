<?php

namespace App\Domains\Content\Actions;

use App\Domains\Content\Models\Career;
use App\Domains\System\Services\HtmlSanitizerService;

class UpdateCareerAction
{
    public function execute(Career $career, array $data): Career
    {
        // VULN-04: sanitize the markup-capable fields on update too.
        $sanitizer = app(HtmlSanitizerService::class);

        foreach (['description_en', 'description_ar'] as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = $sanitizer->sanitizeIfHtml($data[$field]);
            }
        }
        foreach (['requirements', 'responsibilities'] as $field) {
            if (array_key_exists($field, $data) && is_array($data[$field])) {
                $data[$field] = $sanitizer->sanitizeNestedHtml($data[$field]);
            }
        }

        $career->update(array_filter($data, fn ($v) => $v !== null));

        return $career->fresh();
    }
}
