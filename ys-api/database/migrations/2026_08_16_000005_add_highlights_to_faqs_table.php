<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add optional EN/AR highlight strings to faqs — plain-text chips
     * rendered on the public FAQ accordion (admin-editable, nullable).
     */
    public function up(): void
    {
        Schema::table('faqs', function (Blueprint $table) {
            $table->string('highlight_en', 500)->nullable()->after('answer_ar');
            $table->string('highlight_ar', 500)->nullable()->after('highlight_en');
        });
    }

    public function down(): void
    {
        Schema::table('faqs', function (Blueprint $table) {
            $table->dropColumn(['highlight_en', 'highlight_ar']);
        });
    }
};