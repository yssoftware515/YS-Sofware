<?php

namespace App\Http\Requests\Admin\Product;

use App\Domains\Product\Enums\ProductIcon;
use App\Domains\Product\Models\ProductMedia;
use App\Domains\Product\Models\ProductPricingPlan;
use App\Rules\SafeUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('manage_products') ?? false;
    }

    public function rules(): array
    {
        return [
            'slug' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:products,slug'],
            'name_en' => ['required', 'string', 'max:150'],
            'name_ar' => ['required', 'string', 'max:150'],
            'status' => ['sometimes', Rule::in(['active', 'beta', 'planned', 'archived'])],
            'short_desc_en' => ['nullable', 'string', 'max:500'],
            'short_desc_ar' => ['nullable', 'string', 'max:500'],
            'long_desc_en' => ['nullable', 'string'],
            'long_desc_ar' => ['nullable', 'string'],
            'value_proposition_en' => ['nullable', 'string', 'max:2000'],
            'value_proposition_ar' => ['nullable', 'string', 'max:2000'],
            'target_audience_en' => ['nullable', 'string', 'max:2000'],
            'target_audience_ar' => ['nullable', 'string', 'max:2000'],
            'cover_image_id' => ['nullable', 'uuid', 'exists:media,id'],
            'logo_image_id' => ['nullable', 'uuid', 'exists:media,id'],
            // Destination URLs — validated format only. These are presented
            // on the public page (Launch / Docs / Support), never executed.
            // VULN-04: https-only blocks javascript:/data:/file: schemes
            // from ever reaching public href attributes.
            'product_url' => ['nullable', 'url', 'max:500', new SafeUrl(strictHttps: true)],
            'documentation_url' => ['nullable', 'url', 'max:500', new SafeUrl(strictHttps: true)],
            'support_url' => ['nullable', 'url', 'max:500', new SafeUrl(strictHttps: true)],
            'icon_key' => ['nullable', 'string', Rule::in(ProductIcon::values())],
            'brand_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'seo_meta' => ['nullable', 'array'],
            'seo_meta.title_en' => ['nullable', 'string', 'max:70'],
            'seo_meta.title_ar' => ['nullable', 'string', 'max:70'],
            'seo_meta.description_en' => ['nullable', 'string', 'max:160'],
            'seo_meta.description_ar' => ['nullable', 'string', 'max:160'],

            // Structured catalog children (full-replace on save)
            'features' => ['nullable', 'array', 'max:50'],
            'features.*.title_en' => ['required', 'string', 'max:150'],
            'features.*.title_ar' => ['required', 'string', 'max:150'],
            'features.*.description_en' => ['nullable', 'string', 'max:500'],
            'features.*.description_ar' => ['nullable', 'string', 'max:500'],

            'pricing_plans' => ['nullable', 'array', 'max:20'],
            'pricing_plans.*.name_en' => ['required', 'string', 'max:150'],
            'pricing_plans.*.name_ar' => ['required', 'string', 'max:150'],
            'pricing_plans.*.pricing_type' => ['required', Rule::in(ProductPricingPlan::PRICING_TYPES)],
            'pricing_plans.*.price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'pricing_plans.*.currency' => ['sometimes', 'string', 'size:3'],
            'pricing_plans.*.billing_cycle' => ['nullable', Rule::in(ProductPricingPlan::CYCLES)],
            'pricing_plans.*.is_featured' => ['sometimes', 'boolean'],

            'media' => ['nullable', 'array', 'max:50'],
            'media.*.media_id' => ['required', 'uuid', 'exists:media,id'],
            'media.*.kind' => ['required', Rule::in(ProductMedia::KINDS)],
            'media.*.sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->slug) {
            $this->merge(['slug' => strtolower(trim($this->slug))]);
        }
    }
}
