<?php

namespace App\Http\Controllers\Public;

use App\Domains\Operations\Actions\SubmitContactRequestAction;
use App\Domains\Operations\Models\ContactRequest;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;

class ContactController extends Controller
{
    public function __construct(
        private readonly SubmitContactRequestAction $submitContact,
    ) {}

    /**
     * POST /api/v1/public/contact
     * Rate limited: 3 per hour per IP (route) + per-email (here).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:120'],
            'contact_preference' => ['nullable', Rule::in(ContactRequest::CONTACT_PREFERENCES)],
            'phone' => ['nullable', 'required_if:contact_preference,whatsapp', 'string', 'max:30'],
            'budget_range' => ['nullable', Rule::in(ContactRequest::BUDGET_RANGES)],
            'timeline' => ['nullable', Rule::in(ContactRequest::TIMELINES)],
            'subject' => ['nullable', 'string', 'max:200'],
            'message' => ['required', 'string', 'min:20', 'max:5000'],
            // Contextual answers to the small per-type questions shown on
            // the form. Free-form string values only — never nested arrays.
            'details' => ['nullable', 'array', 'max:64'],
            'details.*' => ['string', 'max:500'],
            'type' => ['sometimes', Rule::in(['general', 'sales', 'support', 'partnership'])],
            // "What do you need?" — the customer-side picker; rolled into
            // the same row so admin can filter requests by service interest.
            'request_type' => ['sometimes', Rule::in(ContactRequest::REQUEST_TYPES)],
            // Honeypot — hidden from real users by CSS; automated bots
            // auto-fill it. Present-but-empty (trimmed to null by the
            // TrimStrings middleware) passes; non-empty is a bot.
            'website' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        // Per-email flood protection on top of the per-IP route throttle:
        // stops one address (or an attacker rotating IPs) flooding the
        // inbox. Key is a SHA-256 hash — no PII in the cache store.
        $emailKey = 'contact-email:'.hash('sha256', strtolower(trim($validated['email'])));
        if (RateLimiter::tooManyAttempts($emailKey, (int) config('security.rate_limits.contact_email', 2))) {
            return response()->json([
                'success' => false,
                'message' => 'Too many messages from this email address. Please try again later.',
                'code' => 'RATE_LIMIT_EXCEEDED',
            ], 429);
        }
        RateLimiter::hit($emailKey, 3600);

        $contactRequest = $this->submitContact->execute($validated, $request);

        if ($contactRequest === null) {
            // Honeypot triggered — answer identically to a success so
            // bots cannot learn the trap; nothing is stored or queued.
            return response()->json([
                'success' => true,
                'message' => 'Your message has been received. We will get back to you soon.',
                'data' => ['id' => null],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Your message has been received. We will get back to you soon.',
            'data' => ['id' => $contactRequest->id],
        ]);
    }
}
