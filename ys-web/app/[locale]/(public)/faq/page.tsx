import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata, safeJsonLd } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'
import { FaqAccordion } from '@/components/faq/FaqAccordion'
import type { FaqItem } from '@/types'

const locales = ['en', 'ar'] as const

const fallbackFaqs: Record<string, Array<{ q: string; a: string; h?: string }>> = {
  en: [
    {
      q: 'What exactly does YS-SOFTWARE do?',
      h: 'Design • Build • Systems • Automate • Connect • Evolve',
      a: `YS-SOFTWARE is a digital technology partner — not a single-service agency.

We help businesses design, build, automate, connect, and continuously evolve their digital ecosystem. One relationship can cover the entire journey:

• Design — UI/UX and digital experiences.
• Build — websites, web applications, and mobile apps.
• Systems — custom software built around your operations.
• Automate — AI and workflow automation where they create real value.
• Connect — APIs and integrations that bring your tools together.
• Evolve — support, maintenance, and continuous development.

Alongside client services, we also build our own SaaS products — so we think like product people, not just project contractors.`,
    },
    {
      q: 'Why work with YS-SOFTWARE as a technology partner?',
      h: 'One partner • Full continuity • Start small, grow over time',
      a: `Because a business rarely has just one digital need.

Companies often end up managing separate providers for design, website, application, business systems, and automation — disconnected work, with no one seeing the full picture. Working with one partner changes that:

• Continuity — from brand and digital experience to websites, applications, systems, and automation.
• Understanding — one team that knows your business, not a new vendor learning it from scratch.
• Connection — systems and platforms designed to work together from day one.
• Direction — a clearer technology roadmap as your needs grow.

And you can start small. A startup might begin with UI/UX and a website, then add a web application, then a custom business system, then automation — the same partner at every stage.`,
    },
    {
      q: 'What can YS-SOFTWARE build for my business?',
      h: 'Websites • Applications • Business systems • Integrations',
      a: `From public-facing experiences to the systems that run your operations:

• Websites — corporate, product, SaaS, landing, marketing, and documentation platforms.
• Web Applications — customer platforms, marketplaces, booking systems, dashboards, and portals.
• Mobile Applications — where your project benefits from mobile, connected to your wider ecosystem.
• Custom Business Systems — operations, CRM, inventory, billing, workflow, reporting, and multi-branch systems.
• Integrations — APIs and third-party services, connected where your workflows need them.

And we start from the problem, not the request. If you say "we need an app," we first ask who will use it, what it must solve, and what it must connect to. The right answer might be a web app, a business system, automation — or a combination. Bilingual and right-to-left experiences are supported wherever your audience needs them.`,
    },
    {
      q: 'Can we start with one service and grow over time?',
      h: 'Single service • Combined package • Custom build • Long-term partnership',
      a: `Yes — you choose the shape of the engagement, and it can evolve:

• Single Service — one focused project: UI/UX design, a website, an application, or an automation initiative.
• Combined Package — several services delivered as one project: design → website → application → automation.
• Custom Technology Project — we analyze your requirements and build a solution shaped around your operations.
• Long-Term Partnership — continuous development, maintenance, improvements, and new capabilities as your business changes.

Software does not stand still while a business changes — customers, operations, and technology all evolve. So a launch is a beginning, not an ending: maintenance, fixes, security improvements, new features, and performance work can continue under the terms of your agreement. We are not a vendor that delivers and disappears.`,
    },
    {
      q: 'How do you approach AI and automation?',
      h: 'Practical AI • Workflow automation • Measurable value',
      a: `As practical business tools — not buzzwords.

We start by looking at where your team loses time: repetitive workflows, manual data processing, internal coordination, customer interactions. Then we apply automation and AI only where they genuinely improve outcomes.

Typical applications:
• Automating repetitive workflows and data processing.
• Intelligent assistants for customers or internal teams.
• AI integrations within your existing platforms and tools.
• AI-enhanced features inside web and business applications.

We do not promise magic or guaranteed returns — and we will not sell you AI where a simpler solution works better. The goal is measurable: less manual effort, fewer errors, faster operations.`,
    },
    {
      q: 'Does YS-SOFTWARE have its own software products?',
      h: 'YS-Matrix • YS-Sports • YS-Care',
      a: `Yes. YS-SOFTWARE runs on two sides: Services & Solutions, and YS Products.

Alongside bespoke projects, we develop our own SaaS products — YS-Matrix, YS-Sports, and YS-Care — and they are continuously evolving: ongoing improvements, new features, security updates, bug fixes, and performance work, with support and updates according to each product's terms.

For you, that creates two clear paths:

• Use one of our products when it fits your needs.
• Build a custom solution with us when your requirements go further.

The two sides strengthen each other: the challenges businesses actually face shape our product roadmap, and the discipline of running live products raises the standard of every custom project we deliver.`,
    },
  ],
  ar: [
    {
      q: 'ما الذي تقدمه YS-SOFTWARE بالضبط؟',
      h: 'تصميم • بناء • أنظمة • أتمتة • ربط • تطوير',
      a: `YS-SOFTWARE شريك تقني رقمي — وليست وكالة لخدمة واحدة.

نساعد الشركات على تصميم منظومتها الرقمية وبنائها وربطها وأتمتتها وتطويرها باستمرار. علاقة واحدة يمكن أن تغطي الرحلة كاملة:

• التصميم — تجربة المستخدم والواجهات والتجارب الرقمية.
• البناء — المواقع الإلكترونية وتطبيقات الويب والجوال.
• الأنظمة — برمجيات مخصصة تُبنى حول طبيعة عملياتك.
• الأتمتة — الذكاء الاصطناعي وأتمتة سير العمل حيث تحقق قيمة حقيقية.
• الربط — واجهات برمجية وتكاملات تجمع أدواتك في منظومة واحدة.
• التطوير — الدعم والصيانة والتحسين المستمر.

وإلى جانب خدماتنا، نبني منتجات SaaS خاصة بنا — لذا نفكر بعقلية المنتج، لا بمنطق المشروع العابر.`,
    },
    {
      q: 'لماذا العمل مع YS-SOFTWARE كشريك تقني؟',
      h: 'شريك واحد • استمرارية كاملة • ابدأ صغيراً وانمُ مع الوقت',
      a: `لأن احتياجات أي شركة الرقمية نادراً ما تتوقف عند حد واحد.

كثير من الشركات تجد نفسها تدير مزودين منفصلين للتصميم والموقع والتطبيق والأنظمة والأتمتة — أعمال غير مترابطة، وصورة كاملة لا يراها أحد. العمل مع شريك واحد يغيّر ذلك:

• استمرارية — من الهوية والتجربة الرقمية إلى المواقع والتطبيقات والأنظمة والأتمتة.
• فهم أعمق — فريق يعرف أعمالك، لا مزود جديد يتعلمها من الصفر في كل مرة.
• ترابط — أنظمة ومنصات تُصمم منذ البداية لتعمل معاً.
• رؤية أوضح — خارطة طريق تقنية تتطور مع نمو احتياجاتك.

ويمكنك البدء بخطوة صغيرة: شركة ناشئة قد تبدأ بتصميم وموقع، ثم تضيف تطبيق ويب، ثم نظام أعمال مخصص، ثم الأتمتة — الشريك نفسه في كل مرحلة.`,
    },
    {
      q: 'ماذا يمكن أن تبني YS-SOFTWARE لأعمالي؟',
      h: 'مواقع • تطبيقات • أنظمة أعمال • تكاملات',
      a: `من التجارب الموجهة للجمهور إلى الأنظمة التي تدير عملياتك:

• المواقع الإلكترونية — مواقع الشركات والمنتجات وSaaS وصفحات الهبوط والتسويق ومنصات التوثيق.
• تطبيقات الويب — منصات العملاء والأسواق الإلكترونية وأنظمة الحجز ولوحات التحكم والبوابات.
• تطبيقات الجوال — عندما يحتاج مشروعك إلى تجربة جوال متصلة بمنظومتك الرقمية.
• أنظمة أعمال مخصصة — العمليات وإدارة العملاء والمخزون والفواتير وسير العمل والتقارير والفروع المتعددة.
• التكاملات — ربط APIs وخدمات الأطراف الثالثة حيث تحتاجها عملياتك.

ونبدأ دائماً من المشكلة، لا من الطلب. إن قلت "نحتاج إلى تطبيق"، نسأل أولاً: من سيستخدمه؟ ما المشكلة التي يعالجها؟ وبماذا يجب أن يتصل؟ قد تكون الإجابة الصحيحة تطبيق ويب، أو نظام أعمال، أو أتمتة — أو مزيجاً منها. مع دعم كامل للتجارب ثنائية اللغة واتجاه RTL حيث يحتاجها جمهورك.`,
    },
    {
      q: 'هل يمكننا البدء بخدمة واحدة ثم التوسع مع الوقت؟',
      h: 'خدمة واحدة • باقة متكاملة • بناء مخصص • شراكة طويلة الأمد',
      a: `نعم — أنت تختار شكل التعاون، ويمكن أن يتطور مع الوقت:

• خدمة واحدة — مشروع محدد: تصميم واجهات، أو موقع، أو تطبيق، أو مبادرة أتمتة.
• باقة متكاملة — عدة خدمات تُنفَّذ كمشروع واحد: التصميم ثم الموقع ثم التطبيق ثم الأتمتة.
• مشروع تقني مخصص — ندرس متطلباتك ونبني حلاً مصمماً حول طبيعة عملياتك.
• شراكة طويلة الأمد — تطوير مستمر وصيانة وتحسينات وقدرات جديدة مع تغيّر أعمالك.

البرمجيات لا تتجمد بينما تتغير الشركات — العملاء والعمليات والتقنية تتطور باستمرار. لذلك الإطلاق بداية وليس نهاية: الصيانة والإصلاحات وتحسينات الأمان والميزات الجديدة وتطوير الأداء يمكن أن تستمر وفق بنود اتفاقك. لسنا مزوداً يسلّم ويغيب.`,
    },
    {
      q: 'كيف تتعاملون مع الذكاء الاصطناعي والأتمتة؟',
      h: 'ذكاء اصطناعي عملي • أتمتة العمليات • قيمة ملموسة',
      a: `كأدوات أعمال عملية — لا كشعارات تسويقية.

نبدأ بالبحث عن الأماكن التي يهدر فيها فريقك وقته: سير العمل المتكرر، ومعالجة البيانات يدوياً، والتنسيق الداخلي، والتعامل مع العملاء. ثم نطبق الأتمتة والذكاء الاصطناعي حيث يحسّنان النتائج فعلاً.

من أبرز التطبيقات:
• أتمتة سير العمل المتكرر ومعالجة البيانات.
• مساعدون أذكياء لخدمة العملاء أو الفرق الداخلية.
• دمج قدرات الذكاء الاصطناعي في منصاتك وأدواتك القائمة.
• ميزات معززة بالذكاء الاصطناعي داخل تطبيقات الويب وأنظمة الأعمال.

لا نعد بمعجزات ولا بعوائد مضمونة — ولن نبيعك ذكاءً اصطناعياً إذا كان حلٌّ أبسط أكثر فعالية. الهدف ملموس: جهد يدوي أقل، وأخطاء أقل، وعمليات أسرع.`,
    },
    {
      q: 'هل تمتلك YS-SOFTWARE منتجات برمجية خاصة؟',
      h: 'YS-Matrix • YS-Sports • YS-Care',
      a: `نعم. تعمل YS-SOFTWARE على جانبين: الخدمات والحلول، ومنتجات YS.

إلى جانب المشاريع المخصصة، نطوّر منتجات SaaS خاصة بنا — YS-Matrix وYS-Sports وYS-Care — وهي في تطور مستمر: تحسينات متواصلة، وميزات جديدة، وتحديثات أمنية، وإصلاحات، وتطوير للأداء، مع الدعم والتحديثات وفق شروط كل منتج.

وهذا يمنحك مسارين واضحين:

• استخدام أحد منتجاتنا عندما يلبي احتياجاتك.
• بناء حل مخصص معنا عندما تتجاوز متطلباتك ما يقدمه المنتج.

الجانبان يقوّي أحدهما الآخر: التحديات الحقيقية التي تواجهها الشركات توجه خارطة منتجاتنا، وانضباط تشغيل منتجات حية يرفع معيار كل مشروع مخصص نقدمه.`,
    },
  ],
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    locale, path: '/faq',
    title: locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ',
    description: locale === 'ar' ? 'الأسئلة الشائعة حول YS-SOFTWARE: ماذا نبني، وكيف نعمل، وكيف نتعاون معك.' : 'Frequently asked questions about YS-SOFTWARE: what we build, how we work, and how we partner with you.',
  })
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const isAr = locale === 'ar'

  let faqItems: FaqItem[] = []
  try {
    faqItems = await api.faqs(locale)
  } catch (err) { console.error('[public:faq] fetch failed:', err) }

  const items = faqItems.length > 0
    ? faqItems
    : (fallbackFaqs[locale] ?? fallbackFaqs.en).map((f, i) => ({
        id: String(i),
        question: f.q,
        answer: f.a,
        highlight: f.h ?? null,
        category: null,
      }))

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <PageHero
        eyebrow={isAr ? 'الأسئلة الشائعة' : 'FAQ'}
        title={isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        description={isAr
          ? 'ماذا نبني، وكيف نعمل، وكيف نتعاون معك — من خدمة واحدة إلى شراكة تقنية طويلة الأمد.'
          : 'What we build, how we work, and how we partner with you — from a single service to a long-term technology partnership.'}
        maxWidth="48rem"
      />
      <FaqAccordion items={items} locale={locale} />
    </div>
  )
}