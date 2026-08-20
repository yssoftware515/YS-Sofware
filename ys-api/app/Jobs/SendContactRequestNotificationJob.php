<?php

namespace App\Jobs;

use App\Domains\Operations\Models\ContactRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Async job: notify admin of new contact request.
 *
 * Key design decisions:
 * 1. ShouldBeUnique — prevents duplicate emails if job retried (idempotency).
 * 2. afterCommit() is called at dispatch site — job only enters queue AFTER
 *    the DB transaction that created the ContactRequest has committed.
 * 3. Guard clause on handle() — if ContactRequest not found (race condition),
 *    we release back to queue instead of failing permanently.
 */
class SendContactRequestNotificationJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public int $backoff = 60; // seconds between retries

    public function __construct(
        private readonly string $contactRequestId,
    ) {}

    /**
     * Unique key — prevents duplicate emails on retry.
     */
    public function uniqueId(): string
    {
        return "contact-notification-{$this->contactRequestId}";
    }

    public function handle(): void
    {
        // Guard: DB transaction may not have committed yet on first attempt
        $contact = ContactRequest::find($this->contactRequestId);

        if ($contact === null) {
            // Transaction not committed yet — release back to queue
            Log::warning('ContactRequest not found in job, releasing.', [
                'id' => $this->contactRequestId,
            ]);
            $this->release(5); // retry in 5 seconds

            return;
        }

        $adminEmail = config('mail.admin_address');

        if ($adminEmail === null || $adminEmail === '') {
            // MAIL_ADMIN_ADDRESS is required for admin notifications — never
            // fall back to a hardcoded personal mailbox. Log loudly instead.
            Log::warning('MAIL_ADMIN_ADDRESS not configured — admin notification NOT sent.', [
                'contact_id' => $contact->id,
            ]);

            return;
        }

        Mail::send(
            'emails.contact-notification',
            ['contact' => $contact],
            fn ($m) => $m
                ->to($adminEmail)
                ->subject("[{$contact->type}] New contact from {$contact->name}")
        );

        Log::info('Contact notification sent.', ['contact_id' => $contact->id]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Contact notification job failed permanently.', [
            'contact_id' => $this->contactRequestId,
            'error' => $exception->getMessage(),
        ]);
    }
}
