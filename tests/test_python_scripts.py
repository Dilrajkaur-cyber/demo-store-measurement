import contextlib
import io
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

import hash_email  # noqa: E402
import measurement_protocol as mp  # noqa: E402

# SHA-256 of "user@example.com" (cross-checked with `printf 'user@example.com' | sha256sum`)
KNOWN_HASH = "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514"


class HashEmailTests(unittest.TestCase):
    def test_normalises_case_and_whitespace(self):
        self.assertEqual(hash_email.normalise_email("  User@Example.COM \n"), "user@example.com")

    def test_known_vector(self):
        self.assertEqual(hash_email.hash_email("user@example.com"), KNOWN_HASH)

    def test_messy_input_matches_clean_input(self):
        self.assertEqual(hash_email.hash_email("  USER@example.com "), KNOWN_HASH)

    def test_unnormalised_input_gives_different_hash(self):
        # This is the bug demonstrated by ?bug=no-normalise in the store.
        self.assertNotEqual(hash_email.sha256_hex("  USER@example.com "), KNOWN_HASH)

    def test_none_is_safe(self):
        self.assertEqual(hash_email.normalise_email(None), "")


class MeasurementProtocolTests(unittest.TestCase):
    def test_payload_shape(self):
        payload = mp.build_payload("123.456", "T-1", 29, "eur", mp.SAMPLE_ITEMS)
        event = payload["events"][0]
        self.assertEqual(payload["client_id"], "123.456")
        self.assertEqual(event["name"], "purchase")
        self.assertEqual(event["params"]["currency"], "EUR")
        self.assertEqual(event["params"]["value"], 29.0)
        self.assertEqual(event["params"]["transaction_id"], "T-1")
        self.assertEqual(len(event["params"]["items"]), 1)

    def test_optional_fields(self):
        payload = mp.build_payload("1.1", "T-2", 5, "EUR", mp.SAMPLE_ITEMS, timestamp_micros=1700000000000000, user_id="u1")
        self.assertEqual(payload["user_id"], "u1")
        self.assertEqual(payload["timestamp_micros"], 1700000000000000)

    def test_validation_catches_problems(self):
        problems = mp.validate_inputs("", "", -1, "EURO", [])
        self.assertGreaterEqual(len(problems), 4)

    def test_validation_accepts_good_input(self):
        self.assertEqual(mp.validate_inputs("1.1", "T-3", 10, "EUR", mp.SAMPLE_ITEMS), [])

    def test_dry_run_prints_valid_json_and_sends_nothing(self):
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            code = mp.main(["--dry-run", "--client-id", "1.2", "--transaction-id", "T-9"])
        self.assertEqual(code, 0)
        data = json.loads(buffer.getvalue())
        self.assertEqual(data["events"][0]["params"]["transaction_id"], "T-9")

    def test_missing_credentials_is_reported(self):
        saved = {k: os.environ.pop(k, None) for k in ("GA4_MEASUREMENT_ID", "GA4_API_SECRET")}
        try:
            err = io.StringIO()
            with contextlib.redirect_stderr(err):
                code = mp.main(["--client-id", "1.2", "--transaction-id", "T-9"])
            self.assertEqual(code, 2)
            self.assertIn("GA4_MEASUREMENT_ID", err.getvalue())
        finally:
            for key, value in saved.items():
                if value is not None:
                    os.environ[key] = value


if __name__ == "__main__":
    unittest.main()
