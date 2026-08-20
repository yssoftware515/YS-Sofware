<?php

namespace App\Domains\Product\DTOs;

use App\Domains\System\Services\HtmlSanitizerService;

readonly class UpdateProductDTO
{
    public function __construct(
        public ?string $slug,
        public ?string $nameEn,
        public ?string $nameAr,
        public ?string $status,
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
        public ?bool $isFeatured,
        public ?int $sortOrder,
        public ?array $seoMeta,
        public ?array $features,
        public ?array $pricingPlans,
        public ?array $mediaAttachments,
    ) {}

    public static function fromArray(array $validated): self
    {
        $sanitizer = app(HtmlSanitizerService::class);

        return new self(
            slug: $validated['slug'] ?? null,
            nameEn: $validated['name_en'] ?? null,
            nameAr: $validated['name_ar'] ?? null,
            status: $validated['status'] ?? null,
            shortDescEn: $validated['short_desc_en'] ?? null,
            shortDescAr: $validated['short_desc_ar'] ?? null,
            longDescEn: $sanitizer->sanitize($validated['long_desc_en'] ?? null),
            longDescAr: $sanitizer->sanitize($validated['long_desc_ar'] ?? null),
            // VULN-04: sanitize markup-capable value_proposition /
            // target_audience at the write boundary.
            valuePropEn: $sanitizer->sanitizeIfHtml($validated['value_proposition_en'] ?? null),
            valuePropAr: $sanitizer->sanitizeIfHtml($validated['value_proposition_ar'] ?? null),
            targetAudienceEn: $sanitizer->sanitizeIfHtml($validated['target_audience_en'] ?? null),
            targetAudienceAr: $sanitizer->sanitizeIfHtml($validated['target_audience_ar'] ?? null),
            coverImageId: $validated['cover_image_id'] ?? null,
            logoImageId: $validated['logo_image_id'] ?? null,
            iconKey: $validated['icon_key'] ?? null,
            brandColor: $validated['brand_color'] ?? null,
            productUrl: $validated['product_url'] ?? null,
            documentationUrl: $validated['documentation_url'] ?? null,
            supportUrl: $validated['support_url'] ?? null,
            isFeatured: isset($validated['is_featured']) ? (bool) $validated['is_featured'] : null,
            sortOrder: isset($validated['sort_order']) ? (int) $validated['sort_order'] : null,
            seoMeta: $validated['seo_meta'] ?? null,
            features: $validated['features'] ?? null,
            pricingPlans: $validated['pricing_plans'] ?? null,
            mediaAttachments: $validated['media'] ?? null,
        );
    }

    /**
     * Return only fields that were explicitly provided (for partial updates).
     */
    public function toArray(): array
    {
        $data = [];

        if ($this->slug !== null) {
            $data['slug'] = $this->slug;
        }
        if ($this->nameEn !== null) {
            $data['name_en'] = $this->nameEn;
        }
        if ($this->nameAr !== null) {
            $data['name_ar'] = $this->nameAr;
        }
        if ($this->status !== null) {
            $data['status'] = $this->status;
        }
        if ($this->shortDescEn !== null) {
            $data['short_desc_en'] = $this->shortDescEn;
        }
        if ($this->shortDescAr !== null) {
            $data['short_desc_ar'] = $this->shortDescAr;
        }
        if ($this->longDescEn !== null) {
            $data['long_desc_en'] = $this->longDescEn;
        }
        if ($this->longDescAr !== null) {
            $data['long_desc_ar'] = $this->longDescAr;
        }
        if ($this->valuePropEn !== null) {
            $data['value_proposition_en'] = $this->valuePropEn;
        }
        if ($this->valuePropAr !== null) {
            $data['value_proposition_ar'] = $this->valuePropAr;
        }
        if ($this->targetAudienceEn !== null) {
            $data['target_audience_en'] = $this->targetAudienceEn;
        }
        if ($this->targetAudienceAr !== null) {
            $data['target_audience_ar'] = $this->targetAudienceAr;
        }
        if ($this->coverImageId !== null) {
            $data['cover_image_id'] = $this->coverImageId;
        }
        if ($this->logoImageId !== null) {
            $data['logo_image_id'] = $this->logoImageId;
        }
        if ($this->iconKey !== null) {
            $data['icon_key'] = $this->iconKey;
        }
        if ($this->brandColor !== null) {
            $data['brand_color'] = $this->brandColor;
        }
        if ($this->productUrl !== null) {
            $data['product_url'] = $this->productUrl;
        }
        if ($this->documentationUrl !== null) {
            $data['documentation_url'] = $this->documentationUrl;
        }
        if ($this->supportUrl !== null) {
            $data['support_url'] = $this->supportUrl;
        }
        if ($this->isFeatured !== null) {
            $data['is_featured'] = $this->isFeatured;
        }
        if ($this->sortOrder !== null) {
            $data['sort_order'] = $this->sortOrder;
        }
        if ($this->seoMeta !== null) {
            $data['seo_meta'] = $this->seoMeta;
        }

        return $data;
    }
}
