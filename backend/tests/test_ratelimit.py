import ratelimit


def test_per_ip_limit_and_window(monkeypatch):
    ratelimit._hits.clear()
    assert ratelimit.check("1.1.1.1", 2, 0) is None
    assert ratelimit.check("1.1.1.1", 2, 1) is None
    assert ratelimit.check("1.1.1.1", 2, 2) is not None      # 3rd in the hour blocked
    assert ratelimit.check("2.2.2.2", 2, 2) is None          # other IPs unaffected
    assert ratelimit.check("1.1.1.1", 2, 3601) is None       # window slid


def test_daily_cap_and_reset(monkeypatch):
    monkeypatch.setattr(ratelimit, "DAILY_CAP", 2)
    ratelimit._hits.clear()
    ratelimit._day.update(n=0, start=0)
    assert ratelimit.check("a", 100, 1) is None
    assert ratelimit.check("b", 100, 2) is None
    assert ratelimit.check("c", 100, 3) is not None            # global cap hit
    assert ratelimit.check("c", 100, 86401) is None            # new day


def test_endpoint_buckets_per_user_not_per_ip(monkeypatch):
    from fastapi.testclient import TestClient

    import main

    monkeypatch.setattr(main, "FIREBASE_PROJECT_ID", "p")
    monkeypatch.setattr(main, "_verify_uid", lambda t: {"tokA": "A", "tokB": "B"}.get(t))
    monkeypatch.setattr(ratelimit, "PER_USER_HOUR", 1)
    monkeypatch.setattr(ratelimit, "PER_IP_HOUR", 1)
    ratelimit._hits.clear()
    ratelimit._day.update(n=0, start=__import__("time").time())

    body = {"image_base64": "AAAA", "mime_type": "image/png", "timer_duration_sec": 30}
    c = TestClient(main.app)
    post = lambda tok=None: c.post(
        "/api/v1/analyze-sketch", json=body,
        headers={"x-forwarded-for": "9.9.9.9", **({"authorization": f"Bearer {tok}"} if tok else {})},
    ).status_code

    assert post("tokA") == 200      # user A, shared IP
    assert post("tokA") == 429      # A over limit
    assert post("tokB") == 200      # B unaffected despite same IP
    assert post("bogus") == 200     # invalid token -> guest bucket (IP)
    assert post() == 429            # guest on same IP now limited
