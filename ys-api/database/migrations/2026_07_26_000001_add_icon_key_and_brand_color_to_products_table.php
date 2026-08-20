<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds the last two admin-editable fields needed for a product's card
     * identity (icon + tint color) so that launching a new product never
     * requires a frontend code change — see ProductIcon enum for the
     * allow-listed icon_key values.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Nullable on purpose: an admin filling the form top-to-bottom
            // can save a draft before picking these, and the frontend
            // falls back to a generic placeholder card when either is
            // null rather than rendering broken/missing styling.
            $table->string('icon_key', 40)->nullable()->after('cover_image_id');
            $table->string('brand_color', 7)->nullable()->after('icon_key'); // '#RRGGBB'
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['icon_key', 'brand_color']);
        });
    }
};
