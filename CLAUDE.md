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
- **Bump the `?v=` on the `map.js` script tag in `embed/map.html` whenever you change `map.js`.** HTML is served `max-age=0` but JS is served `max-age=14400` (4h), so otherwise the fresh page runs a stale script — which looks exactly like "the deploy didn't work."

## Forms & Backend

Forms are handled by Netlify serverless functions (`netlify/functions/`). They submit data to **Notion** databases via the Notion API. Env vars required:
- `NOTION_API_KEY`
- Per-form database IDs (e.g. `NOTION_CONTACT_DB_ID`)

The map uses **Mapbox** — the token is served via `netlify/functions/get-mapbox-token.js` rather than hardcoded in the frontend.

### Notion write notes

- All `submit-*` functions write to Notion as the **primary (and only) store**. The Supabase mirror was removed (2026-07-26); Supabase env-var cleanup in Netlify and the historical data export are being handled separately by the maintainer.
- Notion queries go through `fetchWithRetry` (`netlify/functions/utils/notion-fetch.js`), which retries 429/529 with `Retry-After` backoff.
- **Notion's `url` property accepts arbitrary text** — it does NOT reject malformed URIs (bare domains, free text). Confirmed against live data. So don't assume a bad URL value is what's failing a submission.

### Stoa registration form (`/register`)

- Page is `register.html` (renamed from `membership.html` 2026-09-28; `_redirects` 301s `/membership` → `/register`). Front end: `assets/js/stoa-handler.js` → `netlify/functions/submit-stoa.js` → Notion stoa DB (`NOTION_STOA_DB_ID`).
- Visitors choose **Map Listing Only** or **Member Stoa**. Member stoas must open the Terms popup (content fetched live from `/terms-and-conditions`) and tick agreement before Submit enables; the function also rejects a Member Stoa submission without `terms_accepted: true`.
- Notion properties written for this: `Registration Type` (select), `Terms Accepted` (checkbox), `Terms Accepted At` (date). **Every property the function writes must exist in the Notion DB, or Notion rejects the whole submission** — add columns in Notion before deploying code that writes new ones.
- `Registration Type` does not set `Status`; the board still sets `Status` (Member Stoa / Active Stoa) by hand, and that's what the map reads.
- `stoa-handler.js` is loaded with a `?v=` query — bump it when changing the script (JS is cached 4h).

### Open issue: volunteer form submission failures

Some volunteer applications were reported failing / not appearing in Notion (all roles post through the same `apply.html` → `submit-volunteer.js`, so this is value-dependent, not role-specific). Root cause is **not yet identified** — an early URL-validation theory was ruled out (see note above). Investigation deferred until the volunteer pages are unhidden. Fastest diagnostic: the `Notion error: …` line in the Netlify function logs for a failed `submit-volunteer` invocation gives Notion's exact validation message.

## File & Folder Structure (reorganized 2026-11-20)

**`/assets/` is website machinery only** — CSS, JS, fonts, JSON, Sass, `locations.geojson`, volunteer `roles/`. Nothing a visitor downloads goes here.

**`/images/`** — images displayed on pages, by subject (board, authors, icons, logo, stoas, badges…).

**`/resources/`** — everything a visitor reads or takes away:

```
resources/
├── study.html  practice.html  facilitators.html  organizations.html   (Resources menu pages)
├── stoicism-101.html  stoicism-101.mp3                              (newcomer summary + audio)
├── 24-stoic-spiritual-exercises.pdf
└── kit/                                  ← Stoa Facilitator Kit
    ├── handouts/    stoicism-101.pdf, co-facilitator-role-card.pdf  (things a facilitator prints and gives someone)
    ├── templates/   flyer-template-letter.pptx, flyer-template-A4.pptx
    └── guides/
        ├── <slug>/                       one folder per standalone guide
        └── on-stoic-living/NN-<slug>/    the OSL series, NN = 01–12
```

**Guide file naming** — every file repeats the guide's folder name (downloads lose their folder), plus a fixed suffix:

| Suffix | Document |
|---|---|
| `-guide.pdf` | facilitator meeting guide (the current one-page PDFs live here until replaced; OSL guides are a folded booklet: print double-sided, flip on the short edge) |
| `-guide.docx` | editable Word version of the meeting guide (OSL guides) |
| `-xguide.html` | prep / expanded guide, as a web page (OSL); `-xguide.pdf` is its print copy |
| `-primer.html` | member read-ahead, as a web page with a Copy text button (OSL); `-primer.pdf` is its print copy |
| `-card.pdf` | table card (QR code → primer) |

e.g. `guides/anger/anger-primer.pdf`, `guides/on-stoic-living/01-when-your-mind-jumps-to-conclusions/01-when-your-mind-jumps-to-conclusions-guide.pdf`.

Rules:
- Only true series get a subfolder and number prefixes (OSL). Standalone guides keep plain names; plan order (First Year, Topics) lives on the page, not in file names.
- No month names in file names. No bundle PDFs for now; each OSL guide folder has one `-all.zip` of its print files (guide PDF + Word, xguide, primer, card) plus a README. Rebuild the zip whenever one of those files changes.
- Lowercase, hyphens, no spaces in new file names.
- **Primer URLs are permanent** — table-card QR codes point at them (through the short links below). Never rename a published file without a 301 in `_redirects`.
- **Table-card QR codes use short links**, e.g. `/primer/osl-01`, defined in `_redirects` as 301s to the primer page (OSL: `/primer/osl-NN` → `-primer.html`). These are printed and permanent too: never change or remove one.

**`/archive/`** — retired pages and files; `noindex` via `_headers`, disallowed in `robots.txt`. Retired URLs 301 to the closest live page.

**Not published:** `CLAUDE.md`, `README.md`, `future.md` are stripped by the Netlify build command (see `netlify.toml`).

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

## Links to ancient readings

Mike verified the reading links in the *On Stoic Living* weekly lessons (`../Stoic Living 2027/Week *.md`). For any link to an ancient passage on the site, in a web card, or in a meeting guide:

1. **If an On Stoic Living lesson already links that passage, copy its URL exactly** (fragments and text highlights included). Don't rebuild or shorten it.
2. **Otherwise follow the lessons' link rules** (`Stoic Living 2027/Admin/Curriculum Design Notes.md`): The Stoic Library for Seneca's *Letters* and Musonius; otherwise StoicSource with a section link (e.g. `stoicsource.com/epictetus/enchiridion/5/`). Not classics.mit.edu or Wikisource for meeting readings. Tell Mike which links are new and unverified.
3. Name the work and section, not the translator.
