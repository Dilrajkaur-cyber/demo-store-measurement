# Design note: server-side tagging (not deployed)

**Status:** design only. This project does not deploy a server-side container. Do not describe it as deployed.

## Problem
Browsers limit the lifetime of cookies set by JavaScript, and ad blockers can block requests to third-party tagging domains. Both can reduce data quality.

## Proposed approach
- A **server-side GTM container** hosted on a cloud service (for example Google Cloud Run) receives events from the web container.
- A **custom subdomain** on the site's own domain (for example `metrics.example.com`, added with DNS records) is used as the endpoint, so requests are first-party.
- The server container can set cookies from the server and forward events to GA4 and other vendors.
- Consent decisions must still be respected: the server only forwards what the visitor allowed.

## Trade-offs to discuss
| Benefit | Cost or risk |
|---|---|
| More control over what is sent to vendors | Hosting cost and operations work |
| Potentially better cookie persistence and data quality | More setup (DNS, certificates, monitoring) |
| Can remove or redact fields before forwarding | Privacy obligations do not disappear: consent still applies |

## How I would validate it (if built)
1. Compare event counts before and after for a fixed period and traffic source.
2. Check server logs for dropped or failed requests.
3. Test consent states (granted, denied) end to end.
4. Review with privacy and legal stakeholders.

## What I would need to learn first
Official server-side tagging documentation, hosting setup, and DNS configuration. Add notes here as you study them.
