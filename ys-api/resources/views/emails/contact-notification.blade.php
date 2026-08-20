<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Contact Request</title>
</head>
<body style="font-family: sans-serif; background: #f4f4f5; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e4e4e7;">
        <h2 style="margin-top: 0; color: #09090b;">New Contact Request</h2>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px; width: 120px;">Name</td>
                <td style="padding: 8px 0; color: #09090b; font-size: 14px;">{{ $contact->name }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Email</td>
                <td style="padding: 8px 0; color: #09090b; font-size: 14px;">{{ $contact->email }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Type</td>
                <td style="padding: 8px 0; color: #09090b; font-size: 14px; text-transform: capitalize;">{{ $contact->type }}</td>
            </tr>
            @if($contact->subject)
            <tr>
                <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Subject</td>
                <td style="padding: 8px 0; color: #09090b; font-size: 14px;">{{ $contact->subject }}</td>
            </tr>
            @endif
        </table>

        <div style="margin-top: 20px; padding: 16px; background: #f4f4f5; border-radius: 8px;">
            <p style="margin: 0; color: #3f3f46; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{{ $contact->message }}</p>
        </div>

        <p style="margin-top: 24px; font-size: 12px; color: #a1a1aa;">
            Received {{ $contact->created_at->format('M j, Y \a\t g:i A') }} · IP: {{ $contact->ip_address }}
        </p>
    </div>
</body>
</html>
