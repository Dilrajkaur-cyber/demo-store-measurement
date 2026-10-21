// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const Hash = require("../src/hash.js");

// Same vector as tests/test_python_scripts.py, so JS and Python are cross-checked.
const KNOWN_HASH = "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514";

test("normaliseEmail trims and lowercases", () => {
  assert.strictEqual(Hash.normaliseEmail("  User@Example.COM \n"), "user@example.com");
});

test("normaliseEmail is safe for null and undefined", () => {
  assert.strictEqual(Hash.normaliseEmail(null), "");
  assert.strictEqual(Hash.normaliseEmail(undefined), "");
});

test("sha256Hex matches the known vector", async () => {
  assert.strictEqual(await Hash.sha256Hex("user@example.com"), KNOWN_HASH);
});

test("messy input matches clean input after normalising", async () => {
  const hashed = await Hash.sha256Hex(Hash.normaliseEmail("  USER@example.com "));
  assert.strictEqual(hashed, KNOWN_HASH);
});

test("un-normalised input gives a different hash (the no-normalise bug)", async () => {
  const hashed = await Hash.sha256Hex("  USER@example.com ");
  assert.notStrictEqual(hashed, KNOWN_HASH);
});
