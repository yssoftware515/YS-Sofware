<?php

namespace Database\Seeders;

use App\Domains\System\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // ── BRAND ────────────────────────────────────────────────
            [
                'group' => 'brand',
                'key' => 'company_name',
                'value' => 'YS Systems & Software',
                'description' => 'Official company name displayed across the platform.',
                'is_public' => true,
            ],
            [
                'group' => 'brand',
                'key' => 'company_tagline_en',
                'value' => 'Building Modern Software Systems',
                'description' => 'Short tagline shown in hero sections (English).',
                'is_public' => true,
            ],
            [
                'group' => 'brand',
                'key' => 'company_tagline_ar',
                'value' => 'بناء أنظمة برمجية حديثة',
                'description' => 'Short tagline shown in hero sections (Arabic).',
                'is_public' => true,
            ],
            [
                'group' => 'brand',
                'key' => 'company_description_en',
                'value' => 'YS Systems & Software builds scalable, secure, and modern SaaS platforms and business solutions.',
                'description' => 'Full company description for About page and meta tags (English).',
                'is_public' => true,
            ],
            [
                'group' => 'brand',
                'key' => 'company_description_ar',
                'value' => 'تبني YS Systems & Software منصات SaaS وحلول أعمال حديثة وآمنة وقابلة للتوسع.',
                'description' => 'Full company description for About page and meta tags (Arabic).',
                'is_public' => true,
            ],
            [
                'group' => 'brand',
                'key' => 'contact_email',
                'value' => 'cantactys@gmail.com',
                'description' => 'Primary contact email shown publicly.',
                'is_public' => true,
            ],

            // ── SOCIAL ───────────────────────────────────────────────
            [
                'group' => 'social',
                'key' => 'github_url',
                'value' => 'https://github.com/yehiahwary0-oss',
                'description' => 'GitHub organization URL.',
                'is_public' => true,
            ],
            [
                'group' => 'social',
                'key' => 'tiktok_url',
                'value' => 'https://www.tiktok.com/@ys_systemsoftware',
                'description' => 'TikTok profile URL.',
                'is_public' => true,
            ],
            // Future: x_url, linkedin_url, facebook_url (null until ready)
            [
                'group' => 'social',
                'key' => 'x_url',
                'value' => null,
                'description' => 'X (Twitter) profile URL.',
                'is_public' => true,
            ],
            [
                'group' => 'social',
                'key' => 'linkedin_url',
                'value' => null,
                'description' => 'LinkedIn company page URL.',
                'is_public' => true,
            ],

            // ── SEO ──────────────────────────────────────────────────
            [
                'group' => 'seo',
                'key' => 'default_og_title_en',
                'value' => 'YS Systems & Software – Modern Software Products',
                'description' => 'Default Open Graph title for social sharing (English).',
                'is_public' => true,
            ],
            [
                'group' => 'seo',
                'key' => 'default_og_title_ar',
                'value' => 'YS Systems & Software – منتجات برمجية حديثة',
                'description' => 'Default Open Graph title for social sharing (Arabic).',
                'is_public' => true,
            ],

            // ── CONTACTS ──────────────────────────────────────────────
            [
                'group' => 'contacts',
                'key' => 'support_email',
                'value' => null,
                'description' => 'Dedicated support email address.',
                'is_public' => true,
            ],
            [
                'group' => 'contacts',
                'key' => 'sales_email',
                'value' => null,
                'description' => 'Dedicated sales email address.',
                'is_public' => true,
            ],
            [
                'group' => 'contacts',
                'key' => 'security_email',
                'value' => null,
                'description' => 'Security disclosure contact email.',
                'is_public' => true,
            ],
            [
                'group' => 'contacts',
                'key' => 'privacy_email',
                'value' => null,
                'description' => 'Privacy-related inquiries email.',
                'is_public' => true,
            ],
            [
                'group' => 'contacts',
                'key' => 'press_email',
                'value' => null,
                'description' => 'Press and media contact email.',
                'is_public' => true,
            ],
            [
                'group' => 'contacts',
                'key' => 'whatsapp_number',
                'value' => '201558559450',
                'description' => 'Primary WhatsApp number for service inquiries (international digits only, no leading + — consumed directly in wa.me links).',
                'is_public' => true,
            ],
            [
                'group' => 'contacts',
                'key' => 'whatsapp_display',
                'value' => '0155 855 9450',
                'description' => 'Human-friendly WhatsApp number shown on the contact page.',
                'is_public' => true,
            ],

            // ── SYSTEM ───────────────────────────────────────────────
            [
                'group' => 'system',
                'key' => 'maintenance_mode',
                'value' => false,
                'description' => 'Put the public website in maintenance mode.',
                'is_public' => false,
            ],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        $this->command->info('✓ Default settings seeded.');
    }
}
