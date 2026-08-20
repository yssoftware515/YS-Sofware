<?php

namespace App\Domains\Auth\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * VULN-13: stores only the SHA-256 hash of password-reset tokens
 * (never the plaintext), keyed by the normalized email. Tokens are
 * single-use (deleted after a successful reset) and die 1 hour after
 * created_at.
 */
class PasswordResetToken extends Model
{
    use HasFactory;

    public const UPDATED_AT = null; // Only created_at — the expiry anchor

    protected $fillable = [
        'email',
        'token_hash',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
