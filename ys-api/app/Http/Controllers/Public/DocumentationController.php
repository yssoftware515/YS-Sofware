<?php

namespace App\Http\Controllers\Public;

use App\Domains\Content\Models\DocumentationArticle;
use App\Domains\Content\Models\DocumentationCategory;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentationController extends Controller
{
    /**
     * GET /api/v1/public/docs?product_id=&version=
     * Returns category tree with published articles.
     */
    public function index(Request $request): JsonResponse
    {
        $productId = $request->query('product_id');

        // Product scoping is applied all the way down the tree. A root
        // category may accidentally hold children of a different product
        // (nothing enforces node-parent product equality), so children —
        // and children's articles — must be product-scoped just like the
        // roots, or the public tree silently leaks other products' docs.
        $scopedChildren = fn ($query) => $query->when($productId, fn ($q) => $q->forProduct($productId));

        $categories = DocumentationCategory::with([
            'children.articles' => fn ($q) => $q->published()->ordered(),
            'children' => $scopedChildren,
            'articles' => fn ($q) => $q->published()->ordered(),
        ])
            ->roots()
            ->when($productId, fn ($q) => $q->forProduct($productId))
            ->ordered()
            ->get();

        return response()->json(['success' => true, 'data' => $categories]);
    }

    /**
     * GET /api/v1/public/docs/{slug}
     */
    public function show(string $slug): JsonResponse
    {
        $article = DocumentationArticle::with('category:id,title_en,title_ar,slug')
            ->published()
            ->where('slug', $slug)
            ->firstOrFail();

        $locale = app()->getLocale();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $article->id,
                'slug' => $article->slug,
                'title' => $locale === 'ar' ? $article->title_ar : $article->title_en,
                'content' => $locale === 'ar' ? $article->content_ar : $article->content_en,
                'version_tag' => $article->version_tag,
                'reading_time' => $article->reading_time_minutes,
                'category' => [
                    'id' => $article->category->id,
                    'title' => $locale === 'ar' ? $article->category->title_ar : $article->category->title_en,
                    'slug' => $article->category->slug,
                ],
            ],
        ]);
    }
}
