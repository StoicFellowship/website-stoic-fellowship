# TSF Website — Claude Notes

## Project Overview

Static HTML/CSS/JS site for The Stoic Fellowship. No build step — edit files directly and they deploy as-is. Published from the repo root via Netlify.

## Deployment

- Hosted on **Netlify**, published from repo root (see `netlify.toml`)
- Routing is controlled by **`_redirects`** — check there first if a URL isn't resolving
- Netlify Functions live in `netlify/functions/` and are bundled with esbuild
- Response headers are set in **`_headers`** (currently only the framing policy for `/embed/*`)

### Embeddable map

`embed/map.html` is a standalone, chrome-free version of the Stoa map for `<iframe>` embedding in third-party pages (currently the Mighty Networks community at `social.stoicfellowship.com`). Because it's served from our own origin, `assets/js/map.js` keeps calling `/.netlify/functions/*` same-origin — no CORS config and no credentials leave the site.

- It reuses `assets/js/map.js` unchanged; the Mapbox popup/marker CSS is duplicated inline so the embed doesn't pull in all of `main.css`. **If you change the "Mapbox Styling" section of `assets/css/main.css`, mirror it there.**
- Framing is restricted by `frame-ancestors` in `_headers`. To allow a new host, add its origin there. Don't add `X-Frame-Options` — its `ALLOW-FROM` directive is dead and some browsers treat it as `DENY`.
- Height is controlled by the embedding page's `<iframe>`, not by us — the page fills 100% of whatever frame it's given. **Mighty Networks strips the `style` height**, so the working snippet uses the `height` attribute:
  ```html
  <iframe src="https://www.stoicfellowship.com/embed/map"
          width="100%" height="420" style="border:0; display:block;"
          loading="lazy" title="Map of Stoic communities"></iframe>
  ```
- Initial framing comes from `DEFAULT_VIEW` in `assets/js/map.js`, overridable by `window.TSF_MAP_VIEW` (the embed sets a wider view for its short frame) and then by `?zoom=` / `?center=lng,lat` on the URL. The query params let the embed be re-framed from the iframe `src` without a deploy.

## Forms & Backend

Forms are handled by Netlify serverless functions (`netlify/functions/`). They submit data to **Notion** databases via the Notion API. Env vars required:
- `NOTION_API_KEY`
- Per-form database IDs (e.g. `NOTION_CONTACT_DB_ID`)

The map uses **Mapbox** — the token is served via `netlify/functions/get-mapbox-token.js` rather than hardcoded in the frontend.

### Notion write notes

- All `submit-*` functions write to Notion as the **primary (and only) store**. The Supabase mirror was removed (2026-07-26); Supabase env-var cleanup in Netlify and the historical data export are being handled separately by the maintainer.
- Notion queries go through `fetchWithRetry` (`netlify/functions/utils/notion-fetch.js`), which retries 429/529 with `Retry-After` backoff.
- **Notion's `url` property accepts arbitrary text** — it does NOT reject malformed URIs (bare domains, free text). Confirmed against live data. So don't assume a bad URL value is what's failing a submission.

### Open issue: volunteer form submission failures

Some volunteer applications were reported failing / not appearing in Notion (all roles post through the same `apply.html` → `submit-volunteer.js`, so this is value-dependent, not role-specific). Root cause is **not yet identified** — an early URL-validation theory was ruled out (see note above). Investigation deferred until the volunteer pages are unhidden. Fastest diagnostic: the `Notion error: …` line in the Netlify function logs for a failed `submit-volunteer` invocation gives Notion's exact validation message.

## Key Files

- `assets/js/headerFooter.js` / `headerFooterChild.js` — injects the shared nav and footer into every page
- `assets/json/team.json` — team member data loaded dynamically
- `assets/json/volunteer-opportunities.json` — volunteer role data
- `assets/locations.geojson` — Stoa location data for the map

## Spanish Pages

Spanish-language versions of key pages live in `/es/`. If updating English content that has a Spanish counterpart, check `/es/` too.

---

## Temporarily Hidden: Volunteer Pages

The volunteer section has been hidden (not deleted) as of 2026-05-16. All code is intact and can be restored by reverting these changes:

1. **`_redirects`** — remove the three redirect lines at the top of the file:
   ```
   /volunteer  /  302
   /volunteer/apply  /  302
   /volunteer/role  /  302
   ```

2. **`assets/js/headerFooter.js`** and **`assets/js/headerFooterChild.js`** — uncomment the "Volunteer" nav item in each file.

3. **`team.html`** — uncomment the "Have skills you want to contribute?" paragraph block (around line 62) and the two "Join the Team" button blocks (lines ~58 and ~74).

4. **`service/index.html`** — uncomment the "Sign up to volunteer with us" section (around line 249).

5. **`netlify.toml`** — remove the `command = "rm -f volunteer.html volunteer/apply.html volunteer/role.html"` line from the `[build]` section. This command strips the volunteer pages from the deploy artifact so they aren't reachable directly (the `_redirects` rules only cover the extensionless pretty paths). The files remain in git; they're only deleted from each build's output.

The volunteer pages themselves (`volunteer.html`, `volunteer/apply.html`, `volunteer/role.html`) and all supporting files (`assets/js/load-volunteers.js`, `netlify/functions/submit-volunteer.js`, etc.) were not modified.
