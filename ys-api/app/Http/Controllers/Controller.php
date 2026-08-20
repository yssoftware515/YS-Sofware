<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Read the per_page query parameter with a hard ceiling. Pagination is
     * client-controlled; without the cap a single authenticated (or public)
     * request could force a full-table materialization. 100 is far above
     * anything the UI uses (10–50) and keeps responses bounded.
     */
    protected function perPage(Request $request, int $default = 15): int
    {
        return min(max($request->integer('per_page', $default), 1), 100);
    }
}
