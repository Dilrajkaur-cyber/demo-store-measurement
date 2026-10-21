# QA checklist

Use before calling any measurement setup "done". Run it once with **Reject all** and once with **Accept all**.

## Consent
- [ ] `consent default` (all four signals denied) appears before the first Google tag fires.
- [ ] After **Accept all**, a `consent update` shows all four signals granted.
- [ ] After **Reject all**, nothing grants storage and no user data is attached to events.
- [ ] A returning visitor's saved choice is restored on load.

## Data layer
- [ ] `view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` all appear in the right order.
- [ ] Each ecommerce push is preceded by `ecommerce: null`.
- [ ] `purchase` appears **once** per order, with `transaction_id`, `value`, `currency` and a non-empty `items` array.
- [ ] Item fields are consistent across events (`item_id`, `item_name`, `price`, `quantity`).

## Tags (GTM Preview)
- [ ] Each event fires its GA4 tag exactly once.
- [ ] No tag fires on events it should not.
- [ ] Tags respect consent (check the consent status in the Preview summary).

## GA4
- [ ] DebugView shows each event with the expected parameters.
- [ ] Values and currency match the order shown on the thank-you page.

## Privacy
- [ ] No plain-text email, name or other personal data in the data layer or in network requests.
- [ ] Hashed email is only attached when `ad_user_data` is granted.

## Offline events (Measurement Protocol)
- [ ] `python3 scripts/measurement_protocol.py --dry-run` prints a valid payload.
- [ ] `--debug` returns no validation messages for a good payload.
- [ ] A deliberately bad payload (for example currency `EURO`) is rejected by the script or the debug endpoint.

## Documentation
- [ ] README status is accurate.
- [ ] Bug lab "Your findings" sections contain only what you actually observed.
- [ ] No secrets committed (`GA4_API_SECRET` is only in environment variables).
