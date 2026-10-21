# Bug lab: break it on purpose, then debug it

Each bug is switched on with a URL parameter, for example `http://localhost:8080/?bug=late-consent`.
For every bug, fill in the **Your findings** boxes yourself. Only record what you actually observed.

---

## Bug 1: `?bug=late-consent`

**What it does:** loads Google Tag Manager first and sets the Consent Mode defaults afterwards.

**Expected symptom:** in GTM Preview, tags can run before consent defaults exist. The `dataLayer` order shows `gtm.js` before `consent default`. In dataLayer-only mode (no GTM ID set) the event log shows a marker event `gtm.js.simulated` standing in for the container start, so you will see it listed before `gtag(consent)` instead of after it.

**How to diagnose:**
1. Open the store with the parameter and GTM Preview connected.
2. Look at the event order in the Preview summary and in the on-page event log.
3. Compare with the normal page (no parameter), where `consent default` comes first.

**Root cause:** the default consent command ran after the container started.

**Fix:** set defaults synchronously in `<head>` before the GTM snippet (this is what `src/boot.js` does by default).

**Prevention:** keep the consent default script first in the page template and add a QA check for event order.

**Your findings:** (what you saw, screenshots, date)
-

---

## Bug 2: `?bug=early-purchase`

**What it does:** fires a `purchase` event with an empty `items` array, then a complete `purchase` event 1.2 seconds later.

**Expected symptom:** two `purchase` events for one order. The first has `items: []`. With a Custom Event trigger on `purchase`, GA4 receives both.

**How to diagnose:**
1. Place an order with the parameter on.
2. In the on-page log and GTM Preview, count `purchase` events and compare `items`.
3. In GA4 DebugView, look for a purchase with no items and a duplicated transaction ID.

**Root cause:** the event was pushed before the order data was ready (a race condition between an asynchronous call and the push).

**Fix:** push the event once, after the data is complete (the default behaviour in `src/store.js`). If you cannot change the site, trigger on a custom event that is pushed only when data is ready, and de-duplicate on `transaction_id`.

**Prevention:** agree an event contract with developers (when the event fires, required fields), and test with Preview before release.

**Your findings:**
-

---

## Bug 3: `?bug=raw-email`

**What it does:** sends the email as plain text in `user_data.email` instead of a normalised SHA-256 hash (only after you accept consent, because user data is only attached with `ad_user_data` granted).

**Expected symptom:** a readable email in the `dataLayer` and in any request built from it.

**How to diagnose:** choose **Accept all**, place an order, and open the `purchase` entry in the event log.

**Root cause:** the hashing step was skipped.

**Fix:** normalise (trim, lowercase) then hash with SHA-256 (default behaviour), or use a tag feature that hashes for you, and follow Google's current rules.

**Prevention:** code review checklist item "no raw personal data in the data layer".

**Your findings:**
-

---

## Bug 4: `?bug=no-normalise`

**What it does:** hashes the email exactly as typed, without trimming or lowercasing.

**Expected symptom:** the same person typing `User@Example.com ` and `user@example.com` produces two different hashes, which hurts matching.

**How to diagnose:** place two orders with differently formatted versions of the same email and compare the hashes. You can cross-check with `python3 scripts/hash_email.py "  User@Example.com "`.

**Fix:** normalise first (default behaviour). Unit tests for this live in `tests/`.

**Your findings:**
-

---

## Summary table (fill in at the end)

| Bug | Symptom I saw | Tool I used | Fix | Time to diagnose |
|---|---|---|---|---|
| late-consent | | | | |
| early-purchase | | | | |
| raw-email | | | | |
| no-normalise | | | | |
