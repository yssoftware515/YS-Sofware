# تقرير المجموعة (H) — التنظيف الشامل النهائي محلياً

**الحالة:** مكتمل — منتظر المراجعة (لا Commit / لا Push per التقييد المعتمد).
**النطاق:** Backend (`ys-api`) + توثيق (`docs/`); العمل محلي فقط، لا نشر، لا ربط استضافة.

---

## 1. ما تم تنفيذه (المعتمد في H)

### أ. هجرات جديدة للأمام فقط (لا مساس بالهجرات التاريخية المنفذة)
| الهجرة | الغرض | `down()` |
|---|---|---|
| `2026_11_10_000001_drop_retired_domain_tables` | إسقاط 14 جدولاً من النطاقات المحذوفة (product/subscription/content/feature flags) بالترتيب الآمن: الأبناء أولاً ثم `products`، و`subscriptions` قبل `products` (FK typu RESTRICT) | تُطلق `RuntimeException` (غير قابلة للعكس بالتصميم) |
| `2026_11_10_000002_drop_product_id_columns` | إسقاط عمودي `customers.product_id` (بعد إسقاط FKه في الهجرة 000001) و`audit_logs.product_id` | تُطلق `RuntimeException` (غير قابلة للعكس بالتصميم) |

ملاحظة تنفيذية: الهجرة 000001 تُهدر قيد `customers_product_id_foreign` قبل إسقاط `products` لأن جدول `customers` محتفظ به ومفتاحه الخارجي كان يحظر إسقاط `products`; إسقاط العمود نفسه أُوكل للهجرة 000002.

### ب. تنظيف الكود من مراجع Product/Subscription/Content/FeatureFlags
- `AuditService`: حُذف حقل `product_id` من `AuditLog::create` والطريقتان `resolveProductIdFromModel`/`resolveProductIdFromResource` ووسيط `?object $model`؛ حُذفت استيرادات `Customer/Project/Task/Milestone/ContactRequest` غير المستخدمة.
- `AuditLog`: حُذف `product_id` من `$fillable`؛ صُحّح docblock و`scopeAccessibleBy` لتصبح لا-op (الرؤية تعتمد على الصلاحية فقط).
- `Customer/Project/Task/Milestone/ContactRequest`: `scopeAccessibleBy` أصبحت لا-op؛ استبدلت عناوين تعليقات "Product scoping" → "Row visibility" عبر سكربت PHP.
- `MilestoneController`: حُذف الدالتان המטيتان `assertProjectAccessible`/`assertMilestoneAccessible` (كانتا تستدعيان `isAccessibleBy` غير الموجودة) + رسالة 403 + استيراد `Project` غير المستخدم.
- `Service.js` docblock: أزيلت مقارنة "products → YS product catalog".
- `DashboardService`: أزيلت ملاحظة "Product counts".
- `HtmlSanitizerService`: أزيلت إشارة "product long_desc/documentation article".
- `MediaUploadService`: "product covers" → "service covers".
- `SafeUrl`: أزيلت إشارة "product external URLs".
- `AuditLogController`: وثيقت 쿼리 rodтה لتصبح قائمة التدقيق بمراجعة الصلاحية فقط.
- مسح `app/` بالكامل: لا `product_id` ولا "Product scoping" ولا "Product-tenant".
- مسح `tests/`: لا مراجع للجداول المحذوفة.

### ج. إزالة اتصال Neon القديم
- `render.yaml`: حُذف (منصة Render غير معتمدة للنشر).
- مسح المشروع (excluding vendor/node_modules/.git): لا残餘 لـ `neon`/`NEON`/`pgbouncer` في إعدادات الاتصال الحية؛ `config/database.py` يحتفظ بإعدادات PostgreSQL العامة (`DATABASE_URL`/`sslmode=prefer`) اللازمة للتشغيل مستقبلاً.
- التوثيق: `docs/deployment.md` sección §10 تسجل Neon كاعتبار مستقبلي غير منفذ (مuntouched — لا استضافة مرتبطة).

### د. إزالة تبعية غير مستخدمة
- `composer.json`: حُذف `predis/predis` (`composer remove predis/predis --no-interaction` EXIT=0).
- `composer dump-autoload`: EXIT=0، 6889 كلاس (كان 7439).
- مسح الكود: لا `Redis::`/`Predis` في `app/config/database/tests`؛ `FeatureFlagService` محذوف مسبقاً (Group F).

### ه.保留 الإعدادات العامة
- `config/database.py`: إعدادات PostgreSQL العامة محفوظة (غير مرتبطة بمزود).
- 모든 وظائف Phase 2 الأساسية محفوظة (services, customers, projects, tasks, milestones, contact-requests, audit-logs, roles, users, settings, search).

---

## 2. الآثار القديمة المكتشفة والمنظفة

| المنطقة | الأثر | الإجراء |
|---|---|---|
| جداول | 14 جدولاً فارغاً (0 صفوف): `products, product_releases, product_media, product_features, product_pricing_plans, admin_product_access, subscriptions, careers, documentation_categories, documentation_articles, roadmap_items, updates, timeline_entries, feature_flags` | أُسقطت بالهجرة 000001 |
| أعمدة | `customers.product_id` + `audit_logs.product_id` (آخر مراسي نطاق المنتج) | أُسقطت بالهجرة 000002 |
| FK معيقة | `customers_product_id_foreign` (`customers → products`) كان يحظر إسقاط `products` | أُهدر في الهجرة 000001 قبل إسقاط `products` |
| كود ميت | `MilestoneController.assert*Accessible` تستدعي `isAccessibleBy` غير موجودة | حُذفت |
| تبعية ميتة | `predis/predis` غير مستخدمة (لا `Redis::` في الكود) | حُذفت من composer |
| توثيق مستنفد | `api.md`, `admin-panel.md`, `authorization.md`, `architecture.md`, `backend.md`, `database.md`, `roles-permissions.md`, `features.md` كانت تصف نطاقات/Product/FeatureFlags محذوفة | أُعيد كتابتها/تحديثها |
| مستودع عتيق | `render.yaml` (حُذف — Render غير معتمدة) | حُذف من الجذر؛ لا بديل مطلوب |

---

## 3. نتائج الاختبارات

### Backend (`ys-api`, `ys_api_test`, `CACHE_STORE=array`, `QUEUE=sync`, `MAIL=array`)
```
php artisan test → 359 passed / 1313 assertions / 44.51s / EXIT=0
php artisan route:list → 68 route (EXIT=0)
Pint على ملفات H → passed
```

### Frontend (`ys-web`)
```
npx tsc --noEmit → EXIT=0
npx vitest run → 47 passed / 8 files / EXIT=0
npx eslint . → 0 errores، 2 تحذير (صورة `` في `admin-shell.tsx` و`admin/login/page.tsx` — قديمان، غير مرتبطين بـ H)
```

### Migration من قاعدة فارغة (التحقق الأساسي)
- أُنشئت `ys_api_fresh` → `migrate --force --seed` EXIT=0.
- التحقق: 14 جدولاً محذوفة ✅؛ `customers.product_id` و`audit_logs.product_id` غائبتان ✅؛ جداول Phase 2 موجودة (`users, roles, services, customers, projects, tasks, milestones, contact_requests, audit_logs, media, settings, ...`) ✅؛Seeder: `roles=3, services=11, audit_logs=11` ✅.
- حُذفت `ys_api_fresh` بعد التحقق.
- قاعدة التطوير `ys_api`:طبقتا الهجرتان (`migrate --force` EXIT=0).

---

## 4. التحذيرات والمشكلات المتبقية (دون إخفاء)

1. **الهجرات التاريخية لا تُعدل (بالتصميم):** `2026_08_18_000002_add_product_id_to_audit_logs_table` و`2025_01_01_000011_add_search_vectors` ما زالت تشير إلى الجداول/الأعمدة المحذوفة؛ attempted `rollback` لها بعد تطبيق H سيفشل — تم توثيق هذا التنازل في हجرات H (`down()` تُطلق `RuntimeException`). لا تأثير على `migrate` من قاعدة فارغة.
2. **التوثيق المتبقي din:** `docs/database-relations.md`، `docs/frontend.md`، `docs/deployment.md` (قسم Neon §10)، `docs/configuration.md`، `docs/performance.md`، `docs/audit-service.md`، `docs/search-pipeline.md`، `docs/master-report.md`، `docs/README.md`، `docs/project-structure.md`، `docs/technical-debt.md`، `docs/known-issues.md` ما زالت تحتوي إشارات لنطاقات محذوفة أو بيانات seeder قديمة — تحتاج تحديثاً منفصلاً (لم تقع ضمن نطاق هجرات H الكودية، لكنها مطلوبة لإتمام توثيق H).
3. **ESLint:** تحذيرَي `ภาพ` قديمان في `admin-shell.tsx` و`admin/login/page.tsx` (غير مرتبطين بـ H، 0 أخطاء).
4. **صلاحيات غير مدققة:** حماية تعديل دور `super_admin`自分 وحذف آخر مشرف فائق (`UserController@destroy`) — غير مؤكدة (قائمة من تقارير سابقة، خارج نطاق H).
5. **جدول `job_batches`:** غير موجود في مجموعة هجرات المشروع (ليس من نطاق H وليس خللاً).

---

## 5. 근거 للتوقّف

تم تنفيذ خطة H بالكامل محلياً، ونجحت الهجرات من قاعدة فارغة، واختبارات الباكند والفرونتند نظيفة، ولا 남은 تبعيات/كود غير مستخدم من النطاقات المحذوفة، دون أي نشر أو ربط استضافة أو Commit/Push.

**الخطوة التالية المقترحة (عند الموافقة):** مراجعة التقرير أعلاه، ثم — إن اعتُبر كافياً — يمكن批准 الانتقال إلىroup التالية أو إنهاء المرحلة H. في أي حال، يتم الانتظار للمراجعة قبل أي Commit/Push.
