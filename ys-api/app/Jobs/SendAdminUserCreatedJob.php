<?php

namespace App\Jobs;

use App\Domains\Auth\Models\User;
use App\Mail\AdminUserCreatedMailable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Async job: send welcome email to newly created admin user.
 *
 * afterCommit() is enforced at dispatch site in UserController.
 * ShouldBeUnique prevents duplicate welcome emails on retry.
 *
 * VULN-03: the payload carries ONLY the user id — never a password.
 * The one-time sign-in token is generated inside handle(), persisted
 * as a SHA-256 hash, and travels in plaintext exclusively through the
 * welcome email (transient transport — never in jobs/failed_jobs
 * payloads, database rows, or logs). ShouldBeEncrypted keeps even the
 * user id unreadable in a database-backed queue.
 */
class SendAdminUserCreatedJob implements ShouldBeEncrypted, ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public int $backoff = 30;

    public function __construct(
        private readonly string $userId,
    ) {}

    public function uniqueId(): string
    {
        return "admin-welcome-{$this->userId}";
    }

    public function handle(): void
    {
        $user = User::with('role')->find($this->userId);

        if ($user === null) {
            $this->release(5);

            return;
        }

        $token = Str::random(40);
        $expiresAt = now()->addDays(3);

        $user->update([
            'welcome_token_hash' => hash('sha256', $token),
            'welcome_token_expires_at' => $expiresAt,
        ]);

        Mail::to($user->email, $user->name)->send(
            new AdminUserCreatedMailable($user, $token, $expiresAt)
        );
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Admin welcome email failed.', [
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
        ]);
    }
}
