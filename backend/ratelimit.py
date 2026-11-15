import os
import time
from collections import defaultdict, deque

PER_USER_HOUR = int(os.getenv("RATE_LIMIT_PER_USER_HOUR", "10"))
PER_IP_HOUR = int(os.getenv("RATE_LIMIT_PER_IP_HOUR", "100"))  # guests without a Firebase token
DAILY_CAP = int(os.getenv("DAILY_ANALYZE_CAP", "1000"))
# Sealing/opening history is cheap (no Gemini), so it gets its own, higher limit and skips the daily cap
VAULT_PER_USER_HOUR = int(os.getenv("RATE_LIMIT_VAULT_PER_USER_HOUR", "300"))

# shortcut: in-memory, single process (one VM). Use Redis/Cloud Armor if we scale out.
_hits: dict[str, deque] = defaultdict(deque)
_day = {"n": 0, "start": time.time()}


def check(key: str, limit: int, now: float | None = None, daily: bool = True) -> str | None:
    """Return a user-facing reason if the request must be rejected, else record it.
    `daily=False` keeps requests that cost no Gemini calls out of the daily cap."""
    now = time.time() if now is None else now
    if now - _day["start"] >= 86400:
        _day.update(n=0, start=now)
    if daily and _day["n"] >= DAILY_CAP:
        return "The sanctuary is resting for today. Please try again tomorrow."
    q = _hits[key]
    while q and now - q[0] >= 3600:
        q.popleft()
    if len(q) >= limit:
        return "You've reached the hourly limit. Please take a gentle pause and try again later."
    q.append(now)
    if daily:
        _day["n"] += 1
    if len(_hits) > 10000:  # drop idle IPs so memory stays bounded
        for k in [k for k, v in _hits.items() if not v]:
            del _hits[k]
    return None
