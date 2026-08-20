<?php

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Models\Subscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class CreateSubscriptionAction
{
    public function execute(array $data): Subscription
    {
        $startsAt = Carbon::parse($data['starts_at']);

        // ends_at is derived from billing_cycle unless the caller sent an
        // explicit override (e.g. a negotiated custom end date) — most
        // admin input will just be "started today, monthly plan," and
        // computing the renewal date here means that arithmetic exists in
        // exactly one place, not repeated in every future caller
        // (the dashboard's "expiring soon" view, a renewal reminder job,
        // a future payment-webhook handler, etc.).
        $endsAt = isset($data['ends_at'])
            ? Carbon::parse($data['ends_at'])
            : $this->computeEndsAt($startsAt, $data['billing_cycle']);

        return Subscription::create([
            'customer_id' => $data['customer_id'],
            'product_id' => $data['product_id'],
            'plan_name' => $data['plan_name'],
            'price' => $data['price'],
            'currency' => $data['currency'] ?? 'USD',
            'billing_cycle' => $data['billing_cycle'],
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => $data['status'] ?? 'active',
            'is_manual_entry' => true,
            'created_by' => Auth::id(),
        ]);
    }

    private function computeEndsAt(Carbon $startsAt, string $billingCycle): Carbon
    {
        return match ($billingCycle) {
            'monthly' => $startsAt->copy()->addMonth(),
            'quarterly' => $startsAt->copy()->addMonths(3),
            'biannual' => $startsAt->copy()->addMonths(6),
            'yearly' => $startsAt->copy()->addYear(),
        };
    }
}
