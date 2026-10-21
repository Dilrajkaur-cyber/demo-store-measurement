/*
 * hash.js - normalise and hash an email address the way Enhanced Conversions expects:
 * trim whitespace, lowercase, then SHA-256 as a lowercase hex string.
 *
 * Note: check Google's current Enhanced Conversions formatting rules before relying on this
 * (for example, special handling of Gmail addresses). This is a learning implementation.
 */
(function (root) {
  "use strict";

  function normaliseEmail(email) {
    return String(email == null ? "" : email).trim().toLowerCase();
  }

  async function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    var digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }

  var api = { normaliseEmail: normaliseEmail, sha256Hex: sha256Hex };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Hash = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
