/*
 * store.js - tiny single-page demo store that pushes GA4 e-commerce events to the dataLayer.
 * Routes (hash based): #/  #/product/<id>  #/cart  #/checkout  #/thanks
 * Events: view_item_list, view_item, add_to_cart, begin_checkout, purchase
 */
(function () {
  "use strict";

  var CURRENCY = (window.STORE_CONFIG && window.STORE_CONFIG.CURRENCY) || "EUR";
  var BUG = window.STORE_BUG || "";
  var dl = window.dataLayer;

  var PRODUCTS = [
    { item_id: "BK-101", item_name: "Cloud Security Handbook", item_category: "Books", price: 29.0 },
    { item_id: "BK-102", item_name: "Measurement Basics Guide", item_category: "Books", price: 19.5 },
    { item_id: "BK-103", item_name: "API Troubleshooting Notebook", item_category: "Stationery", price: 12.0 },
    { item_id: "BK-104", item_name: "Data Layer Poster", item_category: "Posters", price: 9.0 }
  ];

  var CART_KEY = "demo_cart_v1";
  var ORDER_KEY = "demo_last_order_v1";
  var cart = loadJson(CART_KEY, {});
  var viewEl = document.getElementById("view");
  var cartCountEl = document.getElementById("cart-count");

  // ---------- helpers ----------
  function loadJson(key, fallback) {
    try {
      var raw = window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJson(key, value) {
    try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return n.toFixed(2) + " " + CURRENCY; }
  function find(id) { return PRODUCTS.filter(function (p) { return p.item_id === id; })[0]; }
  function toItem(product, qty, index) {
    var item = {
      item_id: product.item_id,
      item_name: product.item_name,
      item_category: product.item_category,
      price: product.price,
      quantity: qty
    };
    if (typeof index === "number") item.index = index;
    return item;
  }
  function cartItems() {
    return Object.keys(cart).map(function (id) { return toItem(find(id), cart[id]); });
  }
  function cartValue() {
    return cartItems().reduce(function (sum, i) { return sum + i.price * i.quantity; }, 0);
  }
  function cartCount() {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id]; }, 0);
  }

  // GA4 recommends clearing the previous ecommerce object before each push.
  function pushEcommerce(eventName, ecommerce, extra) {
    dl.push({ ecommerce: null });
    var payload = { event: eventName, ecommerce: ecommerce };
    if (extra) Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    dl.push(payload);
  }

  // ---------- views ----------
  function renderList() {
    viewEl.innerHTML =
      "<h1>Products</h1><div class='grid'>" +
      PRODUCTS.map(function (p) {
        return "<article class='card'><h2>" + esc(p.item_name) + "</h2><p class='muted'>" + esc(p.item_category) +
          "</p><p class='price'>" + money(p.price) + "</p>" +
          "<a class='btn' href='#/product/" + esc(p.item_id) + "'>View details</a></article>";
      }).join("") + "</div>";
    pushEcommerce("view_item_list", {
      item_list_id: "all_products",
      item_list_name: "All products",
      items: PRODUCTS.map(function (p, i) { return toItem(p, 1, i); })
    });
  }

  function renderProduct(id) {
    var p = find(id);
    if (!p) { location.hash = "#/"; return; }
    viewEl.innerHTML =
      "<a href='#/'>&larr; Back</a><h1>" + esc(p.item_name) + "</h1><p class='muted'>" + esc(p.item_category) +
      "</p><p class='price'>" + money(p.price) + "</p><button class='btn primary' id='add'>Add to cart</button>";
    pushEcommerce("view_item", { currency: CURRENCY, value: p.price, items: [toItem(p, 1)] });
    document.getElementById("add").addEventListener("click", function () {
      cart[p.item_id] = (cart[p.item_id] || 0) + 1;
      saveJson(CART_KEY, cart);
      updateCartCount();
      pushEcommerce("add_to_cart", { currency: CURRENCY, value: p.price, items: [toItem(p, 1)] });
    });
  }

  function renderCart() {
    var items = cartItems();
    if (!items.length) {
      viewEl.innerHTML = "<h1>Your cart</h1><p>Your cart is empty.</p><a class='btn' href='#/'>Browse products</a>";
      return;
    }
    viewEl.innerHTML = "<h1>Your cart</h1><ul class='lines'>" +
      items.map(function (i) {
        return "<li><span>" + esc(i.item_name) + " &times; " + i.quantity + "</span><span>" + money(i.price * i.quantity) + "</span></li>";
      }).join("") + "</ul><p class='total'>Total: " + money(cartValue()) + "</p>" +
      "<a class='btn primary' href='#/checkout'>Checkout</a>";
  }

  function renderCheckout() {
    var items = cartItems();
    if (!items.length) { location.hash = "#/cart"; return; }
    viewEl.innerHTML = "<h1>Checkout</h1><p class='total'>Total: " + money(cartValue()) + "</p>" +
      "<form id='checkout-form' novalidate>" +
      "<label>Name<input id='checkout-name' name='name' autocomplete='name' required></label>" +
      "<label>Email<input id='checkout-email-input' name='email' type='email' autocomplete='email' required></label>" +
      "<p class='muted'>Demo only: no payment is taken and nothing is sent to a server.</p>" +
      "<button class='btn primary' type='submit' id='place-order'>Place order</button></form>";
    pushEcommerce("begin_checkout", { currency: CURRENCY, value: cartValue(), items: items });
    document.getElementById("checkout-form").addEventListener("submit", onSubmit);
  }

  function renderThanks() {
    var order = loadJson(ORDER_KEY, null);
    if (!order) { location.hash = "#/"; return; }
    viewEl.innerHTML = "<h1>Thank you</h1><p>Order <strong>" + esc(order.transaction_id) +
      "</strong> placed (demo). Total " + money(order.value) + ".</p><a class='btn' href='#/'>Back to products</a>";
  }

  // ---------- purchase ----------
  // Simulates the real-world case where order details arrive from an asynchronous API call.
  function fakeOrderApi(items, value) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ transaction_id: "T-" + Date.now(), items: items, value: value });
      }, 400);
    });
  }

  // Privacy rule: user data is only attached when the visitor granted ad_user_data.
  async function buildUserData(email) {
    var consent = window.STORE_CONSENT || {};
    if (consent.ad_user_data !== "granted") return {};
    if (BUG === "raw-email") {
      // BUG ON PURPOSE: plain-text email, not hashed.
      return { user_data: { email: email } };
    }
    var value = BUG === "no-normalise" ? email : window.Hash.normaliseEmail(email);
    // BUG ON PURPOSE (no-normalise): hashing the raw input means "  User@Example.com " and
    // "user@example.com" produce different hashes, which hurts matching.
    var hashed = await window.Hash.sha256Hex(value);
    return { user_data: { sha256_email_address: hashed } };
  }

  async function onSubmit(event) {
    event.preventDefault();
    var email = document.getElementById("checkout-email-input").value;
    var name = document.getElementById("checkout-name").value;
    if (!email || !name) { alert("Please enter a name and an email address."); return; }

    var items = cartItems();
    var value = cartValue();
    var order = await fakeOrderApi(items, value);
    var ecommerce = {
      transaction_id: order.transaction_id,
      value: order.value,
      currency: CURRENCY,
      items: order.items
    };
    var userData = await buildUserData(email);

    if (BUG === "early-purchase") {
      // BUG ON PURPOSE: the purchase event fires before the line items are attached,
      // then a second, complete event follows. A Custom Event trigger on "purchase"
      // sends both, so GA4 records a purchase with items: [] and a duplicate.
      pushEcommerce("purchase", { transaction_id: order.transaction_id, value: order.value, currency: CURRENCY, items: [] });
      setTimeout(function () { pushEcommerce("purchase", ecommerce, userData); }, 1200);
    } else {
      pushEcommerce("purchase", ecommerce, userData);
    }

    saveJson(ORDER_KEY, { transaction_id: order.transaction_id, value: order.value });
    cart = {};
    saveJson(CART_KEY, cart);
    updateCartCount();
    location.hash = "#/thanks";
  }

  // ---------- routing ----------
  function updateCartCount() { cartCountEl.textContent = String(cartCount()); }

  function route() {
    var hash = location.hash || "#/";
    if (hash === "#/" ) renderList();
    else if (hash.indexOf("#/product/") === 0) renderProduct(hash.slice("#/product/".length));
    else if (hash === "#/cart") renderCart();
    else if (hash === "#/checkout") renderCheckout();
    else if (hash === "#/thanks") renderThanks();
    else renderList();
    window.scrollTo(0, 0);
  }

  // ---------- on-page event log ----------
  var logEl = document.getElementById("event-log-list");
  function appendLog(entry) {
    var li = document.createElement("li");
    var title = Array.isArray(entry) ? "gtag(" + entry[0] + ")" : (entry.event || (entry.ecommerce === null ? "ecommerce: null (reset)" : "push"));
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    summary.textContent = title;
    var pre = document.createElement("pre");
    pre.textContent = JSON.stringify(entry, null, 2);
    details.appendChild(summary);
    details.appendChild(pre);
    li.appendChild(details);
    logEl.insertBefore(li, logEl.firstChild);
  }
  window.STORE_EVENTS.forEach(appendLog);
  window.addEventListener("store-dl-push", function (e) { appendLog(e.detail); });

  if (BUG) {
    var note = document.getElementById("bug-note");
    note.hidden = false;
    note.textContent = "Bug lab mode active: ?bug=" + BUG + " (see docs/bug-lab.md)";
  }

  window.addEventListener("hashchange", route);
  updateCartCount();
  route();
})();
