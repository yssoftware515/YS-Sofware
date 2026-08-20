<?php

namespace App\Domains\Auth\Actions;

use App\Domains\Auth\Models\PasswordResetToken;
use App\Domains\Auth\Models\User;
use App\Domains\System\Services\AuditService;
use App\Exceptions\Auth\InvalidResetTokenException;

class ResetPasswordAction
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    /**
     * @throws InvalidResetTokenException
     */
    public function execute(string $email, string $token, string $password): void
    {
        $record = PasswordResetToken::where('email', $email)
            ->where('token_hash', hash('sha256', $token))
            ->first();

        // Unknown, already-used (deleted) or expired tokens all throw the
        // SAME exception → one generic 403 body (VULN-13).
        if ($record === null || $record->created_at->lt(now()->subHour())) {
            throw new InvalidResetTokenException;
        }

        $user = User::where('email', $email)->first();

        if ($user === null) {
            throw new InvalidResetTokenException;
        }

        $user->update([
            'password' => $password,
            'password_changed_at' => now(),
        ]);

        // Single-use: the token dies with the successful reset.
        $record->delete();

        // A compromised session must not survive a reset.
        $user->tokens()->delete();

        $this->auditService->log(
            action: 'auth.password_reset',
            resourceType: 'User',
            resourceId: $user->id,
            userId: $user->id,
        );
    }
}
