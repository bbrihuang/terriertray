# Security and privacy

This describes the controls that are implemented and their limits. It is not a compliance claim.

## Threats and controls

| Threat | Control in this repo | Residual risk |
| --- | --- | --- |
| **API key leakage** | `SODEXO_API_KEY` is read only by `scripts/collect-fenway.ts` from the environment (Actions secret). It is sent only as a header to a fixed host; the date parameter is validated and bounded. The key is never logged or written to output. `.env*` is git-ignored, and `.env.example` is empty. Vite only exposes `VITE_PUBLIC_*` variables, and none exist. `npm run check:secrets` fails the build if `dist/` contains the variable name, an `API-Key` header, the Sodexo host, or the key value. Tests confirm the key is absent from the URL and status messages. | A compromised GitHub account or workflow could read secrets. The refresh job runs only on the main repository, never on fork PRs. |
| **Malicious menu text (XSS)** | All scraped strings render as React text. There is no `dangerouslySetInnerHTML`, and `src/security.test.tsx` renders hostile markup and asserts it stays inert. The CSP is `script-src 'self'` with no inline scripts and `frame-ancestors 'none'`. Public JSON is validated with Zod before use. | CSP reduces script injection impact but does not prevent every compromise (for example, a malicious dependency). |
| **Profile leakage** | Allergens and targets live in React state. Planning is local and makes no network requests; the only fetches are same-origin `GET /menus/*.json`, checked in the browser's network log. There are no analytics, accounts, third-party scripts or fonts (the font is self-hosted). Profile data never goes into URLs; the URL holds only hall, date, meal and view. | Browser extensions on the user's device can read page state. |
| **Shared-device persistence** | Saving is opt-in ("Remember my settings on this device"), with a note that storage is unencrypted. Saved data is validated with Zod on load; corrupt or tampered data is discarded. "Delete my saved settings" removes the single app-owned key after confirmation. | Anyone using the same browser profile can read saved settings while they exist. |
| **Stale or incorrect labels** | The page shows the actual fetch time, or says it was not recorded. A failed hall shows a stale warning; past dates are flagged; restriction removal needs confirmation. Unknown allergens are never treated as "none": strict mode excludes them, and ingredient keywords can only add conflicts. The UI says "Contains a selected allergen", "No selected allergens reported" or "Allergen information unavailable", and points users to dining staff. | BU's labels can be wrong or out of date, and cross-contact is not captured. TerrierTray cannot make food safe. |
| **Scraper abuse / source integrity** | Upstream scraper (unchanged): three fixed BU URLs, a robots.txt check, at least 2 s between pages, timeouts, rejection of off-site redirects and empty pages, and all-or-nothing publication. It runs once a day from Actions, never per visitor. | No retries or `Retry-After` handling, no response-size or content-type check, and no contact in the user agent (dropped with the earlier modified copy). BU's site terms have not been reviewed by a person on the team. |

## Headers (vercel.json)

`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Permissions-Policy` (camera, microphone and geolocation off), `Cross-Origin-Opener-Policy`, and HSTS.
These have not been checked against a live deployment yet; verify with `curl -I` after the first deploy.
