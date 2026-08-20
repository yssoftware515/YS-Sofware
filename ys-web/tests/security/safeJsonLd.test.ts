import { describe, expect, it } from 'vitest'
import { safeJsonLd, breadcrumbJsonLd } from '@/lib/seo'

describe('safeJsonLd', () => {
  it('escapes every "<" so a </script> sequence cannot break out of the script element', () => {
    const payload = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How to win?</script><script>alert("pwned")</script>',
        },
      ],
    }

    const html = safeJsonLd(payload)

    expect(html).not.toContain('</script>')
    expect(html).not.toContain('<script')
    expect(html).toContain('\\u003c')
    expect(html).not.toContain('</')
  })

  it('escapes uppercase/mixed-case closing tags as well (HTML parsing is case-insensitive)', () => {
    const html = safeJsonLd({ name: '</ScRiPt><SCRIPT>evil()</SCRIPT>' })
    expect(html).not.toMatch(/<\/?script/i)
  })

  it('produces output that parses back to the original object (pure JSON escapes)', () => {
    const original = {
      name: 'A</script><script>evil</script>',
      list: ['<b>', '</b>', 1, true, null],
    }

    const parsed = JSON.parse(safeJsonLd(original))

    expect(parsed).toEqual(original)
  })

  it('escapes U+2028 / U+2029 line separators (invalid in JS strings)', () => {
    const html = safeJsonLd({ text: 'line\u2028separator\u2029here' })
    expect(html).toContain('\\u2028')
    expect(html).toContain('\\u2029')
    expect(JSON.parse(html).text).toBe('line\u2028separator\u2029here')
  })

  it('leaves normal JSON-LD output untouched in shape (valid JSON, safe strings)', () => {
    const html = safeJsonLd({ '@type': 'Organization', name: 'YS Systems & Software' })
    expect(JSON.parse(html)).toEqual({ '@type': 'Organization', name: 'YS Systems & Software' })
  })
})

describe('breadcrumbJsonLd (hostile URL path segment cannot break out)', () => {
  it('escapes a pathname-derived breadcrumb name containing a script tag', () => {
    const html = breadcrumbJsonLd('en', [
      { name: '</script><script>alert(1)</script>', item: '/pwned' },
    ])

    expect(html).not.toContain('</script>')
    expect(JSON.parse(html).itemListElement[0].name).toBe('</script><script>alert(1)</script>')
  })
})