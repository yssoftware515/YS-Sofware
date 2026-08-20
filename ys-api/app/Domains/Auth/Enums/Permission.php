<?php

namespace App\Domains\Auth\Enums;

/**
 * Permission — the canonical, closed list of every permission string the
 * system recognizes.
 *
 * Gathered directly from every `authorize()` / `hasPermission()` call
 * across the codebase (not written from memory), so this list is
 * guaranteed to match what's actually enforced — not an aspirational
 * document that drifts out of sync with the real checks.
 *
 * '*' (super admin / all permissions) is deliberately NOT a case here —
 * it's a distinct concept (bypasses every check, see
 * User::isSuperAdmin()), not "one more permission to pick from a list."
 *
 * Used by RoleRequest to validate that a role's `permissions` array only
 * ever contains real, enforced strings — the same closed-list philosophy
 * as ProductIcon: an admin can't create a role with a typo'd permission
 * that silently does nothing.
 */
enum Permission: string
{
    // Content
    case ManageProducts = 'manage_products';
    case ManageCareers = 'manage_careers';
    case ManageDocumentation = 'manage_documentation';
    case ManageFaqs = 'manage_faqs';
    case ManageHomepage = 'manage_homepage';
    case ManageMenus = 'manage_menus';
    case ManageRoadmap = 'manage_roadmap';
    case ManageStaticPages = 'manage_static_pages';
    case ManageUpdates = 'manage_updates';
    case ManageMedia = 'manage_media';
    case ManageTimeline = 'manage_timeline';
    case ManageFeatureFlags = 'manage_feature_flags';

    // Company operations
    case ManageContactRequests = 'manage_contact_requests';
    case ManageSettings = 'manage_settings';
    case ViewAuditLogs = 'view_audit_logs';

    // Business operations (Sprint 6)
    case ViewCustomers = 'view_customers';
    case ManageCustomers = 'manage_customers';
    case ViewProjects = 'view_projects';
    case ManageProjects = 'manage_projects';

    // People & access
    case ManageUsers = 'manage_users';
    case ManageAdmins = 'manage_admins';      // new — grant/revoke other admins, see docblock below

    // Business — new in this phase
    case ManageSubscriptions = 'manage_subscriptions';
    case ViewFinancials = 'view_financials';

    // Services (Sprint 2 — Company Platform Evolution)
    case ViewServices = 'view_services';
    case ManageServices = 'manage_services';

    /**
     * @return string[] plain values, for Rule::in(Permission::values())
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
