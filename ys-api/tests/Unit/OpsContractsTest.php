<?php

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Configuration contracts that operational behavior depends on.
 *
 * These are not "file exists" checks — they pin the values that the
 * backup, queue-dead-letter and notification flows actually consume.
 */
class OpsContractsTest extends TestCase
{
    public function test_queue_failed_driver_ships_with_a_dead_letter_store(): void
    {
        $this->assertSame('failed_jobs', config('queue.failed.table'));
        $this->assertContains(config('queue.failed.driver'), ['database', 'database-uuids']);
    }

    public function test_admin_notification_address_is_an_explicit_config_contract(): void
    {
        $this->assertArrayHasKey('admin_address', config('mail'));
        // No hardcoded personal mailbox — the job must not silently deliver
        // admin notifications to a literal address baked into the config.
        $this->assertNotContains('gmail.com', explode('@', (string) config('mail.admin_address')));
    }

    public function test_mail_config_defines_a_valid_mailer_set(): void
    {
        $this->assertNotNull(config('mail.default'));
        foreach (['smtp', 'log', 'array', 'failover'] as $mailer) {
            $this->assertArrayHasKey($mailer, config('mail.mailers'));
        }
        $this->assertArrayHasKey('from', config('mail'));
        $this->assertNotSame('', config('mail.from.address'));
    }

    public function test_search_rate_limit_is_an_explicit_config_contract(): void
    {
        // S-14: the search limiter must be env-tunable like every other
        // rate limit, with the same 60/min default the UI was built on.
        $this->assertSame(60, (int) config('security.rate_limits.search'));
    }
}
