/**
 * Content Security Policy for every rendered page. Scripts: nonce + 'strict-dynamic' (Next adds the nonce to its
 * own scripts when it sees this header on the request). Styles keep 'unsafe-inline' because React renders style
 * attributes (card art positions, field colours) and nonces cannot cover attributes.
 */
export function buildCsp(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

export function newNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
