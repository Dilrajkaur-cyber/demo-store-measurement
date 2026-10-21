#!/usr/bin/env python3
"""Normalise and SHA-256 hash an email address, the way Enhanced Conversions expects.

Steps: trim whitespace, lowercase, SHA-256, lowercase hex output.
This mirrors src/hash.js so the two implementations can be cross-checked.

Check Google's current Enhanced Conversions formatting rules before relying on this
(for example special handling of Gmail addresses). This is a learning implementation.

Usage:
    python3 scripts/hash_email.py "  User@Example.com "
"""
import hashlib
import sys


def normalise_email(email: str) -> str:
    return (email or "").strip().lower()


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def hash_email(email: str) -> str:
    return sha256_hex(normalise_email(email))


def main(argv=None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("Usage: hash_email.py <email>", file=sys.stderr)
        return 2
    print(hash_email(args[0]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
