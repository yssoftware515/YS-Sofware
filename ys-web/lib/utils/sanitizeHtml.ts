import DOMPurify from 'isomorphic-dompurify'

/**
 * sanitizeHtml — second line of defense for rich-text HTML coming from the
 * API (product.long_desc, documentation article content).
 *
 * The backend already sanitizes this content on write (see
 * HtmlSanitizerService in the API repo), so in the normal case this is a
 * no-op pass-through. It exists anyway because this frontend has no way to
 * verify that guarantee held for every request — a future API change, a
 * different content source, or a bug on that side would otherwise turn
 * directly into a live XSS on every visitor with no safety net here at
 * all. Two independent layers have to both fail for this to be exploitable
 * instead of just one.
 *
 * Config mirrors the backend's 'cms' Purifier profile (config/purifier.php
 * in ys-api) so legitimate rich-text formatting isn't stripped twice —
 * keep the two allow-lists in sync if either one changes.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'h2', 'h3', 'h4',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
  })
}
