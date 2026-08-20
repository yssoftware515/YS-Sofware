<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your YS Systems Password</title>
</head>
<body style="font-family: sans-serif; background: #f4f4f5; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e4e4e7;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: #4f46e5; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 20px;">YS</div>

        <h2 style="margin-top: 0; color: #09090b;">Reset your password</h2>
        <p style="color: #3f3f46; font-size: 14px; line-height: 1.6;">
            Hi {{ $user->name }}, we received a request to reset your
            YS Systems admin password. Use the link below to choose a
            new one.
        </p>

        <a href="{{ $resetUrl }}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; margin: 8px 0;">
            Reset Password
        </a>

        <p style="margin-top: 24px; font-size: 12px; color: #a1a1aa;">
            The link expires on {{ $expiresAt->format('M j, Y \a\t H:i') }} and works once.
            If you did not request a password reset, you can ignore this
            email — your password will not change.
        </p>
    </div>
</body>
</html>