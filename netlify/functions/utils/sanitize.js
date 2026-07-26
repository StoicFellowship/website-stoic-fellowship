// Coerce a user-entered value into something Notion's `url` property will
// accept, or null. Notion rejects a `url` value that isn't a well-formed URI
// (missing scheme, embedded spaces, or plain text) with a validation_error,
// which fails the whole page create. Applicants routinely type bare domains
// ("linkedin.com/in/jane") or free text, so normalize before sending.
function normalizeUrl(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    // Require a dotted hostname so free text like "n/a" collapses to null
    // rather than becoming "https://n/a".
    return url.hostname.includes('.') ? candidate : null
  } catch {
    return null
  }
}

module.exports = { normalizeUrl }
