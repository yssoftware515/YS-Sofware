<?php

namespace App\Domains\Product\DTOs;

use App\Domains\System\Services\HtmlSanitizerService;
use App\Http\Requests\Admin\Product\CreateProductRequest;

readonly class CreateProductDTO
{
    public function __construct(
        public string $slug,
        public string $nameEn,
        public string $nameAr,
        public string $status,
        public ?string $shortDescEn,
        public ?string $shortDescAr,
        public ?string $longDescEn,
        public ?string $longDescAr,
        public ?string $valuePropEn,
        public ?string $valuePropAr,
        public ?string $targetAudienceEn,
        public ?string $targetAudienceAr,
        public ?string $coverImageId,
        public ?string $logoImageId,
        public ?string $iconKey,
        public ?string $brandColor,
        public ?string $productUrl,
        public ?string $documentationUrl,
        public ?string $supportUrl,
        public bool $isFeatured,
        public int $sortOrder,
        public ?array $seoMeta,
        public ?array $features,
        public ?array $pricingPlans,
        public ?array $mediaAttachments,
    ) {}

    public static function fromRequest(CreateProductRequest $request): self
    {
        $v = $request->validated();
        $sanitizer = app(HtmlSanitizerService::class);

        return new self(
            slug: $v['slug'],
            nameEn: $v['name_en'],
            nameAr: $v['name_ar'],
            status: $v['status'] ?? 'planned',
            shortDescEn: $v['short_desc_en'] ?? null,
            shortDescAr: $v['short_desc_ar'] ?? null,
            // long_desc is rich-text HTML from the admin editor — sanitize
            // here, once, so every consumer of this DTO downstream never
            // has to think about it again.
            longDescEn: $sanitizer->sanitize($v['long_desc_en'] ?? null),
            longDescAr: $sanitizer->sanitize($v['long_desc_ar'] ?? null),
            // VULN-04: value_proposition / target_audience are
            // markup-capable too — neutralize script/event payloads at
            // the write boundary (plain text passes through unchanged).
            valuePropEn: $sanitizer->sanitizeIfHtml($v['value_proposition_en'] ?? null),
            valuePropAr: $sanitizer->sanitizeIfHtml($v['value_proposition_ar'] ?? null),
            targetAudienceEn: $sanitizer->sanitizeIfHtml($v['target_audience_en'] ?? null),
            targetAudienceAr: $sanitizer->sanitizeIfHtml($v['target_audience_ar'] ?? null),
            coverImageId: $v['cover_image_id'] ?? null,
            logoImageId: $v['logo_image_id'] ?? null,
            iconKey: $v['icon_key'] ?? null,
            brandColor: $v['brand_color'] ?? null,
            productUrl: $v['product_url'] ?? null,
            documentationUrl: $v['documentation_url'] ?? null,
            supportUrl: $v['support_url'] ?? null,
            isFeatured: (bool) ($v['is_featured'] ?? false),
            sortOrder: (int) ($v['sort_order'] ?? 0),
            seoMeta: $v['seo_meta'] ?? null,
            features: $v['features'] ?? null,
            pricingPlans: $v['pricing_plans'] ?? null,
            mediaAttachments: $v['media'] ?? null,
        );
    }
}
