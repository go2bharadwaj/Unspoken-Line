import os
import time
from collections import defaultdict, deque

PER_USER_HOUR = int(os.getenv("RATE_LIMIT_PER_USER_HOUR", "10"))
PER_IP_HOUR = int(os.getenv("RATE_LIMIT_PER_IP_HOUR", "100"))  # guests without a Firebase token
DAILY_CAP = int(os.getenv("DAILY_ANALYZE_CAP", "1000"))

# ponytail: in-memory, single process (one VM). Use Redis/Cloud Armor if we scale out.
_hits: dict[str, deque] = defaultdict(deque)
_day = {"n": 0, "start": time.time()}


def check(key: str, limit: int, now: float | None = None) -> str | None:
    """Return a user-facing reason if the request must be rejected, else record it."""
    now = time.time() if now is None else now
    if now - _day["start"] >= 86400:
        _day.update(n=0, start=now)
    if _day["n"] >= DAILY_CAP:
        return "The sanctuary is resting for today. Please try again tomorrow."
    q = _hits[key]
    while q and now - q[0] >= 3600:
        q.popleft()
    if len(q) >= limit:
        return "You've reached the hourly limit. Please take a gentle pause and try again later."
    q.append(now)
    _day["n"] += 1
    if len(_hits) > 10000:  # drop idle IPs so memory stays bounded
        for k in [k for k, v in _hits.items() if not v]:
            del _hits[k]
    return None
