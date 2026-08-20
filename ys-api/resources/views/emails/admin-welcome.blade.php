<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to YS Systems Admin</title>
</head>
<body style="font-family: sans-serif; background: #f4f4f5; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e4e4e7;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: #4f46e5; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 20px;">YS</div>

        <h2 style="margin-top: 0; color: #09090b;">Welcome to YS Systems Admin</h2>
        <p style="color: #3f3f46; font-size: 14px; line-height: 1.6;">
            Hi {{ $user->name }}, an admin account has been created for you.
            Use the one-time sign-in token below on your first login.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f4f4f5; border-radius: 8px; padding: 16px;">
            <tr>
                <td style="padding: 12px 16px; color: #71717a; font-size: 13px;">Email</td>
                <td style="padding: 12px 16px; color: #09090b; font-size: 14px;">{{ $user->email }}</td>
            </tr>
            <tr>
                <td style="padding: 12px 16px; color: #71717a; font-size: 13px;">One-Time Sign-In Token</td>
                <td style="padding: 12px 16px; color: #09090b; font-size: 14px; font-family: monospace;">{{ $token }}</td>
            </tr>
        </table>

        <a href="{{ $loginUrl }}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
            Sign In
        </a>

        <p style="margin-top: 24px; font-size: 12px; color: #a1a1aa;">
            The token expires on {{ $expiresAt->format('M j, Y') }} and works once.
            After signing in, use the credentials your administrator provided to
            you — and change your password immediately after your first login.
        </p>
    </div>
</body>
</html>
