<?php

namespace Database\Seeders;

use App\Domains\Services\Models\Service;
use Illuminate\Database\Seeder;

/**
 * Seeds the company's real commercial service catalog.
 *
 * Order matters to the storefront: the homepage "Services" section picks
 * the three is_featured rows, and /services sorts by sort_order.
 *
 * Idempotent (updateOrCreate keyed on slug) — safe to re-run after fresh
 * deployments; admin edits to descriptions/pricing survive re-seeding for
 * keys not present in this file (this seeder overwrites its own keys only).
 *
 * Pricing note (agreed with the owner): every service is quoted per
 * project after a free consultation — no "starting at" anchors until the
 * company publishes them deliberately.
 */
class ServicesSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->services() as $row) {
            Service::updateOrCreate(
                ['slug' => $row['slug']],
                $row,
            );
        }

        $this->command->info('✓ Services catalog seeded (11 services).');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function services(): array
    {
        return [
            // ── WEB ──────────────────────────────────────────────────
            [
                'slug' => 'business-websites',
                'name_en' => 'Business Websites',
                'name_ar' => 'مواقع تعريفية للشركات',
                'category' => 'web',
                'short_desc_en' => 'Corporate websites and portfolios that build trust and turn visitors into clients.',
                'short_desc_ar' => 'مواقع شركات وبورتفوليو تبني الثقة وتحوّل الزائر إلى عميل حقيقي.',
                'description_en' => "Your website is your first handshake with the market. We build corporate sites, portfolios and professional profiles that load fast, look premium on every screen, and are structured to rank well on Google.\n\nEvery build includes: a custom design matched to your brand, full bilingual support (Arabic/English), contact and lead forms wired to email and WhatsApp, an admin area to edit your own content, and domain + hosting setup handled end to end for you.\n\nWe start with a free consultation to understand your business, then agree on a clear scope, a fixed timeline and a signed contract. You get a warranty period after launch — and optional monthly maintenance if you'd rather never think about it again.",
                'description_ar' => "موقعك هو أول مصافحة بينك وبين السوق. نبني مواقع شركات وبورتفوليو وملفات تعريفية احترافية: سريعة التحميل، شكلها فاخر على كل الشاشات، ومبنية من الأول بحيث تتصدر نتائج البحث.\n\nكل تنفيذ يشمل: تصميم مخصص لهويتك، دعم كامل باللغتين عربي/إنجليزي، نماذج تواصل موصولة بالإيميل والواتساب، لوحة تحكم تدير بها محتواك بنفسك، وتجهيز الدومين والاستضافة كاملة بالنيابة عنك.\n\nبنبدأ باستشارة مجانية نفهم فيها بيزنسك، وبعدها نتفق على نطاق واضح ومدة تسليم محددة وعقد موقّع. ومعك ضمان بعد التسليم — وصيانة شهرية اختيارية لو تحب القلق ده يبقى مشكلتنا مش مشكلتك.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => true,
                'sort_order' => 10,
            ],
            [
                'slug' => 'ecommerce-stores',
                'name_en' => 'E-commerce Stores',
                'name_ar' => 'متاجر إلكترونية',
                'category' => 'web',
                'short_desc_en' => 'Complete online stores with payments, shipping and inventory — ready to take your first order.',
                'short_desc_ar' => 'متجر إلكتروني كامل: دفع إلكتروني وشحن وإدارة مخزون — جاهز لاستقبال أول أوردر.',
                'description_en' => "Sell online with full control. We build e-commerce stores with everything a real store needs on day one: payment gateways (cards, wallets, bank transfer or cash on delivery), shipping integrations with the carriers you use, inventory and order management, discount codes, and order notifications for you and your customers.\n\nThe design is conversion-focused: clear product pages, a checkout in as few steps as possible, and a mobile experience that doesn't lose sales.\n\nYou also get hands-on training to run the store yourself — products, orders, reports — plus a warranty period and optional monthly maintenance, so your store never sleeps.",
                'description_ar' => "بيع أونلاين وتحكم كامل في مبيعاتك. نبني متاجر إلكترونية فيها كل حاجة المتجر الحقيقي محتاجها من أول يوم: بوابات دفع (بطاقات ومحافظ وتحويل بنكي ودفع عند الاستلام)، ربط بشركات الشحن اللي بتشتغل معاها، إدارة منتجات ومخزون وأوردرات، أكواد خصم، وإشعارات فورية ليك ولفريقك.\n\nالتصميم مبني عشان يبيع: صفحات منتجات واضحة، خطوات الدفع بأقل ممكن، وتجربة موبايل من غير ما تضيع أوردر زبون.\n\nوكمان بنديك تدريب عملي تدير المتجر بنفسك — منتجات وأوردرات وتقارير — مع ضمان بعد التسليم وصيانة شهرية اختيارية عشان متجرك ما ينامش.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => true,
                'sort_order' => 20,
            ],
            [
                'slug' => 'landing-pages',
                'name_en' => 'Landing Pages',
                'name_ar' => 'صفحات هبوط',
                'category' => 'web',
                'short_desc_en' => 'High-converting landing pages for ad campaigns, product launches and offers.',
                'short_desc_ar' => 'صفحات هبوط عالية التحويل لحملاتك الإعلانية وإطلاقاتك وعروضك.',
                'description_en' => "You're paying for every click — the landing page decides whether that click becomes a lead. We design and build focused landing pages for campaigns, launches and offers: one clear message, one clear action, minimal load time.\n\nIncludes a structure ready for A/B testing, copy guidance, lead capture straight to your email, WhatsApp or CRM, and analytics so you can see exactly what your budget is buying.\n\nPerfect for a single campaign or a fast experiment — delivered in days, not weeks.",
                'description_ar' => "أنت بتدفع على كل كليك — وصفحة الهبوط هي اللي بتقرر الكليك ده يتحول لعميل ولا لأ. نصمم وننفذ صفحات هبوط مركزة لحملاتك وإطلاقاتك وعروضك: رسالة واحدة واضحة، أمر واحد واضح، وسرعة تحميل قصوى.\n\nتشمل: هيكل جاهز لاختبارات A/B، إرشادات للنصوص التسويقية، تجميع الليدز مباشرة على إيميلك أو واتسابك أو نظام إدارة العملاء عندك، وتحليلات تشوف بيها بالظبط ميزانيتك راحت فين.\n\nمثالية لحملة واحدة أو تجربة سريعة — تسليم بأيام، مش بالأسابيع.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 30,
            ],
            [
                'slug' => 'web-platforms',
                'name_en' => 'Web Platforms & Dashboards',
                'name_ar' => 'منصات ويب ولوحات تحكم',
                'category' => 'web',
                'short_desc_en' => 'Custom platforms, client portals, booking systems and admin dashboards.',
                'short_desc_ar' => 'منصات مخصصة وبوابات عملاء وأنظمة حجز ولوحات تحكم إدارية.',
                'description_en' => "When a website isn't enough — you need a platform. We engineer custom web systems built around your exact workflow: client portals, booking and scheduling systems, subscription areas, internal dashboards, role-based access, and APIs that connect everything.\n\nWe choose the stack for longevity — maintainable, secure and documented — and build in phases with clear milestones, so you see working software early, not a big reveal at the end. Training is part of the delivery hand-over.\n\nScalable by design: it serves your team today and holds up when your customer base grows tenfold.",
                'description_ar' => "لما الموقع العادي يبقى مش كفاية — ساعتها تحتاج منصة. ننفذ أنظمة ويب مخصصة مبنية حول طريقة شغلك بالضبط: بوابات عملاء، أنظمة حجز وجدولة، مساحات اشتراكات، لوحات تحكم داخلية، صلاحيات مختلفة لكل مستخدم، وواجهات API تربط كل عناصر النظام ببعضها.\n\nنختار التقنيات بمنطق المستقبل: صيانة سهلة وأمان عالٍ وتوثيق كامل، وننفذ على مراحل بمسارات واضحة — شغلك يبان أولاً بأول، مش مفاجأة كبيرة في الآخر. والتدريب جزء من التسليم.\n\nقابلة للتوسع بالتصميم: تخدم فريقك دلوقتي، وتستحمل لما عدد عملائك يتضاعف.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 40,
            ],

            // ── MOBILE ───────────────────────────────────────────────
            [
                'slug' => 'mobile-apps',
                'name_en' => 'Mobile Apps',
                'name_ar' => 'تطبيقات موبايل',
                'category' => 'mobile',
                'short_desc_en' => 'Android & iOS apps with clean UX — built to be published on both stores.',
                'short_desc_ar' => 'تطبيقات Android و iOS بتجربة استخدام نظيفة — مع نشرها على المتجرين.',
                'description_en' => "Your app in your customer's pocket. We build mobile apps with a native feel from a single codebase for Android and iOS — faster to launch, cheaper to maintain, no compromise on quality.\n\nFrom flows and wireframes to the final store submission: we handle design, development, push notifications, offline behavior where it matters, and the full Google Play / App Store publishing process — listings, screenshots and review compliance in both languages.\n\nAfter launch: crash monitoring and a warranty period, with acceptance criteria agreed before any code is written.",
                'description_ar' => "تطبيقك جوه موبايل عميلك. نبني تطبيقات موبايل بإحساس أصلي (native) من قاعدة كود واحدة لـ Android و iOS — إطلاق أسرع، صيانة أرخص، ومن غير أي تضحية في الجودة.\n\nمن مسارات الاستخدام والـ wireframes لحد النشر النهائي على المتاجر: بنقوم بالتصميم والتنفيذ والإشعارات الفورية وسلوك الأوفلاين لما يكون مهم، وعملية النشر الكاملة على Google Play و App Store — صفحات المتجر والسكرين شوتات والالتزام بمعايير المراجعة، بالعربي والإنجليزي.\n\nبعد الإطلاق: مراقبة أعطال وضمان — ومعايير الاستلام متفق عليها قبل كتابة أول سطر كود.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 50,
            ],

            // ── DESIGN ───────────────────────────────────────────────
            [
                'slug' => 'ui-ux-design',
                'name_en' => 'UI/UX Design',
                'name_ar' => 'تصميم واجهات وتجربة استخدام',
                'category' => 'design',
                'short_desc_en' => 'Interfaces that look premium and keep users moving — web and mobile.',
                'short_desc_ar' => 'واجهات شكلها فاخر ومش بتتخلي المستخدم يضيع — للويب والموبايل.',
                'description_en' => "Design is not decoration — it's how your product feels and how it sells. We design interfaces and experiences for websites, platforms and apps: research-informed flows, wireframes, high-fidelity visuals, and a design system developers can build from directly.\n\nWe test with real content on real screens, cover every state (loading, empty, errors), and hand off developer-ready specs that leave nothing to guesswork.\n\nAvailable standalone, or bundled with any product we build for you — one team, one vision.",
                'description_ar' => "التصميم مش زينة — التصميم هو إحساس منتجك وهو اللي بيبيع عنك. نصمم واجهات وتجارب استخدام للمواقع والمنصات والتطبيقات: مسارات محسوبة اتجاهاتها، wireframes، تصاميم عالية الدقة، ونظام تصميم جاهز يبنوا عليه المطورين مباشرة.\n\nنجرّب بالمحتوى الحقيقي على الشاشات الحقيقية، وبنغطي كل حالة (تحميل، فاضي، أخطاء)، ونسلّم مواصفات جاهزة للمطورين من غير أي تخمين.\n\nمتاحة كخدمة مستقلة، أو ضمن أي تنفيذ بنبنيه ليك — فريق واحد ورؤية واحدة.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 60,
            ],
            [
                'slug' => 'brand-identity',
                'name_en' => 'Brand Identity & Logos',
                'name_ar' => 'هوية بصرية ولوجوهات',
                'category' => 'design',
                'short_desc_en' => 'Logos, brand guidelines and social media designs that make you memorable.',
                'short_desc_ar' => 'لوجوهات ودليل هوية وتصميمات سوشيال ميديا تخلي شكل شركتك يفضل في الذاكرة.',
                'description_en' => "People judge with their eyes before they read. We craft complete visual identities: a logo with all its variations, a color system, typography, brand guidelines, business cards and official document templates — plus ongoing social media designs that keep your feed consistent.\n\nEverything is yours: full source files, commercially licensed fonts, and prepared exports for both print and web.\n\nStart from zero or refresh an existing brand — you get the same craft either way.",
                'description_ar' => "الناس بتحكم بالعيون قبل ما تقرأ. ننفذ هويات بصرية كاملة: لوجو بكل تحويلاته، منظومة ألوان، خطوط، دليل هوية كامل، بطاقات أعمال وقوالب مستندات رسمية — وكمان تصميمات سوشيال ميديا مستمرة تخلي صفحاتك شكلها واحد محترف.\n\nكل حاجة تبقى ملكك: ملفات المصدر كاملة، خطوط مرخصة للاستخدام التجاري، وملفات جاهزة للطباعة والويب.\n\nتبدأ من الصفر أو تعمل تجديد لبراند موجود — بنفس مستوى الحرفية في الحالتين.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 70,
            ],

            // ── SYSTEMS ──────────────────────────────────────────────
            [
                'slug' => 'erp-business-systems',
                'name_en' => 'ERP & Business Systems',
                'name_ar' => 'أنظمة شركات و ERP',
                'category' => 'systems',
                'short_desc_en' => 'Custom ERP: inventory, customers, invoices and HR — built around how YOUR business works.',
                'short_desc_ar' => 'أنظمة ERP مخصصة: مخازن وعملاء وفواتير وموارد بشرية — مبنية حول طريقة شغلك إنت.',
                'description_en' => "Stop fighting Excel and bloated generic software. We build business-management systems around your real operation: inventory and warehouses, customers and leads, quotations and invoices, purchasing, HR and payroll basics, and dashboards that show the health of your business — not just big tables of numbers.\n\nUnlike off-the-shelf ERP: no features you don't need, and no workflow forced onto your team. We map how your business actually runs, digitize it carefully, and train your staff to run it day to day.\n\nDeployed in phases — we start with the module causing you the most pain — so cost and change land gradually, not all at once.",
                'description_ar' => "بلاش تسخن راسك مع Excel، وبلاش برامج جاهزة متخمة مش مربوطة بشغلك. نبني أنظمة إدارة أعمال حول عمليك الحقيقي: مخازن ومستودعات، عملاء وليدز، عروض أسعار وفواتير، مشتريات، أساسيات الموارد البشرية والرواتب، ولوحات تحكم تعرضلك صورة واضحة عن صحة بيزنسك — مش مجرد جداول أرقام.\n\nوغير الـ ERP الجاهز: مفيش features مش محتاجتها، ومفيش طريقة شغل مفروضة على موظفينك. بنفهم طريقة شغلك الفعلية، وندخلها على النظام بنفس شكلها، وندرب موظفينك عليها لحد ما يشوفوا براحتهم.\n\nالتنفيذ على مراحل: بنبدأ بالجزء اللي بيرهقك أكتر، فالتكلفة والتغيير بيجوا بالتدريج مش دفعة واحدة.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => true,
                'sort_order' => 80,
            ],
            [
                'slug' => 'integrations-automation',
                'name_en' => 'Integrations & Automation',
                'name_ar' => 'تكاملات وأتمتة الأنظمة',
                'category' => 'systems',
                'short_desc_en' => 'Connecting what you already use: payments, WhatsApp API, shipping, CRM — so data flows on its own.',
                'short_desc_ar' => 'نربط الأنظمة اللي عندك: دفع، WhatsApp API، شحن، CRM — عشان البيانات تمشي لحالها.',
                'description_en' => "Your tools work — they just don't talk to each other. We connect your existing systems: payment gateways, the official WhatsApp API, shipping providers, accounting software, CRMs, Google Workspace, marketplaces — so data moves by itself instead of being retyped by staff.\n\nThen comes the automation layer: automatic confirmations, reminders, invoice generation, scheduled reports — cutting hours of manual, error-prone work every week.\n\nWe start with an audit: we review your current stack and tell you exactly what deserves automation and what should stay as-is.",
                'description_ar' => "أنظمتك شغالة — لكن مش بتكلم بعضها. نربط أنظمتك الحالية: بوابات دفع، الـ WhatsApp API الرسمي، شركات الشحن، برامج المحاسبة، أنظمة إدارة العملاء، Google Workspace، الأسواق الإلكترونية — عشان البيانات تتحرك لحالها بدل ما الموظفين ينقلوها يدوي ورقة لورقة.\n\nبعدها بنبني طبقة الأتمتة: تأكيدات تلقائية، تذكيرات، توليد فواتير، تقارير مجدولة — وبيوفر ساعات من الشغل اليدوي المتكرر كل أسبوع.\n\nبنبدأ بفحص سريع: نراجع أدواتك الحالية ونقولك بالظبط مين يستحق الأتمتة ومين يفضل زي ما هو.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 90,
            ],

            // ── AI ───────────────────────────────────────────────────
            [
                'slug' => 'ai-solutions',
                'name_en' => 'AI Solutions & Chatbots',
                'name_ar' => 'حلول ذكاء اصطناعي وشات بوت',
                'category' => 'ai',
                'short_desc_en' => 'Sales/support chatbots and AI automation that cut costs and reply in seconds.',
                'short_desc_ar' => 'شات بوتات مبيعات ودعم وأتمتة بالذكاء الاصطناعي توفر تكاليف وبردود لحظية.',
                'description_en' => "AI that earns its keep. We build practical AI tools for real businesses: WhatsApp and website chatbots that answer customers in Arabic and English around the clock, smart routing of leads to the right person, document and data processing, and custom AI features inside the products we build for you.\n\nWe deliberately avoid hype: we start from what's actually repetitive in your day — the same questions over and over, manual data entry, slow replies — and automate only what pays for itself.\n\nYour data stays yours: official APIs, strict access control, and we never train anything on your customer data.",
                'description_ar' => "ذكاء اصطناعي بيربح فعلاً. ننفذ أدوات ذكاء اصطناعي عملية بجد: شات بوتات على الواتساب والموقع بترد على عملائك بالعربي والإنجليزي على مدار الساعة، توجيه الليدز بذكاء للموظف المناسب، معالجة مستندات وبيانات، وfeatures مخصصة جوه أي نظام نبنيه ليك.\n\nمن غير مبالغات مبيعات: بنبدأ من المتكرر فعلًا في يومك — نفس الأسئلة كل شوية، إدخال بيانات يدوي، ردود متأخرة — وبنأتمت اللي يرجّع تكلفته فعلاً.\n\nبياناتك ملكك: واجهات رسمية وصلاحيات مضبوطة، وما بنستخدمش بيانات عملائك أبدًا في تدريب أي حاجة.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_project',
                'service_class' => Service::SERVICE_CLASS_CUSTOM,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 100,
            ],

            // ── SUPPORT ──────────────────────────────────────────────
            [
                'slug' => 'maintenance-support',
                'name_en' => 'Maintenance & Support',
                'name_ar' => 'صيانة ودعم تقني',
                'category' => 'support',
                'short_desc_en' => 'Monthly care for your website or system: updates, backups, security and fixes.',
                'short_desc_ar' => 'رعاية شهرية لموقعك أو نظامك: تحديثات ونسخ احتياطي وأمان وإصلاحات.',
                'description_en' => "Software needs a caretaker, or it quietly decays. Our monthly maintenance plan keeps your website or system healthy: security updates and patches, regular off-site backups, uptime and performance monitoring, small fixes and content edits, and priority response when something urgent comes up.\n\nEvery month you get a simple report: what was done and the current health status.\n\nFor systems we built ourselves, response is faster and fixes are precise — we already know the code. Available per project or as an annual agreement.",
                'description_ar' => "البرمجيات محتاجة حد يرعاها، وإلا بتبوظ بالهدوء. خطة الصيانة الشهرية بتشتغل عشان موقعك ونظامك يفضلوا سليمين: تحديثات أمنية وترقيعات دورية، نسخ احتياطية منتظمة في مكان منفصل، مراقبة التشغيل والأداء، إصلاحات صغيرة وتعديلات محتوى، وأولوية في الرد لما يكون في حاجة مستعجلة.\n\nكل شهر بيوصلك تقرير بسيط: إيه اللي اتعمل وهل النظام سليم.\n\nوللأنظمة اللي إحنا نفسنا بنيناها: الرد أسرع والإصلاح أدق — بنعرف الكود من أوله. متاحة لكل مشروع على حدة أو باتفاق سنوي.",
                'pricing_type' => Service::PRICING_TYPE_CUSTOM_QUOTE,
                'currency' => 'USD',
                'billing_cycle' => 'per_month',
                'service_class' => Service::SERVICE_CLASS_SUBSCRIPTION,
                'status' => Service::STATUS_ACTIVE,
                'is_featured' => false,
                'sort_order' => 110,
            ],
        ];
    }
}
