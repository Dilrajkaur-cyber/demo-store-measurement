/*
 * boot.js - runs synchronously in <head>, BEFORE any other script.
 *
 * Responsibilities (in this order, which is the whole point of Consent Mode):
 *   1. create window.dataLayer and the gtag() helper
 *   2. set Consent Mode v2 defaults to "denied"
 *   3. restore a previously saved visitor choice (if any)
 *   4. only then load Google Tag Manager
 *
 * Bug-lab switches (see docs/bug-lab.md) change this order on purpose:
 *   ?bug=late-consent   loads GTM first, sets consent defaults afterwards
 */
(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var bug = params.get("bug") || "";
  window.STORE_BUG = bug;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  // ---- Event log: remember every dataLayer push so the page can display it ----
  window.STORE_EVENTS = [];
  var originalPush = window.dataLayer.push.bind(window.dataLayer);
  window.dataLayer.push = function () {
    var result = originalPush.apply(null, arguments);
    for (var i = 0; i < arguments.length; i++) {
      var entry = arguments[i];
      var plain = Object.prototype.toString.call(entry) === "[object Arguments]"
        ? Array.prototype.slice.call(entry)
        : entry;
      window.STORE_EVENTS.push(plain);
      try {
        window.dispatchEvent(new CustomEvent("store-dl-push", { detail: plain }));
      } catch (e) { /* ignore */ }
    }
    return result;
  };

  // ---- Consent state ----
  var CONSENT_KEY = "consent_v1";
  var DENIED = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };
  var CHOICES = {
    accept_all: {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted"
    },
    analytics_only: {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    },
    reject_all: DENIED
  };

  window.STORE_CONSENT = Object.assign({}, DENIED);

  function readSaved() {
    try {
      var raw = window.localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setDefaultConsent() {
    var defaults = Object.assign({ wait_for_update: 500 }, DENIED);
    window.gtag("consent", "default", defaults);
    var saved = readSaved();
    if (saved) {
      window.STORE_CONSENT = Object.assign({}, DENIED, saved);
      window.gtag("consent", "update", saved);
    }
  }

  // Called by the cookie banner when the visitor chooses.
  window.updateConsent = function (choiceName) {
    var choice = CHOICES[choiceName];
    if (!choice) return;
    window.STORE_CONSENT = Object.assign({}, choice);
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(choice));
    } catch (e) { /* storage may be blocked; the choice still applies for this page */ }
    window.gtag("consent", "update", choice);
  };

  window.hasSavedConsent = function () {
    return readSaved() !== null;
  };

  // ---- Google Tag Manager loader ----
  function loadGtm() {
    var id = window.STORE_CONFIG && window.STORE_CONFIG.GTM_ID;
    if (!id || /X{4,}/.test(id)) {
      // dataLayer-only mode: no container is loaded. A marker event is pushed at the point where
      // GTM would start, so the order (consent default first) is still visible in the event log.
      console.info("[demo-store] GTM_ID is a placeholder, so GTM is not loaded (dataLayer-only mode).");
      window.dataLayer.push({ event: "gtm.js.simulated" });
      return;
    }
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id);
    document.head.appendChild(script);
  }

  if (bug === "late-consent") {
    // BUG ON PURPOSE: the container starts before consent defaults exist.
    loadGtm();
    setDefaultConsent();
  } else {
    setDefaultConsent();
    loadGtm();
  }
})();
