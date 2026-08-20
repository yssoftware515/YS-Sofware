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
 * VULN-03: the one-time sign-in token exists ONLY here and in the
 * welcome email. This mailable deliberately does NOT implement
 * ShouldQueue — a queued mail would serialize the plaintext token
 * back into a queue payload, reintroducing the vulnerability.
 */
class AdminUserCreatedMailable extends Mailable
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
            subject: 'Your YS Systems Admin Account',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin-welcome',
            with: [
                'user' => $this->user,
                'token' => $this->token,
                'expiresAt' => $this->expiresAt,
                'loginUrl' => config('app.url').'/admin/login',
            ],
        );
    }
}
