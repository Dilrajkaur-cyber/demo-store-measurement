# Google Tag Manager and GA4 setup (about 30 to 45 minutes)

This is the manual part of the project. Do it yourself in free GTM and GA4 accounts, and tick each box as you go.

## 1. Accounts

- [ ] Create a free GA4 property and a **Web data stream** (any URL; `http://localhost:8080` is fine for learning). Copy the **Measurement ID** (`G-XXXXXXXXXX`).
- [ ] Create a free GTM account and a **Web container**. Copy the container ID (`GTM-XXXXXXX`).
- [ ] Put the container ID in `src/config.js` (`GTM_ID`).

## 2. Variables (Data Layer Variables, version 2)

| Name | Data Layer Variable Name |
|---|---|
| DLV - ecommerce | `ecommerce` |
| DLV - user_data.sha256_email_address | `user_data.sha256_email_address` |

For GA4 e-commerce you can let the GA4 event tag read the `ecommerce` object directly (tick **Send Ecommerce data**, source **Data Layer**).

## 3. Triggers (Custom Event)

| Name | Event name |
|---|---|
| CE - view_item_list | `view_item_list` |
| CE - view_item | `view_item` |
| CE - add_to_cart | `add_to_cart` |
| CE - begin_checkout | `begin_checkout` |
| CE - purchase | `purchase` |

## 4. Tags

- [ ] **GA4 Configuration (Google tag)**: your Measurement ID, trigger **Initialization - All Pages**.
- [ ] **GA4 Event** tags, one per trigger above, event names matching exactly (`view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`), with **Send Ecommerce data** ticked.

## 5. Consent settings

- [ ] In the container, enable **Consent Overview** (Admin > Container Settings > Enable consent overview).
- [ ] On the GA4 tags, check the built-in consent requirement is `analytics_storage` (GA4 tags handle this by default with Consent Mode).
- [ ] Confirm in Preview that the **Consent Initialization** (default, denied) happens before any tag fires.

## 6. Verify

- [ ] Click **Preview** in GTM, enter `http://localhost:8080`, and open the store.
- [ ] Walk through: list, product, add to cart, checkout, purchase.
- [ ] In the Tag Assistant summary, check each event fired the right tag once.
- [ ] In GA4 go to **Admin > DebugView** and confirm events arrive with items, value and currency.
- [ ] Repeat with the banner set to **Reject all** and to **Accept all** and note what changes.

## 7. Enhanced Conversions (concept practice)

The store pushes a hashed email as `user_data.sha256_email_address` on the `purchase` event, only when the visitor granted `ad_user_data`. If you create a Google Ads account (free, no spend needed), you can read how Enhanced Conversions setup and diagnostics work. Check Google's current documentation for exact field names and formatting rules, because they can change.

## Tips

- GTM Preview needs the page to be reachable by the browser, so `localhost` works.
- If nothing shows in DebugView, check an ad blocker is not blocking `googletagmanager.com`.
- Take screenshots of Preview mode as you go. They are good evidence for your write-up.
