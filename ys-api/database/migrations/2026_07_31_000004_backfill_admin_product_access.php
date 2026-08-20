<?php

use App\Domains\Auth\Models\User;
use App\Domains\Product\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * SAFETY-CRITICAL: this migration exists so that shipping the new
     * product-scoping table does not silently lock any existing admin out
     * of any product they could touch yesterday.
     *
     * Super admins don't need rows here (they bypass scoping via
     * User::isSuperAdmin() regardless of what's in this table), but
     * they're backfilled too anyway — harmless, and means the table
     * accurately reflects "who was in scope for what" at cutover if it's
     * ever audited later.
     *
     * Runs unconditionally on `up()`. If either table is empty (a fresh
     * install with no users/products yet) this is a correct no-op.
     */
    public function up(): void
    {
        $userIds = User::query()->pluck('id');
        $productIds = Product::query()->pluck('id');

        if ($userIds->isEmpty() || $productIds->isEmpty()) {
            return;
        }

        $now = now();
        $rows = [];

        foreach ($userIds as $userId) {
            foreach ($productIds as $productId) {
                $rows[] = [
                    'id' => (string) Str::uuid(),
                    'user_id' => $userId,
                    'product_id' => $productId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // Chunked insert — safe even if this ever runs against a larger
        // user/product count than exists today.
        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('admin_product_access')->insert($chunk);
        }
    }

    /**
     * Intentionally NOT reversible by deleting all rows — by the time
     * anyone runs `migrate:rollback`, an admin may have manually adjusted
     * scoping (removed access for someone, added it for someone else) and
     * blindly wiping the table would destroy real decisions, not just
     * undo this backfill. Rolling back the table itself (previous
     * migration) already handles full teardown when that's genuinely
     * intended.
     */
    public function down(): void
    {
        // No-op by design — see class docblock.
    }
};
