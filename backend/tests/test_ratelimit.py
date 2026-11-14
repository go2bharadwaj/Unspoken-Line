import ratelimit


def test_per_ip_limit_and_window(monkeypatch):
    monkeypatch.setattr(ratelimit, "PER_IP_HOUR", 2)
    ratelimit._hits.clear()
    assert ratelimit.check("1.1.1.1", 0) is None
    assert ratelimit.check("1.1.1.1", 1) is None
    assert ratelimit.check("1.1.1.1", 2) is not None      # 3rd in the hour blocked
    assert ratelimit.check("2.2.2.2", 2) is None          # other IPs unaffected
    assert ratelimit.check("1.1.1.1", 3601) is None       # window slid


def test_daily_cap_and_reset(monkeypatch):
    monkeypatch.setattr(ratelimit, "DAILY_CAP", 2)
    monkeypatch.setattr(ratelimit, "PER_IP_HOUR", 100)
    ratelimit._hits.clear()
    ratelimit._day.update(n=0, start=0)
    assert ratelimit.check("a", 1) is None
    assert ratelimit.check("b", 2) is None
    assert ratelimit.check("c", 3) is not None            # global cap hit
    assert ratelimit.check("c", 86401) is None            # new day
