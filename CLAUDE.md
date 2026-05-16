# TSF Website — Claude Notes

## Project Overview

Static HTML/CSS/JS site for The Stoic Fellowship. No build step — edit files directly and they deploy as-is. Published from the repo root via Netlify.

## Deployment

- Hosted on **Netlify**, published from repo root (see `netlify.toml`)
- Routing is controlled by **`_redirects`** — check there first if a URL isn't resolving
- Netlify Functions live in `netlify/functions/` and are bundled with esbuild

## Forms & Backend

Forms are handled by Netlify serverless functions (`netlify/functions/`). They submit data to **Notion** databases via the Notion API. Env vars required:
- `NOTION_API_KEY`
- Per-form database IDs (e.g. `NOTION_CONTACT_DB_ID`)

The map uses **Mapbox** — the token is served via `netlify/functions/get-mapbox-token.js` rather than hardcoded in the frontend.

## Key Files

- `assets/js/headerFooter.js` / `headerFooterChild.js` — injects the shared nav and footer into every page
- `assets/json/team.json` — team member data loaded dynamically
- `assets/json/volunteer-opportunities.json` — volunteer role data
- `assets/locations.geojson` — Stoa location data for the map

## Spanish Pages

Spanish-language versions of key pages live in `/es/`. If updating English content that has a Spanish counterpart, check `/es/` too.

---

## Temporarily Hidden: Volunteer Pages

The volunteer section has been hidden (not deleted) as of 2026-05-16. All code is intact and can be restored by reverting three small changes:

1. **`_redirects`** — remove the three redirect lines at the top of the file:
   ```
   /volunteer  /  302
   /volunteer/apply  /  302
   /volunteer/role  /  302
   ```

2. **`assets/js/headerFooter.js`** and **`assets/js/headerFooterChild.js`** — uncomment the "Volunteer" nav item in each file.

3. **`team.html`** — uncomment the two "Join the Team" button blocks (lines ~58 and ~74).

4. **`service/index.html`** — uncomment the "Sign up to volunteer with us" section (around line 249).

The volunteer pages themselves (`volunteer.html`, `volunteer/apply.html`, `volunteer/role.html`) and all supporting files (`assets/js/load-volunteers.js`, `netlify/functions/submit-volunteer.js`, etc.) were not modified.
