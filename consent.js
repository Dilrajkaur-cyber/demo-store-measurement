/* consent.js - a minimal cookie banner that drives Consent Mode v2 through window.updateConsent(). */
(function () {
  "use strict";

  var banner = document.getElementById("consent-banner");
  var reopen = document.getElementById("cookie-settings");

  function show() { banner.hidden = false; }
  function hide() { banner.hidden = true; }

  function choose(name) {
    window.updateConsent(name);
    hide();
  }

  banner.querySelector("[data-choice='accept_all']").addEventListener("click", function () { choose("accept_all"); });
  banner.querySelector("[data-choice='analytics_only']").addEventListener("click", function () { choose("analytics_only"); });
  banner.querySelector("[data-choice='reject_all']").addEventListener("click", function () { choose("reject_all"); });
  reopen.addEventListener("click", show);

  if (!window.hasSavedConsent()) {
    show();
  }
})();
