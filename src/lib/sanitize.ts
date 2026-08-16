/**
 * sanitize.ts
 *
 * Finding #10 fix: Sanitizes AI-generated HTML before rendering with
 * dangerouslySetInnerHTML to prevent XSS via prompt injection.
 *
 * DOMPurify requires a browser DOM — this helper guards against SSR.
 * Only <span> tags with a class attribute are allowed (what Gemini produces
 * for corrected transcript HTML). Everything else is stripped.
 */

const ALLOWED_TAGS = ['span'];
const ALLOWED_ATTR = ['class'];

export function sanitizeTranscriptHtml(html: string | undefined | null): string {
  if (!html) return '';

  // DOMPurify only runs in browser — return empty during SSR (component shows
  // a loading state anyway, so this is never rendered visibly on the server)
  if (typeof window === 'undefined') return '';

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const createDOMPurify = require('dompurify');
  const DOMPurify = createDOMPurify(window);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
