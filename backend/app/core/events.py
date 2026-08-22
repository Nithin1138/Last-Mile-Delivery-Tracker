"""Structured business-event logging for important decisions.

Logs are structured, greppable, and useful for both demos and debugging.
Example output:
  [AUTO_ASSIGNMENT] order=3f9a1c22 agent=7b2e1a90 reason=nearest_by_distance distance_km=2.14
  [PRICE_CALCULATED] order=3f9a1c22 chargeable_weight=12.0 rate_card=B2C/INTER total=320.00
"""

import logging

logger = logging.getLogger("business_events")
logger.setLevel(logging.INFO)

# Ensure we have a handler
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    logger.addHandler(handler)


def log_event(event_type: str, **kwargs):
    """Log a structured business event.

    Args:
        event_type: Event category (e.g., "AUTO_ASSIGNMENT", "PRICE_CALCULATED").
        **kwargs: Key-value pairs to include in the log line.
    """
    parts = " ".join(f"{k}={v}" for k, v in kwargs.items())
    logger.info(f"[{event_type}] {parts}")
