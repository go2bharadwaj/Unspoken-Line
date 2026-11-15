"""Field encryption for user data stored in Firestore.

The browser writes to Firestore directly, so the database (and anyone browsing it) would otherwise see
readings in plain text. Instead the client sends values here to be sealed before saving and opened after
loading. Each user gets their own AES-256-GCM key, derived with HKDF from DATA_ENCRYPTION_KEY (which lives
only on the backend) and their Firebase uid; the uid is also bound as associated data, so a value copied
into another account's records fails to open.

Losing DATA_ENCRYPTION_KEY makes every sealed value unreadable. Keep a copy somewhere safe.
"""
import base64
import binascii
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

PREFIX = "v1:"  # names the key and scheme, so a later key rotation can tell old values apart
NONCE_BYTES = 12


class VaultUnavailable(Exception):
    """DATA_ENCRYPTION_KEY is missing or malformed."""


class VaultError(Exception):
    """A value that isn't ours, was tampered with, or belongs to another user."""


def _master_key() -> bytes:
    raw = os.getenv("DATA_ENCRYPTION_KEY", "").strip()
    try:
        key = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        raise VaultUnavailable("DATA_ENCRYPTION_KEY is not valid base64")
    if len(key) != 32:
        raise VaultUnavailable("DATA_ENCRYPTION_KEY must be 32 bytes (base64)")
    return key


def configured() -> bool:
    try:
        _master_key()
        return True
    except VaultUnavailable:
        return False


def _user_cipher(uid: str) -> AESGCM:
    key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"unspoken-lines/user-data/v1/" + uid.encode(),
    ).derive(_master_key())
    return AESGCM(key)


def seal(uid: str, plaintext: str) -> str:
    nonce = os.urandom(NONCE_BYTES)
    ct = _user_cipher(uid).encrypt(nonce, plaintext.encode(), uid.encode())
    return PREFIX + base64.b64encode(nonce + ct).decode("ascii")


def open_(uid: str, sealed: str) -> str:
    if not sealed.startswith(PREFIX):
        raise VaultError("not a sealed value")
    try:
        blob = base64.b64decode(sealed[len(PREFIX):], validate=True)
        nonce, ct = blob[:NONCE_BYTES], blob[NONCE_BYTES:]
        return _user_cipher(uid).decrypt(nonce, ct, uid.encode()).decode()
    except (binascii.Error, ValueError, InvalidTag, UnicodeDecodeError):
        raise VaultError("value could not be opened")
