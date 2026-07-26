const fetch = require('node-fetch')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Notion rate limits to ~3 req/s per integration and returns 429 (or 529 when
// overloaded) with a Retry-After header. Honor it with a few bounded retries so
// a transient limit becomes a short delay instead of a failed request.
async function fetchWithRetry(url, options, { retries = 4, maxDelayMs = 8000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, options)
    if (res.status !== 429 && res.status !== 529) return res
    if (attempt >= retries) return res

    const retryAfter = parseFloat(res.headers.get('retry-after'))
    const headerDelay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 0
    const backoff = Math.min(maxDelayMs, 500 * 2 ** attempt)
    await sleep(Math.min(maxDelayMs, Math.max(headerDelay, backoff)))
  }
}

module.exports = { fetchWithRetry }
