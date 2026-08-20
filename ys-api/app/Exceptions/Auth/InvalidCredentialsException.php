<?php

namespace App\Exceptions\Auth;

use RuntimeException;

class InvalidCredentialsException extends RuntimeException
{
    public function __construct(
        string $message = 'Invalid credentials.',
        int $code = 401,
    ) {
        parent::__construct($message, $code);
    }
}
