<?php

namespace App\Http\Requests\Admin\Services;

use App\Domains\Services\Models\Service;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('manage_services') ?? false;
    }

    public function rules(): array
    {
        return [
            'slug' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:services,slug'],
            'name_en' => ['required', 'string', 'max:150'],
            'name_ar' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'service_class' => ['nullable', Rule::in(Service::SERVICE_CLASSES)],
            'short_desc_en' => ['nullable', 'string', 'max:500'],
            'short_desc_ar' => ['nullable', 'string', 'max:500'],
            'description_en' => ['nullable', 'string', 'max:50000'],
            'description_ar' => ['nullable', 'string', 'max:50000'],
            'cover_image_id' => ['nullable', 'uuid', 'exists:media,id'],
            // Commercial info — flexible on purpose, never a forced price.
            'pricing_type' => ['required', Rule::in(Service::PRICING_TYPES)],
            // Decimal string — never use floats for money. Bound at 12,2.
            'starting_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'billing_cycle' => ['nullable', Rule::in(Service::BILLING_CYCLES)],
            'status' => ['sometimes', Rule::in(Service::STATUSES)],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'seo_meta' => ['nullable', 'array'],
            'seo_meta.title_en' => ['nullable', 'string', 'max:70'],
            'seo_meta.title_ar' => ['nullable', 'string', 'max:70'],
            'seo_meta.description_en' => ['nullable', 'string', 'max:160'],
            'seo_meta.description_ar' => ['nullable', 'string', 'max:160'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->slug) {
            $this->merge(['slug' => strtolower(trim($this->slug))]);
        }
    }
}
