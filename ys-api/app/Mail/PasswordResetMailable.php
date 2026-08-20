<?php

namespace App\Mail;

use App\Domains\Auth\Models\User;
use DateTimeInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * VULN-13: the plaintext reset token exists ONLY here and in the
 * database as a SHA-256 hash. Like AdminUserCreatedMailable, this
 * deliberately does NOT implement ShouldQueue — a queued mail would
 * serialize the plaintext token back into a queue payload.
 */
class PasswordResetMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly string $token,
        public readonly DateTimeInterface $expiresAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Your YS Systems Password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset',
            with: [
                'user' => $this->user,
                'token' => $this->token,
                'expiresAt' => $this->expiresAt,
                'resetUrl' => config('app.url').'/auth/reset-password?token='.$this->token.'&email='.urlencode($this->user->email),
            ],
        );
    }
}
