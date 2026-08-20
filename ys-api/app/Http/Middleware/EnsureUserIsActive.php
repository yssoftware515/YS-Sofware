<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->isActive()) {
            // Revoke all tokens for disabled accounts
            $user->tokens()->delete();

            return response()->json([
                'success' => false,
                'message' => 'Your account has been disabled.',
                'code' => 'ACCOUNT_DISABLED',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
