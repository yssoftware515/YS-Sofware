<?php

namespace App\Exceptions\Auth;

use RuntimeException;

/**
 * Thrown when a password-reset token is unknown, already used, or
 * expired. The controller renders a single generic 403 body for all
 * three cases — a leaked distinction would let an attacker probe
 * token validity.
 */
class InvalidResetTokenException extends RuntimeException
{
    public function __construct(string $message = 'Invalid or expired reset token.')
    {
        parent::__construct($message, 403);
    }
}
