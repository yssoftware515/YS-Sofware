<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Product Catalog expansion (Sprint 2 — Company Platform Evolution).
     * Adds the commercial/presentation fields the Product Catalog mission
     * requires: value proposition, target audience, logo, and the
     * product/documentation/support destination URLs. The actual SaaS
     * product stays fully independent — these are marketing records only.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->text('value_proposition_en')->nullable()->after('long_desc_ar');
            $table->text('value_proposition_ar')->nullable()->after('value_proposition_en');
            $table->text('target_audience_en')->nullable()->after('value_proposition_ar');
            $table->text('target_audience_ar')->nullable()->after('target_audience_en');

            $table->foreignUuid('logo_image_id')->nullable()->constrained('media')->nullOnDelete()->after('cover_image_id');

            // Destination URLs driven from the catalog — the "Launch
            // Product" CTA on the public page points here. No frontend
            // hardcoding, no coupling to any product's own backend.
            $table->string('product_url')->nullable()->after('brand_color');
            $table->string('documentation_url')->nullable()->after('product_url');
            $table->string('support_url')->nullable()->after('documentation_url');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['logo_image_id']);
            $table->dropColumn([
                'value_proposition_en', 'value_proposition_ar',
                'target_audience_en', 'target_audience_ar',
                'logo_image_id', 'product_url', 'documentation_url', 'support_url',
            ]);
        });
    }
};
