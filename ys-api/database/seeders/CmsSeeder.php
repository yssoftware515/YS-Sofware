<?php

namespace Database\Seeders;

use App\Domains\Cms\Models\Faq;
use App\Domains\Cms\Models\HomepageSection;
use App\Domains\Cms\Models\Menu;
use App\Domains\Cms\Models\MenuItem;
use App\Domains\Cms\Models\StaticPage;
use Illuminate\Database\Seeder;

class CmsSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedHomepageSections();
        $this->seedFaqs();
        $this->seedMenus();
        $this->seedStaticPages();

        $this->command->info('✓ CMS content seeded.');
    }

    private function seedHomepageSections(): void
    {
        $sections = [
            [
                'type' => 'hero',
                'title_en' => 'Building Modern Software Systems',
                'title_ar' => 'بناء أنظمة برمجية حديثة',
                'subtitle_en' => 'Scalable, secure, and production-grade SaaS platforms for real business problems.',
                'subtitle_ar' => 'منصات SaaS قابلة للتوسع وآمنة ومُنتجة لحل مشكلات الأعمال الحقيقية.',
                'content' => json_encode([
                    'badge_en' => 'Digital Technology Company',
                    'badge_ar' => 'شركة تقنيات رقمية',
                    'cta_primary_en' => 'Start a Project',
                    'cta_primary_ar' => 'ابدأ مشروعك',
                    'cta_primary_url' => '/contact',
                    'cta_secondary_en' => 'View Our Services',
                    'cta_secondary_ar' => 'استكشف خدماتنا',
                    'cta_secondary_url' => '/services',
                ]),
                'is_enabled' => true,
                'sort_order' => 10,
            ],
            [
                'type' => 'stats',
                'title_en' => null,
                'title_ar' => null,
                'subtitle_en' => null,
                'subtitle_ar' => null,
                'is_enabled' => true,
                'sort_order' => 20,
                'content' => json_encode([]),
            ],
            [
                'type' => 'why_choose',
                'title_en' => 'Built Different',
                'title_ar' => 'مبنية بشكل مختلف',
                'subtitle_en' => 'Why YS Systems',
                'subtitle_ar' => 'لماذا YS Systems',
                'content' => json_encode([
                    'items' => [
                        [
                            'icon' => 'Lock',
                            'title_en' => 'Security First',
                            'title_ar' => 'الأمان أولاً',
                            'desc_en' => 'Enterprise-grade security built into every layer, from authentication to data storage.',
                            'desc_ar' => 'أمان بمستوى المؤسسات مدمج في كل طبقة، من المصادقة إلى تخزين البيانات.',
                        ],
                        [
                            'icon' => 'Globe',
                            'title_en' => 'Bilingual by Design',
                            'title_ar' => 'ثنائي اللغة بالتصميم',
                            'desc_en' => 'Full Arabic and English support with proper RTL layouts across every product.',
                            'desc_ar' => 'دعم كامل للعربية والإنجليزية مع تخطيطات RTL صحيحة عبر كل منتج.',
                        ],
                        [
                            'icon' => 'Zap',
                            'title_en' => 'Built to Scale',
                            'title_ar' => 'مبني للتوسع',
                            'desc_en' => 'Architecture designed to grow with your business, from startup to enterprise.',
                            'desc_ar' => 'معمارية مصممة للنمو مع أعمالك، من الشركات الناشئة إلى المؤسسات الكبرى.',
                        ],
                    ],
                ]),
                'is_enabled' => true,
                'sort_order' => 30,
            ],
            [
                'type' => 'products',
                'title_en' => 'Our Products',
                'title_ar' => 'منتجاتنا',
                'subtitle_en' => 'A growing ecosystem of software solutions.',
                'subtitle_ar' => 'منظومة متنامية من الحلول البرمجية.',
                'content' => null,
                'is_enabled' => true,
                'sort_order' => 40,
            ],
            [
                'type' => 'cta',
                'title_en' => 'Have an idea? Let’s build it.',
                'title_ar' => 'لديك فكرة؟ لنبنها معاً.',
                'subtitle_en' => 'Tell us what you need — a product, a custom platform, or a complete system — and we’ll help you scope it.',
                'subtitle_ar' => 'أخبرنا بما تحتاجه — منتجاً أو منصة مخصصة أو نظاماً متكاملاً — وسنساعدك في تحديد النطاق.',
                'content' => json_encode([
                    'primary_text_en' => 'Start a Project',
                    'primary_text_ar' => 'ابدأ مشروعك',
                    'primary_url' => '/contact',
                    'secondary_text_en' => 'Browse Products',
                    'secondary_text_ar' => 'استعرض المنتجات',
                    'secondary_url' => '/products',
                ]),
                'is_enabled' => true,
                'sort_order' => 50,
            ],
        ];

        foreach ($sections as $section) {
            HomepageSection::updateOrCreate(
                ['type' => $section['type'], 'sort_order' => $section['sort_order']],
                $section
            );
        }
    }

    private function seedFaqs(): void
    {
        // Retire the original generic seed set (superseded by the partner
        // positioning content — the old set referenced a Roadmap that is
        // no longer part of the site navigation).
        Faq::whereIn('question_en', [
            'What is YS Systems?',
            'What products do you offer?',
            'How can I get started?',
            'Do you offer enterprise support?',
            'Is my data secure with your platform?',
            'How do you handle privacy?',
            'Can I request a feature?',
            'Do you provide documentation?',
        ])->delete();

        $faqs = [
            [
                'question_en' => 'What exactly does YS-SOFTWARE do?',
                'question_ar' => 'ما الذي تقدمه YS-SOFTWARE بالضبط؟',
                'answer_en' => 'YS-SOFTWARE is a digital technology partner — not a single-service agency.

We help businesses design, build, automate, connect, and continuously evolve their digital ecosystem. One relationship can cover the entire journey:

• Design — UI/UX and digital experiences.
• Build — websites, web applications, and mobile apps.
• Systems — custom software built around your operations.
• Automate — AI and workflow automation where they create real value.
• Connect — APIs and integrations that bring your tools together.
• Evolve — support, maintenance, and continuous development.

Alongside client services, we also build our own SaaS products — so we think like product people, not just project contractors.',
                'answer_ar' => 'YS-SOFTWARE شريك تقني رقمي — وليست وكالة لخدمة واحدة.

نساعد الشركات على تصميم منظومتها الرقمية وبنائها وربطها وأتمتتها وتطويرها باستمرار. علاقة واحدة يمكن أن تغطي الرحلة كاملة:

• التصميم — تجربة المستخدم والواجهات والتجارب الرقمية.
• البناء — المواقع الإلكترونية وتطبيقات الويب والجوال.
• الأنظمة — برمجيات مخصصة تُبنى حول طبيعة عملياتك.
• الأتمتة — الذكاء الاصطناعي وأتمتة سير العمل حيث تحقق قيمة حقيقية.
• الربط — واجهات برمجية وتكاملات تجمع أدواتك في منظومة واحدة.
• التطوير — الدعم والصيانة والتحسين المستمر.

وإلى جانب خدماتنا، نبني منتجات SaaS خاصة بنا — لذا نفكر بعقلية المنتج، لا بمنطق المشروع العابر.',
                'highlight_en' => 'Design • Build • Systems • Automate • Connect • Evolve',
                'highlight_ar' => 'تصميم • بناء • أنظمة • أتمتة • ربط • تطوير',
                'category' => 'company',
                'sort_order' => 10,
            ],
            [
                'question_en' => 'Why work with YS-SOFTWARE as a technology partner?',
                'question_ar' => 'لماذا العمل مع YS-SOFTWARE كشريك تقني؟',
                'answer_en' => 'Because a business rarely has just one digital need.

Companies often end up managing separate providers for design, website, application, business systems, and automation — disconnected work, with no one seeing the full picture. Working with one partner changes that:

• Continuity — from brand and digital experience to websites, applications, systems, and automation.
• Understanding — one team that knows your business, not a new vendor learning it from scratch.
• Connection — systems and platforms designed to work together from day one.
• Direction — a clearer technology roadmap as your needs grow.

And you can start small. A startup might begin with UI/UX and a website, then add a web application, then a custom business system, then automation — the same partner at every stage.',
                'answer_ar' => 'لأن احتياجات أي شركة الرقمية نادراً ما تتوقف عند حد واحد.

كثير من الشركات تجد نفسها تدير مزودين منفصلين للتصميم والموقع والتطبيق والأنظمة والأتمتة — أعمال غير مترابطة، وصورة كاملة لا يراها أحد. العمل مع شريك واحد يغيّر ذلك:

• استمرارية — من الهوية والتجربة الرقمية إلى المواقع والتطبيقات والأنظمة والأتمتة.
• فهم أعمق — فريق يعرف أعمالك، لا مزود جديد يتعلمها من الصفر في كل مرة.
• ترابط — أنظمة ومنصات تُصمم منذ البداية لتعمل معاً.
• رؤية أوضح — خارطة طريق تقنية تتطور مع نمو احتياجاتك.

ويمكنك البدء بخطوة صغيرة: شركة ناشئة قد تبدأ بتصميم وموقع، ثم تضيف تطبيق ويب، ثم نظام أعمال مخصص، ثم الأتمتة — الشريك نفسه في كل مرحلة.',
                'highlight_en' => 'One partner • Full continuity • Start small, grow over time',
                'highlight_ar' => 'شريك واحد • استمرارية كاملة • ابدأ صغيراً وانمُ مع الوقت',
                'category' => 'company',
                'sort_order' => 20,
            ],
            [
                'question_en' => 'What can YS-SOFTWARE build for my business?',
                'question_ar' => 'ماذا يمكن أن تبني YS-SOFTWARE لأعمالي؟',
                'answer_en' => 'From public-facing experiences to the systems that run your operations:

• Websites — corporate, product, SaaS, landing, marketing, and documentation platforms.
• Web Applications — customer platforms, marketplaces, booking systems, dashboards, and portals.
• Mobile Applications — where your project benefits from mobile, connected to your wider ecosystem.
• Custom Business Systems — operations, CRM, inventory, billing, workflow, reporting, and multi-branch systems.
• Integrations — APIs and third-party services, connected where your workflows need them.

And we start from the problem, not the request. If you say "we need an app," we first ask who will use it, what it must solve, and what it must connect to. The right answer might be a web app, a business system, automation — or a combination. Bilingual and right-to-left experiences are supported wherever your audience needs them.',
                'answer_ar' => 'من التجارب الموجهة للجمهور إلى الأنظمة التي تدير عملياتك:

• المواقع الإلكترونية — مواقع الشركات والمنتجات وSaaS وصفحات الهبوط والتسويق ومنصات التوثيق.
• تطبيقات الويب — منصات العملاء والأسواق الإلكترونية وأنظمة الحجز ولوحات التحكم والبوابات.
• تطبيقات الجوال — عندما يحتاج مشروعك إلى تجربة جوال متصلة بمنظومتك الرقمية.
• أنظمة أعمال مخصصة — العمليات وإدارة العملاء والمخزون والفواتير وسير العمل والتقارير والفروع المتعددة.
• التكاملات — ربط APIs وخدمات الأطراف الثالثة حيث تحتاجها عملياتك.

ونبدأ دائماً من المشكلة، لا من الطلب. إن قلت "نحتاج إلى تطبيق"، نسأل أولاً: من سيستخدمه؟ ما المشكلة التي يعالجها؟ وبماذا يجب أن يتصل؟ قد تكون الإجابة الصحيحة تطبيق ويب، أو نظام أعمال، أو أتمتة — أو مزيجاً منها. مع دعم كامل للتجارب ثنائية اللغة واتجاه RTL حيث يحتاجها جمهورك.',
                'highlight_en' => 'Websites • Applications • Business systems • Integrations',
                'highlight_ar' => 'مواقع • تطبيقات • أنظمة أعمال • تكاملات',
                'category' => 'services',
                'sort_order' => 30,
            ],
            [
                'question_en' => 'Can we start with one service and grow over time?',
                'question_ar' => 'هل يمكننا البدء بخدمة واحدة ثم التوسع مع الوقت؟',
                'answer_en' => 'Yes — you choose the shape of the engagement, and it can evolve:

• Single Service — one focused project: UI/UX design, a website, an application, or an automation initiative.
• Combined Package — several services delivered as one project: design → website → application → automation.
• Custom Technology Project — we analyze your requirements and build a solution shaped around your operations.
• Long-Term Partnership — continuous development, maintenance, improvements, and new capabilities as your business changes.

Software does not stand still while a business changes — customers, operations, and technology all evolve. So a launch is a beginning, not an ending: maintenance, fixes, security improvements, new features, and performance work can continue under the terms of your agreement. We are not a vendor that delivers and disappears.',
                'answer_ar' => 'نعم — أنت تختار شكل التعاون، ويمكن أن يتطور مع الوقت:

• خدمة واحدة — مشروع محدد: تصميم واجهات، أو موقع، أو تطبيق، أو مبادرة أتمتة.
• باقة متكاملة — عدة خدمات تُنفَّذ كمشروع واحد: التصميم ثم الموقع ثم التطبيق ثم الأتمتة.
• مشروع تقني مخصص — ندرس متطلباتك ونبني حلاً مصمماً حول طبيعة عملياتك.
• شراكة طويلة الأمد — تطوير مستمر وصيانة وتحسينات وقدرات جديدة مع تغيّر أعمالك.

البرمجيات لا تتجمد بينما تتغير الشركات — العملاء والعمليات والتقنية تتطور باستمرار. لذلك الإطلاق بداية وليس نهاية: الصيانة والإصلاحات وتحسينات الأمان والميزات الجديدة وتطوير الأداء يمكن أن تستمر وفق بنود اتفاقك. لسنا مزوداً يسلّم ويغيب.',
                'highlight_en' => 'Single service • Combined package • Custom build • Long-term partnership',
                'highlight_ar' => 'خدمة واحدة • باقة متكاملة • بناء مخصص • شراكة طويلة الأمد',
                'category' => 'services',
                'sort_order' => 40,
            ],
            [
                'question_en' => 'How do you approach AI and automation?',
                'question_ar' => 'كيف تتعاملون مع الذكاء الاصطناعي والأتمتة؟',
                'answer_en' => 'As practical business tools — not buzzwords.

We start by looking at where your team loses time: repetitive workflows, manual data processing, internal coordination, customer interactions. Then we apply automation and AI only where they genuinely improve outcomes.

Typical applications:
• Automating repetitive workflows and data processing.
• Intelligent assistants for customers or internal teams.
• AI integrations within your existing platforms and tools.
• AI-enhanced features inside web and business applications.

We do not promise magic or guaranteed returns — and we will not sell you AI where a simpler solution works better. The goal is measurable: less manual effort, fewer errors, faster operations.',
                'answer_ar' => 'كأدوات أعمال عملية — لا كشعارات تسويقية.

نبدأ بالبحث عن الأماكن التي يهدر فيها فريقك وقته: سير العمل المتكرر، ومعالجة البيانات يدوياً، والتنسيق الداخلي، والتعامل مع العملاء. ثم نطبق الأتمتة والذكاء الاصطناعي حيث يحسّنان النتائج فعلاً.

من أبرز التطبيقات:
• أتمتة سير العمل المتكرر ومعالجة البيانات.
• مساعدون أذكياء لخدمة العملاء أو الفرق الداخلية.
• دمج قدرات الذكاء الاصطناعي في منصاتك وأدواتك القائمة.
• ميزات معززة بالذكاء الاصطناعي داخل تطبيقات الويب وأنظمة الأعمال.

لا نعد بمعجزات ولا بعوائد مضمونة — ولن نبيعك ذكاءً اصطناعياً إذا كان حلٌّ أبسط أكثر فعالية. الهدف ملموس: جهد يدوي أقل، وأخطاء أقل، وعمليات أسرع.',
                'highlight_en' => 'Practical AI • Workflow automation • Measurable value',
                'highlight_ar' => 'ذكاء اصطناعي عملي • أتمتة العمليات • قيمة ملموسة',
                'category' => 'services',
                'sort_order' => 50,
            ],
            [
                'question_en' => 'Does YS-SOFTWARE have its own software products?',
                'question_ar' => 'هل تمتلك YS-SOFTWARE منتجات برمجية خاصة؟',
                'answer_en' => 'Yes. YS-SOFTWARE runs on two sides: Services & Solutions, and YS Products.

Alongside bespoke projects, we develop our own SaaS products — YS-Matrix, YS-Sports, and YS-Care — and they are continuously evolving: ongoing improvements, new features, security updates, bug fixes, and performance work, with support and updates according to each product\'s terms.

For you, that creates two clear paths:

• Use one of our products when it fits your needs.
• Build a custom solution with us when your requirements go further.

The two sides strengthen each other: the challenges businesses actually face shape our product roadmap, and the discipline of running live products raises the standard of every custom project we deliver.',
                'answer_ar' => 'نعم. تعمل YS-SOFTWARE على جانبين: الخدمات والحلول، ومنتجات YS.

إلى جانب المشاريع المخصصة، نطوّر منتجات SaaS خاصة بنا — YS-Matrix وYS-Sports وYS-Care — وهي في تطور مستمر: تحسينات متواصلة، وميزات جديدة، وتحديثات أمنية، وإصلاحات، وتطوير للأداء، مع الدعم والتحديثات وفق شروط كل منتج.

وهذا يمنحك مسارين واضحين:

• استخدام أحد منتجاتنا عندما يلبي احتياجاتك.
• بناء حل مخصص معنا عندما تتجاوز متطلباتك ما يقدمه المنتج.

الجانبان يقوّي أحدهما الآخر: التحديات الحقيقية التي تواجهها الشركات توجه خارطة منتجاتنا، وانضباط تشغيل منتجات حية يرفع معيار كل مشروع مخصص نقدمه.',
                'highlight_en' => 'YS-Matrix • YS-Sports • YS-Care',
                'highlight_ar' => 'YS-Matrix • YS-Sports • YS-Care',
                'category' => 'products',
                'sort_order' => 60,
            ],
        ];

        foreach ($faqs as $faq) {
            Faq::updateOrCreate(
                ['question_en' => $faq['question_en']],
                array_merge($faq, ['status' => 'published'])
            );
        }
    }

    private function seedMenus(): void
    {
        // Header navigation
        $header = Menu::updateOrCreate(
            ['location' => 'header'],
            ['name' => 'Header Navigation', 'is_active' => true]
        );

        $headerItems = [
            ['title_en' => 'Products',     'title_ar' => 'المنتجات',     'url' => '/products',  'sort_order' => 10],
            ['title_en' => 'Docs',         'title_ar' => 'التوثيق',     'url' => '/docs',      'sort_order' => 20],
            ['title_en' => 'Updates',      'title_ar' => 'المستجدات',   'url' => '/updates',   'sort_order' => 30],
            ['title_en' => 'About',        'title_ar' => 'عن الشركة',   'url' => '/about',     'sort_order' => 40],
            ['title_en' => 'FAQ',          'title_ar' => 'الأسئلة الشائعة', 'url' => '/faq',  'sort_order' => 50],
        ];

        foreach ($headerItems as $item) {
            MenuItem::updateOrCreate(
                ['menu_id' => $header->id, 'url' => $item['url']],
                array_merge($item, ['is_active' => true, 'target' => '_self'])
            );
        }

        // Footer — Products
        $footerProducts = Menu::updateOrCreate(
            ['location' => 'footer_products'],
            ['name' => 'Footer Products', 'is_active' => true]
        );

        $footerProductItems = [
            ['title_en' => 'YS-Matrix',       'title_ar' => 'YS-Matrix',       'url' => '/products/ys-matrix',       'sort_order' => 10],
            ['title_en' => 'YS-Sports',       'title_ar' => 'YS-Sports',       'url' => '/products/ys-sports',       'sort_order' => 20],
            ['title_en' => 'YS-Care',         'title_ar' => 'YS-Care',         'url' => '/products/ys-care',         'sort_order' => 30],
        ];

        foreach ($footerProductItems as $item) {
            MenuItem::updateOrCreate(
                ['menu_id' => $footerProducts->id, 'url' => $item['url']],
                array_merge($item, ['is_active' => true, 'target' => '_self'])
            );
        }

        // Remove any fabricated/retired product entries that no longer exist
        // (e.g. legacy "Vortex Trader_Y" placeholder links).
        MenuItem::where('menu_id', $footerProducts->id)
            ->where('url', 'like', '/products/%')
            ->whereNotIn('url', array_column($footerProductItems, 'url'))
            ->delete();

        // Footer — Company
        $footerCompany = Menu::updateOrCreate(
            ['location' => 'footer_company'],
            ['name' => 'Footer Company', 'is_active' => true]
        );

        $footerCompanyItems = [
            ['title_en' => 'About',   'title_ar' => 'عن الشركة',   'url' => '/about',  'sort_order' => 10],
            ['title_en' => 'Careers', 'title_ar' => 'الوظائف',     'url' => '/careers', 'sort_order' => 20],
            ['title_en' => 'Contact', 'title_ar' => 'تواصل معنا',  'url' => '/contact', 'sort_order' => 30],
        ];

        foreach ($footerCompanyItems as $item) {
            MenuItem::updateOrCreate(
                ['menu_id' => $footerCompany->id, 'url' => $item['url']],
                array_merge($item, ['is_active' => true, 'target' => '_self'])
            );
        }

        // Footer — Resources
        $footerResources = Menu::updateOrCreate(
            ['location' => 'footer_resources'],
            ['name' => 'Footer Resources', 'is_active' => true]
        );

        $footerResourceItems = [
            ['title_en' => 'Docs',          'title_ar' => 'التوثيق',          'url' => '/docs',      'sort_order' => 10],
            ['title_en' => 'Roadmap',       'title_ar' => 'خارطة الطريق',     'url' => '/roadmap',   'sort_order' => 20],
            ['title_en' => 'Updates',       'title_ar' => 'المستجدات',        'url' => '/updates',   'sort_order' => 30],
            ['title_en' => 'Status',        'title_ar' => 'حالة النظام',      'url' => '/status',    'sort_order' => 40],
            ['title_en' => 'FAQ',           'title_ar' => 'الأسئلة الشائعة',  'url' => '/faq',       'sort_order' => 50],
            ['title_en' => 'Security',      'title_ar' => 'الأمان',           'url' => '/security',  'sort_order' => 60],
        ];

        foreach ($footerResourceItems as $item) {
            MenuItem::updateOrCreate(
                ['menu_id' => $footerResources->id, 'url' => $item['url']],
                array_merge($item, ['is_active' => true, 'target' => '_self'])
            );
        }

        // Footer — Legal
        $footerLegal = Menu::updateOrCreate(
            ['location' => 'footer_legal'],
            ['name' => 'Footer Legal', 'is_active' => true]
        );

        $footerLegalItems = [
            ['title_en' => 'Privacy Policy', 'title_ar' => 'سياسة الخصوصية',            'url' => '/privacy',      'sort_order' => 10],
            ['title_en' => 'Terms of Service', 'title_ar' => 'شروط الخدمة',             'url' => '/terms',        'sort_order' => 20],
            ['title_en' => 'Cookie Policy', 'title_ar' => 'سياسة ملفات تعريف الارتباط', 'url' => '/cookie-policy', 'sort_order' => 30],
        ];

        foreach ($footerLegalItems as $item) {
            MenuItem::updateOrCreate(
                ['menu_id' => $footerLegal->id, 'url' => $item['url']],
                array_merge($item, ['is_active' => true, 'target' => '_self'])
            );
        }
    }

    private function seedStaticPages(): void
    {
        $pages = [
            [
                'slug' => 'about',
                'title_en' => 'About YS Systems',
                'title_ar' => 'عن YS Systems',
                'excerpt_en' => 'We build modern, scalable, and secure software systems that solve real business problems.',
                'excerpt_ar' => 'نبني أنظمة برمجية حديثة وقابلة للتوسع وآمنة تحل مشكلات الأعمال الحقيقية.',
                'content_en' => json_encode([
                    ['label' => 'Our Mission', 'text' => 'To create scalable, secure, modern, and professional software products that solve real business problems for companies of all sizes.'],
                    ['label' => 'Our Vision',  'text' => 'Building modern software systems, SaaS platforms, and industry-specific business solutions that empower businesses to grow.'],
                ]),
                'content_ar' => json_encode([
                    ['label' => 'مهمتنا', 'text' => 'إنشاء منتجات برمجية قابلة للتوسع وآمنة وحديثة واحترافية تحل مشكلات الأعمال الحقيقية للشركات من جميع الأحجام.'],
                    ['label' => 'رؤيتنا', 'text' => 'بناء أنظمة برمجية حديثة ومنصات SaaS وحلول أعمال متخصصة تمكّن الشركات من النمو.'],
                ]),
                'status' => 'published',
                'published_at' => now(),
                'sort_order' => 10,
            ],
            [
                'slug' => 'privacy',
                'title_en' => 'Privacy Policy',
                'title_ar' => 'سياسة الخصوصية',
                'content_en' => json_encode([
                    ['title' => 'Information We Collect', 'body' => 'When you contact us through our website — for example, via our contact form — we collect the information you provide directly, such as your name, email address, phone number, subject, and message. We use this information solely to respond to your inquiry and provide the services you\'ve requested.'],
                    ['title' => 'How We Use Your Information', 'body' => 'We use information to provide and improve our services, communicate with you, and ensure security.'],
                    ['title' => 'Information Sharing', 'body' => 'We do not sell your personal information to third parties. We may share it with service providers only when necessary.'],
                    ['title' => 'Data Retention', 'body' => 'We retain the personal information you provide only for as long as necessary to respond to your inquiry, deliver our services, or comply with legal obligations. When it is no longer needed for these purposes, we securely delete it.'],
                    ['title' => 'Security', 'body' => 'We take appropriate security measures to protect your information from unauthorized access or disclosure.'],
                    ['title' => 'Contact Us', 'body' => 'If you have questions about this Privacy Policy, please contact us through our Contact page.'],
                ]),
                'content_ar' => json_encode([
                    ['title' => 'المعلومات التي نجمعها', 'body' => 'عندما تتواصل معنا عبر موقعنا — مثلاً من خلال نموذج التواصل — نجمع المعلومات التي تقدمها مباشرةً، مثل اسمك وبريدك الإلكتروني ورقم هاتفك وموضوع رسالتك ومحتواها. نستخدم هذه المعلومات فقط للرد على استفسارك وتقديم الخدمات التي طلبتها.'],
                    ['title' => 'كيف نستخدم معلوماتك', 'body' => 'نستخدم المعلومات لتقديم خدماتنا وتحسينها، والتواصل معك، وضمان الأمان.'],
                    ['title' => 'مشاركة المعلومات', 'body' => 'لا نبيع معلوماتك الشخصية لأطراف ثالثة. قد نشاركها مع مزودي الخدمات فقط عند الضرورة.'],
                    ['title' => 'الاحتفاظ بالبيانات', 'body' => 'نحتفظ بالمعلومات الشخصية التي تقدمها لنا فقط للمدة اللازمة للرد على استفسارك أو تقديم خدماتنا أو الامتثال لأي التزامات قانونية. وعندما لا تعود هناك حاجة لهذه المعلومات، نقوم بحذفها بشكل آمن.'],
                    ['title' => 'الأمان', 'body' => 'نتخذ تدابير أمنية مناسبة لحماية معلوماتك من الوصول غير المصرح به أو الإفصاح.'],
                    ['title' => 'الاتصال بنا', 'body' => 'إذا كانت لديك أسئلة حول سياسة الخصوصية، يرجى التواصل معنا عبر صفحة الاتصال'],
                ]),
                'status' => 'published',
                'published_at' => now(),
                'sort_order' => 20,
            ],
            [
                'slug' => 'terms',
                'title_en' => 'Terms of Service',
                'title_ar' => 'شروط الخدمة',
                'content_en' => json_encode([
                    ['title' => 'Acceptance of Terms', 'body' => 'By using YS Systems & Software services, you agree to be bound by these terms and conditions.'],
                    ['title' => 'Use of Services', 'body' => 'Our services must be used for lawful purposes only. Any use that conflicts with applicable laws is prohibited.'],
                    ['title' => 'Intellectual Property', 'body' => 'All content, software, and trademarks associated with our services are the property of YS Systems & Software.'],
                    ['title' => 'Disclaimer', 'body' => 'We provide our services "as is" without warranties of any kind, either express or implied.'],
                    ['title' => 'Updates to Terms', 'body' => 'We reserve the right to modify these terms at any time. We will notify you of material changes via email.'],
                    ['title' => 'Contact', 'body' => 'For questions about these Terms, please contact us through our Contact page.'],
                ]),
                'content_ar' => json_encode([
                    ['title' => 'قبول الشروط', 'body' => 'باستخدامك لخدمات YS Systems & Software، فإنك توافق على الالتزام بهذه الشروط والأحكام.'],
                    ['title' => 'استخدام الخدمات', 'body' => 'يجب استخدام خدماتنا للأغراض المشروعة فقط. يُحظر أي استخدام يتعارض مع القوانين المعمول بها.'],
                    ['title' => 'الملكية الفكرية', 'body' => 'جميع المحتوى والبرمجيات والعلامات التجارية المرتبطة بخدماتنا هي ملك لـ YS Systems & Software.'],
                    ['title' => 'إخلاء المسؤولية', 'body' => 'نقدم خدماتنا "كما هي" دون ضمانات صريحة أو ضمنية من أي نوع.'],
                    ['title' => 'تحديثات الشروط', 'body' => 'نحتفظ بحق تعديل هذه الشروط في أي وقت. سنبلغك بالتغييرات الجوهرية عبر البريد الإلكتروني.'],
                    ['title' => 'التواصل', 'body' => 'للاستفسار عن هذه الشروط، يرجى التواصل معنا عبر صفحة الاتصال'],
                ]),
                'status' => 'published',
                'published_at' => now(),
                'sort_order' => 30,
            ],
            [
                'slug' => 'cookie-policy',
                'title_en' => 'Cookie Policy',
                'title_ar' => 'سياسة ملفات تعريف الارتباط',
                'content_en' => json_encode([
                    ['title' => 'What Are Cookies?', 'body' => 'Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work or work more efficiently, as well as to provide information to the site owners.'],
                    ['title' => 'How We Use Cookies', 'body' => "We use cookies and similar local storage for the following purposes:\n\n• Essential: required for our website to function — for example, remembering your cookie preference and your light/dark theme selection.\n\n• Analytics: we do not currently use analytics or tracking cookies. If we introduce them in the future, we will update this policy and ask for your consent again."],
                    ['title' => 'Consent', 'body' => 'When you first visit our site, we will show you a pop-up explaining our cookie policy. You can choose to accept all cookies, reject non-essential cookies, or customize your preferences. Your preferences are stored in your browser for use on future visits.'],
                    ['title' => 'Managing Preferences', 'body' => 'You can change your cookie preferences at any time by adjusting your browser settings. Most browsers allow you to delete or reject cookies. Please note that disabling essential cookies may affect the functionality of our site.'],
                    ['title' => 'Third Parties', 'body' => 'We do not use any third-party services that place non-essential cookies without your explicit consent. Any third-party cookies we may request will be managed according to their respective privacy policies.'],
                    ['title' => 'Contact Us', 'body' => 'If you have any questions about our Cookie Policy, please contact us through our Contact page..'],
                ]),
                'content_ar' => json_encode([
                    ['title' => 'ما هي ملفات تعريف الارتباط؟', 'body' => 'ملفات تعريف الارتباط هي ملفات نصية صغيرة يتم وضعها على جهاز الكمبيوتر أو الجهاز المحمول الخاص بك عند زيارة موقع ويب. تُستخدم على نطاق واسع لجعل مواقع الويب تعمل أو تعمل بكفاءة أكبر، بالإضافة إلى توفير معلومات لأصحاب الموقع.'],
                    ['title' => 'كيف نستخدم ملفات تعريف الارتباط', 'body' => "نستخدم ملفات تعريف الارتباط والتخزين المحلي المشابه للأغراض التالية:\n\n• أساسية: مطلوبة لتشغيل موقعنا — مثل حفظ تفضيلك لملفات تعريف الارتباط واختيارك للشكل الفاتح أو الغامق.\n\n• تحليلية: لا نستخدم حاليًا أي ملفات تعريف ارتباط تحليلية أو تتبع. إذا أضفناها مستقبلًا، سنحدّث هذه السياسة ونطلب موافقتك مرة أخرى."],
                    ['title' => 'الموافقة', 'body' => 'عند زيارتك لموقعنا لأول مرة، سنعرض لك نافذة منبثقة تشرح سياسة ملفات تعريف الارتباط الخاصة بنا. يمكنك اختيار قبول جميع ملفات تعريف الارتباط أو رفض ملفات تعريف الارتباط غير الأساسية أو تخصيص تفضيلاتك. يتم تخزين تفضيلاتك في متصفحك لاستخدامها في الزيارات المستقبلية.'],
                    ['title' => 'إدارة التفضيلات', 'body' => 'يمكنك تغيير تفضيلات ملفات تعريف الارتباط الخاصة بك في أي وقت عن طريق ضبط إعدادات متصفحك. يمكن لمعظم المتصفحات حذف ملفات تعريف الارتباط أو رفضها. يرجى ملاحظة أن تعطيل ملفات تعريف الارتباط الأساسية قد يؤثر على وظائف موقعنا.'],
                    ['title' => 'جهات خارجية', 'body' => 'لا نستخدم خدمات جهات خارجية تضع ملفات تعريف ارتباط غير أساسية دون موافقتك الصريحة. أي ملفات تعريف ارتباط تابعة لجهات خارجية سنطلبها سيتم إدارتها وفقًا لسياسات الخصوصية الخاصة بها.'],
                    ['title' => 'الاتصال بنا', 'body' => 'إذا كانت لديك أسئلة حول سياسة ملفات تعريف الارتباط الخاصة بنا، يرجى التواصل معنا عبر صفحة الاتصال.'],
                ]),
                'status' => 'published',
                'published_at' => now(),
                'sort_order' => 40,
            ],
            [
                'slug' => 'security',
                'title_en' => 'Security at YS Systems',
                'title_ar' => 'الأمان في YS Systems',
                'excerpt_en' => 'How we protect our platforms and our customers\' data.',
                'excerpt_ar' => 'كيف نحمي منصاتنا وبيانات عملائنا.',
                'content_en' => json_encode([
                    ['title' => 'Our Security Commitment', 'body' => 'Security is the foundation of everything we build. We follow industry best practices to protect our customers\' data and maintain the integrity of our platforms. Our team continuously assesses and improves our security posture to address evolving threats.'],
                    ['title' => 'Infrastructure Security', 'body' => 'We employ multiple layers of security controls to protect our infrastructure, including firewalls, intrusion detection systems, and regular security patching. Data is stored in secure data centers with strict access controls.'],
                    ['title' => 'Encryption', 'body' => 'All data transmitted between our clients and our servers is encrypted using TLS/SSL. Data at rest is encrypted using strong encryption standards to protect it from unauthorized access.'],
                    ['title' => 'Access Control', 'body' => 'We enforce strict access controls based on the principle of least privilege. Access to systems and data is secured with multi-factor authentication and regularly reviewed.'],
                    ['title' => 'Security Assessment', 'body' => 'We conduct regular security assessments, including vulnerability scanning and code review, to proactively identify and address potential risks.'],
                    ['title' => 'Data Protection', 'body' => 'We implement measures to protect sensitive data, including role-based access controls, data classification, and secure storage and disposal practices.'],
                ]),
                'content_ar' => json_encode([
                    ['title' => 'التزامنا بالأمان', 'body' => 'الأمان هو أساس كل ما نبنيه. نتبع أفضل الممارسات في الصناعة لحماية بيانات عملائنا والحفاظ على سلامة منصاتنا. فريقنا يقيّم باستمرار ويحسن وضعنا الأمني لمواجهة التهديدات المتطورة.'],
                    ['title' => 'أمان البنية التحتية', 'body' => 'نستخدم طبقات متعددة من الضوابط الأمنية لحماية البنية التحتية لدينا، بما في ذلك جدران الحماية وأنظمة كشف التسلل والتحديثات الأمنية المنتظمة. يتم تخزين البيانات في مراكز بيانات آمنة مع ضوابط وصول صارمة.'],
                    ['title' => 'التشفير', 'body' => 'جميع البيانات المنقولة بين عملائنا وخوادمنا مشفرة باستخدام TLS/SSL. البيانات المخزنة مشفرة باستخدام معايير تشفير قوية لحمايتها من الوصول غير المصرح به.'],
                    ['title' => 'التحكم في الوصول', 'body' => 'نطبق ضوابط وصول صارمة بناءً على مبدأ أقل امتياز. يتم تأمين الوصول إلى الأنظمة والبيانات بالمصادقة متعددة العوامل ومراجعته بانتظام.'],
                    ['title' => 'تقييم الأمان', 'body' => 'نجري تقييمات أمنية منتظمة، بما في ذلك فحص الثغرات الأمنية ومراجعة الكود، لتحديد ومعالجة المخاطر المحتملة بشكل استباقي.'],
                    ['title' => 'حماية البيانات', 'body' => 'نطبق إجراءات لحماية البيانات الحساسة، بما في ذلك ضوابط الوصول المستندة إلى الأدوار، وتصنيف البيانات، وممارسات التخزين والتخلص الآمنة.'],
                ]),
                'status' => 'published',
                'published_at' => now(),
                'sort_order' => 50,
            ],
        ];

        foreach ($pages as $page) {
            StaticPage::updateOrCreate(
                ['slug' => $page['slug']],
                $page
            );
        }
    }
}
