<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Company services — the commercial services YS Systems sells besides
     * its SaaS products: website development, mobile apps, AI solutions,
     * automation, UI/UX, branding, integrations, consulting, ...
     *
     * Kept deliberately separate from `products`: products are the YS
     * platform/SaaS catalog with their own release machinery; services
     * are customer work the company performs. Pricing is optional and
     * flexible (starting price, fixed, custom quote, free) — most
     * services will require a custom quotation.
     */
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('slug')->unique();
            $table->string('name_ar');
            $table->string('name_en');

            $table->string('category')->nullable();
            $table->text('short_desc_en')->nullable();
            $table->text('short_desc_ar')->nullable();
            $table->longText('description_en')->nullable();
            $table->longText('description_ar')->nullable();

            $table->foreignUuid('cover_image_id')->nullable()->constrained('media')->nullOnDelete();

            // Commercial information — never a forced fixed price.
            $table->string('pricing_type')->default('custom_quote'); // custom_quote | starting_at | fixed | hourly
            $table->decimal('starting_price', 12, 2)->nullable();
            $table->char('currency', 3)->default('USD');
            $table->string('billing_cycle')->nullable(); // per_project | per_month | per_hour | custom

            // active | inactive | archived
            $table->string('status')->default('inactive');
            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->jsonb('seo_meta')->nullable();

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'sort_order']);
            $table->index('is_featured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
