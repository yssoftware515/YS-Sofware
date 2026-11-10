import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Only Postgres is declared. The application manages its own
  // authentication (Laravel Sanctum, admin users in the `users` table),
  // so Neon Auth is explicitly disabled. The AI Gateway and Object Storage
  // credentials that exist on the project are not declared here and are
  // therefore not pulled into the local env file.
  auth: false,

  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch (production): no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
