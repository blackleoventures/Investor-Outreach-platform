/**
 * Minimal, dependency-free HTML sanitizer for rendering email-body HTML that
 * originates from the rich-text editor or AI generation (semi-trusted input).
 *
 * It strips the most common XSS vectors before the string is handed to
 * `dangerouslySetInnerHTML`:
 *   - <script> / <style> / <iframe> / <object> / <embed> blocks
 *   - inline event handlers (onclick, onerror, ...)
 *   - javascript:/data:text/html URLs in href/src
 *
 * This is intentionally conservative rather than a full HTML parser. For
 * untrusted third-party HTML, prefer a vetted library (e.g. DOMPurify).
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";

  let clean = String(html);

  // Remove dangerous element blocks entirely (including their content).
  clean = clean.replace(
    /<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );
  // Remove self-closing / unclosed variants of the same tags.
  clean = clean.replace(
    /<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi,
    ""
  );

  // Strip inline event-handler attributes: on*="..." / on*='...' / on*=value
  clean = clean.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  clean = clean.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  clean = clean.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Neutralize javascript: and data:text/html in href/src attributes.
  clean = clean.replace(
    /\s(href|src)\s*=\s*"(?:\s*javascript:|\s*data:text\/html)[^"]*"/gi,
    ' $1="#"'
  );
  clean = clean.replace(
    /\s(href|src)\s*=\s*'(?:\s*javascript:|\s*data:text\/html)[^']*'/gi,
    " $1='#'"
  );

  return clean;
}
