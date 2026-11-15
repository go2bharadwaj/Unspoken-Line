"""User data is sealed per user: only the right uid opens it, and only with the backend's key."""
import base64
import os

import pytest
from fastapi.testclient import TestClient

import ai
import main
import vault
from tests.test_gate import create_base64_image, create_scribble_image
from tests.test_progression import TELEMETRY, FakeGemini, Resp, _flash

KEY = base64.b64encode(os.urandom(32)).decode()


@pytest.fixture
def key(monkeypatch):
    monkeypatch.setenv("DATA_ENCRYPTION_KEY", KEY)


def test_round_trip_and_ciphertext_hides_the_text(key):
    sealed = vault.seal("alice", "Your lines loosened today.")
    assert sealed.startswith("v1:") and "loosened" not in sealed
    assert vault.open_("alice", sealed) == "Your lines loosened today."
    assert vault.seal("alice", "same") != vault.seal("alice", "same")  # fresh nonce each time


def test_another_user_or_a_tampered_value_cannot_be_opened(key):
    sealed = vault.seal("alice", "private")
    with pytest.raises(vault.VaultError):
        vault.open_("bob", sealed)
    flipped = sealed[:-2] + ("A" if sealed[-2] != "A" else "B") + sealed[-1]
    with pytest.raises(vault.VaultError):
        vault.open_("alice", flipped)
    with pytest.raises(vault.VaultError):
        vault.open_("alice", "plain text")


def test_a_different_key_cannot_open(key, monkeypatch):
    sealed = vault.seal("alice", "private")
    monkeypatch.setenv("DATA_ENCRYPTION_KEY", base64.b64encode(os.urandom(32)).decode())
    with pytest.raises(vault.VaultError):
        vault.open_("alice", sealed)


@pytest.mark.parametrize("bad", ["", "not base64!!", base64.b64encode(b"short").decode()])
def test_missing_or_malformed_key_is_unconfigured(monkeypatch, bad):
    monkeypatch.setenv("DATA_ENCRYPTION_KEY", bad)
    assert not vault.configured()


def test_endpoints_seal_to_the_verified_uid_only(key, monkeypatch):
    monkeypatch.setattr(main, "FIREBASE_PROJECT_ID", "proj")
    monkeypatch.setattr(main, "_verify_uid", lambda token: {"alice-token": "alice", "bob-token": "bob"}.get(token))
    client = TestClient(main.app)
    as_ = lambda t: {"Authorization": f"Bearer {t}"}

    assert client.post("/api/v1/vault/seal", json={"values": ["x"]}).status_code == 401
    assert client.post("/api/v1/vault/seal", json={"values": ["x"]}, headers=as_("forged")).status_code == 401

    sealed = client.post("/api/v1/vault/seal", json={"values": ["a", "b"]}, headers=as_("alice-token")).json()["values"]
    assert client.post("/api/v1/vault/open", json={"values": sealed}, headers=as_("alice-token")).json() == {"values": ["a", "b"]}
    # Bob can't open Alice's values even through the API; one bad value doesn't hide the others
    mixed = [sealed[0], vault.seal("bob", "bob's")]
    assert client.post("/api/v1/vault/open", json={"values": mixed}, headers=as_("bob-token")).json() == {"values": [None, "bob's"]}


def test_endpoints_refuse_without_a_key(monkeypatch):
    monkeypatch.delenv("DATA_ENCRYPTION_KEY", raising=False)
    monkeypatch.setattr(main, "FIREBASE_PROJECT_ID", "proj")
    r = TestClient(main.app).post("/api/v1/vault/seal", json={"values": ["x"]}, headers={"Authorization": "Bearer t"})
    assert r.status_code == 503


def test_age_reaches_the_prompt_only_when_given(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.delenv("JEV_API_KEY", raising=False)
    monkeypatch.setattr(ai.genai, "Client", FakeGemini(Resp(parsed=_flash(None))))
    client = TestClient(main.app)
    b64 = create_base64_image(create_scribble_image(120, 120), format="JPEG")
    body = {"image_base64": b64, "mime_type": "image/jpeg", "timer_duration_sec": 15}

    for age, expected in [(34, "The person is 34 years old."), (None, None)]:
        FakeGemini.calls = []
        assert client.post("/api/v1/analyze-sketch", json=body | ({"age": age} if age else {})).json()["safety_status"] == "SAFE"
        sent = " ".join(c for c in FakeGemini.calls[0]["contents"] if isinstance(c, str))
        assert (expected in sent) if expected else ("years old" not in sent)

    assert client.post("/api/v1/analyze-sketch", json=body | {"age": 9}).status_code == 422


def test_a_photo_fits_but_oversized_requests_are_refused(key, monkeypatch):
    monkeypatch.setattr(main, "FIREBASE_PROJECT_ID", "proj")
    monkeypatch.setattr(main, "_verify_uid", lambda token: "alice")
    client = TestClient(main.app)
    h = {"Authorization": "Bearer t"}
    photo = base64.b64encode(os.urandom(300_000)).decode()  # ~400k chars, the client's cap
    sealed = client.post("/api/v1/vault/seal", json={"values": [photo]}, headers=h).json()["values"][0]
    assert client.post("/api/v1/vault/open", json={"values": [sealed]}, headers=h).json()["values"] == [photo]
    assert client.post("/api/v1/vault/seal", json={"values": ["x" * 600_001]}, headers=h).status_code == 422
    assert client.post("/api/v1/vault/seal", json={"values": ["x" * 500_000] * 4}, headers=h).status_code == 422
