"""
Author  : Anil Kalisetti
File    : graders/python/policy_checker.py
Purpose : Custom promptfoo grader written in Python. Checks that a retail
          support answer states a return time window in days and never makes
          promises the store policy does not allow.

Usage in a test file:
  assert:
    - type: python
      value: file://graders/python/policy_checker.py
      config:
        forbidden_phrases: ["guaranteed refund", "no questions asked"]

Requires python3 on PATH (or PROMPTFOO_PYTHON pointing at an interpreter).
"""

import re

# Promises a support bot must never make about refunds.
DEFAULT_FORBIDDEN_PHRASES = ["guaranteed refund", "no questions asked", "refund within minutes"]

# Matches a time window such as "30 days" or "14-day".
DAYS_PATTERN = re.compile(r"\b\d{1,3}[\s-]?days?\b", re.IGNORECASE)


def get_assert(output, context):
    """promptfoo entry point. Returns a dict with pass, score and reason."""
    text = str(output or "")
    config = (context or {}).get("config") or {}
    forbidden = config.get("forbidden_phrases", DEFAULT_FORBIDDEN_PHRASES)

    broken_promises = [phrase for phrase in forbidden if phrase.lower() in text.lower()]
    if broken_promises:
        return {
            "pass": False,
            "score": 0.0,
            "reason": f"Answer makes a forbidden promise: {', '.join(broken_promises)}",
        }

    if not DAYS_PATTERN.search(text):
        return {"pass": False, "score": 0.0, "reason": "Answer does not state a return window in days"}

    return {"pass": True, "score": 1.0, "reason": "States a return window and avoids forbidden promises"}
