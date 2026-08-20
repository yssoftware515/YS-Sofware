<?php

namespace App\Domains\Auth\DTOs;

use App\Http\Requests\Auth\LoginRequest;

readonly class LoginDTO
{
    public function __construct(
        public string $email,
        public string $password,
        public bool $remember,
        public string $ipAddress,
        public string $userAgent,
        public string $turnstileToken,
    ) {}

    public static function fromRequest(LoginRequest $request): self
    {
        return new self(
            email: $request->validated('email'),
            password: $request->validated('password'),
            remember: (bool) $request->validated('remember', false),
            ipAddress: $request->ip() ?? '',
            userAgent: $request->userAgent() ?? '',
            turnstileToken: (string) $request->validated('turnstile_token', ''),
        );
    }
}
