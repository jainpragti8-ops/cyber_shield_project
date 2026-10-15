from __future__ import annotations

import hashlib
import hmac
import ipaddress
import json
import mimetypes
import re
import secrets
import sqlite3
from collections.abc import Iterator
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

import joblib
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "cybershield.sqlite3"
MODEL_PATH = ROOT / "ml" / "models" / "spam_model.joblib"
METRICS_PATH = ROOT / "ml" / "models" / "metrics.json"
MAX_FILE_BYTES = 10 * 1024 * 1024
SESSION_COOKIE = "cybershield_session"
SESSION_TTL = timedelta(hours=12)
PASSWORD_ITERATIONS = 420_000

@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_db()
    yield


app = FastAPI(title="CyberShield AI", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SpamInput(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class UrlInput(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class SignupInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)


class LoginInput(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


@contextmanager
def database() -> Iterator[sqlite3.Connection]:
    connection = connect_db()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_db() -> None:
    with database() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_type TEXT NOT NULL,
                input_summary TEXT NOT NULL,
                verdict TEXT NOT NULL,
                risk_score REAL NOT NULL,
                confidence REAL,
                method TEXT NOT NULL,
                details_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )
        scan_columns = {row["name"] for row in connection.execute("PRAGMA table_info(scans)")}
        if "user_id" not in scan_columns:
            connection.execute("ALTER TABLE scans ADD COLUMN user_id INTEGER REFERENCES users(id)")


def public_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def issue_session(user_id: int, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + SESSION_TTL
    with database() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (token_hash, user_id, expires_at.isoformat()),
        )
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
    )


def require_user(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    with database() as connection:
        row = connection.execute(
            "SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?",
            (token_hash, now),
        ).fetchone()
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
    if row is None:
        raise HTTPException(status_code=401, detail="Your session has expired. Sign in again.")
    return public_user(row)


def hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)


def valid_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email))


def save_scan(user_id: int, scan_type: str, summary: str, result: dict) -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with database() as connection:
        cursor = connection.execute(
            "INSERT INTO scans (user_id, scan_type, input_summary, verdict, risk_score, confidence, method, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, scan_type, summary[:240], result["verdict"], result["risk_score"], result.get("confidence"), result["method"], json.dumps(result), created_at),
        )
        scan_id = cursor.lastrowid
    return {"id": scan_id, "scan_type": scan_type, "input_summary": summary[:240], "created_at": created_at, **result}


def analyze_url(user_id: int, raw_url: str) -> dict:
    value = raw_url.strip()
    if re.match(r"^[a-z][a-z0-9+.-]*:", value, re.I) and "://" not in value:
        raise HTTPException(status_code=422, detail="Enter a valid HTTP or HTTPS URL.")
    candidate = value if "://" in value else f"https://{value}"
    try:
        parsed = urlsplit(candidate)
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme not in {"http", "https"} or not host:
            raise ValueError
        parsed.port
        try:
            ipaddress.ip_address(host)
        except ValueError:
            ascii_host = host.encode("idna").decode("ascii")
            labels = ascii_host.split(".")
            if len(labels) < 2 or any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in labels):
                raise ValueError
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid HTTP or HTTPS URL.") from exc

    checks: list[tuple[bool, int, str]] = []
    try:
        ipaddress.ip_address(host)
        is_ip = True
    except ValueError:
        is_ip = False
    checks.extend([
        (is_ip, 25, "The host is an IP address rather than a domain name."),
        (len(value) > 100, 10, "The URL is unusually long."),
        (len(host.split(".")) > 4, 10, "The host contains many subdomains."),
        ("@" in value, 20, "An @ symbol can disguise the destination host."),
        (host.count("-") >= 3, 10, "The host contains several hyphens."),
        (parsed.scheme != "https", 10, "The URL does not use HTTPS."),
        (bool(re.search(r"login|verify|update|secure|account|wallet|password", value, re.I)), 10, "The URL contains a sensitive-action keyword."),
        (host in {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly"}, 15, "The host is a URL shortening service."),
        ("xn--" in host, 15, "The host contains punycode, which can hide lookalike characters."),
        (host.rsplit(".", 1)[-1] in {"zip", "mov", "click", "country", "gq", "tk"}, 10, "The top-level domain is commonly abused."),
        (any(brand in host and not host.endswith(domain) for brand, domain in {"paypal": "paypal.com", "google": "google.com", "microsoft": "microsoft.com", "apple": "apple.com", "amazon": "amazon.com", "facebook": "facebook.com", "instagram": "instagram.com", "netflix": "netflix.com"}.items()), 15, "A known brand appears outside its expected domain."),
    ])
    reasons = [description for triggered, _, description in checks if triggered]
    score = min(100, sum(points for triggered, points, _ in checks if triggered))
    level = "High Risk" if score >= 60 else "Medium Risk" if score >= 30 else "Low Risk"
    recommendations = ["Do not enter credentials or payment details unless you independently trust the destination."]
    if not reasons:
        recommendations = ["No listed URL heuristics were triggered; this does not guarantee the site is safe."]
    result = {"verdict": level, "risk_score": score, "method": "rule-based", "indicators": reasons, "recommendations": recommendations, "label": "Rule-based analysis, not machine learning"}
    return save_scan(user_id, "url", value, result)


def sniff_type(data: bytes) -> str:
    signatures = (
        (b"%PDF-", "application/pdf"), (b"\x89PNG\r\n\x1a\n", "image/png"),
        (b"\xff\xd8\xff", "image/jpeg"), (b"PK\x03\x04", "application/zip"),
        (b"MZ", "application/vnd.microsoft.portable-executable"),
    )
    return next((kind for signature, kind in signatures if data.startswith(signature)), "text/plain" if b"\x00" not in data[:512] else "application/octet-stream")


async def read_limited(upload: UploadFile) -> bytes:
    chunks = bytearray()
    while True:
        chunk = await upload.read(64 * 1024)
        if not chunk:
            break
        chunks.extend(chunk)
        if len(chunks) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds the 10 MB upload limit.")
    return bytes(chunks)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "spam_model_ready": MODEL_PATH.exists(), "model_message": None if MODEL_PATH.exists() else "Spam model is not trained. Add the UCI dataset and run python ml/train_spam_model.py."}


@app.post("/api/auth/signup")
def signup(payload: SignupInput, response: Response) -> dict:
    email = payload.email.strip().lower()
    name = payload.name.strip()
    if not valid_email(email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Name must contain at least two characters.")
    salt = secrets.token_bytes(16)
    password_hash = hash_password(payload.password, salt)
    try:
        with database() as connection:
            cursor = connection.execute(
                "INSERT INTO users (name, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)",
                (name, email, password_hash.hex(), salt.hex(), datetime.now(timezone.utc).isoformat()),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="An account with that email already exists.") from exc
    issue_session(user_id, response)
    return {"user": {"id": user_id, "name": name, "email": email}}


@app.post("/api/auth/login")
def login(payload: LoginInput, response: Response) -> dict:
    email = payload.email.strip().lower()
    with database() as connection:
        row = connection.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    expected = bytes.fromhex(row["password_hash"])
    actual = hash_password(payload.password, bytes.fromhex(row["password_salt"]))
    if not hmac.compare_digest(expected, actual):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    issue_session(row["id"], response)
    return {"user": public_user(row)}


@app.get("/api/auth/me")
def current_user(user: dict = Depends(require_user)) -> dict:
    return {"user": user}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with database() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="lax")
    return {"logged_out": True}


@app.post("/api/scan/spam")
def scan_spam(payload: SpamInput, user: dict = Depends(require_user)) -> dict:
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Spam model is not trained. Add the UCI dataset and run python ml/train_spam_model.py.")
    try:
        model = joblib.load(MODEL_PATH)
        probabilities = model.predict_proba([payload.message])[0]
        classes = list(model.classes_)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="The spam model could not be loaded. Retrain it with ml/train_spam_model.py.") from exc
    spam_index = classes.index("spam")
    spam_probability = float(probabilities[spam_index])
    label = "Spam" if spam_probability >= 0.5 else "Genuine"
    confidence = float(max(probabilities))
    pipeline = model
    vectorizer = pipeline.named_steps["tfidf"]
    classifier = pipeline.named_steps["classifier"]
    vector = vectorizer.transform([payload.message])
    terms = vectorizer.get_feature_names_out()
    weights = classifier.coef_[0]
    contributions = vector.toarray()[0] * weights
    top_terms = [str(terms[index]) for index in contributions.argsort()[-5:][::-1] if contributions[index] > 0]
    lower = payload.message.lower()
    hints = [hint for trigger, hint in ((r"urgent|immediately|claim now", "Urgency language is present."), (r"https?://|www\.", "A link is present."), (r"[$£€]|\b\d+\s?(?:usd|dollars?)\b", "Currency or money language is present.")) if re.search(trigger, lower)]
    result = {"verdict": label, "risk_score": round(spam_probability * 100, 1), "confidence": round(confidence, 4), "spam_probability": round(spam_probability, 4), "method": "ml", "indicators": top_terms, "hints": hints, "recommendations": ["Avoid replying or opening links in messages you do not trust."] if label == "Spam" else ["Still verify unexpected requests through a separate trusted channel."]}
    return save_scan(user["id"], "spam", payload.message, result)


@app.post("/api/scan/url")
def scan_url(payload: UrlInput, user: dict = Depends(require_user)) -> dict:
    return analyze_url(user["id"], payload.url)


@app.post("/api/scan/file")
async def scan_file(file: UploadFile = File(...), user: dict = Depends(require_user)) -> dict:
    filename = Path(file.filename or "upload").name
    data = await read_limited(file)
    await file.close()
    extension = Path(filename).suffix.lower()
    actual_type = sniff_type(data)
    guessed_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    risky = {".exe", ".js", ".bat", ".cmd", ".scr", ".vbs", ".ps1", ".msi", ".jar", ".hta", ".docm", ".xlsm"}
    indicators = []
    if extension in risky:
        indicators.append(f"The {extension} extension can contain executable or active content.")
    if re.search(r"\.[^.]+\.(?:exe|js|bat|scr|vbs|ps1|pdf|docx?)$", filename, re.I):
        indicators.append("The filename has multiple extensions, which can disguise its real type.")
    if guessed_type != actual_type and not (guessed_type == "application/zip" and actual_type == "application/zip"):
        indicators.append("The filename extension and detected file signature may not match.")
    score = min(100, len(indicators) * 35)
    verdict = "High Risk" if score >= 60 else "Review" if score else "No obvious red flags found (not a guarantee)"
    result = {"verdict": verdict, "risk_score": score, "method": "metadata", "file_name": filename, "size": len(data), "extension": extension or "(none)", "guessed_mime": guessed_type, "magic_type": actual_type, "sha256": hashlib.sha256(data).hexdigest(), "indicators": indicators, "recommendations": ["Do not execute unexpected files. Metadata checks cannot establish that a file is safe."]}
    return save_scan(user["id"], "file", filename, result)


@app.get("/api/history")
def history(scan_type: str | None = Query(default=None, pattern="^(spam|url|file)$"), user: dict = Depends(require_user)) -> list[dict]:
    query = "SELECT * FROM scans WHERE user_id = ?"
    params: tuple = (user["id"],)
    if scan_type:
        query += " AND scan_type = ?"
        params += (scan_type,)
    query += " ORDER BY id DESC LIMIT 200"
    with database() as connection:
        rows = connection.execute(query, params).fetchall()
    return [{**dict(row), "details": json.loads(row["details_json"])} for row in rows]


@app.get("/api/history/{scan_id}")
def history_detail(scan_id: int, user: dict = Depends(require_user)) -> dict:
    with database() as connection:
        row = connection.execute("SELECT * FROM scans WHERE id = ? AND user_id = ?", (scan_id, user["id"])).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return {**dict(row), "details": json.loads(row["details_json"])}


@app.delete("/api/history")
def clear_history(user: dict = Depends(require_user)) -> dict:
    with database() as connection:
        connection.execute("DELETE FROM scans WHERE user_id = ?", (user["id"],))
    return {"deleted": True}


@app.get("/api/stats")
def stats(user: dict = Depends(require_user)) -> dict:
    with connect_db() as connection:
        rows = connection.execute("SELECT scan_type, COUNT(*) AS total, SUM(CASE WHEN risk_score >= 60 THEN 1 ELSE 0 END) AS threats FROM scans WHERE user_id = ? GROUP BY scan_type", (user["id"],)).fetchall()
        total = connection.execute("SELECT COUNT(*) FROM scans WHERE user_id = ?", (user["id"],)).fetchone()[0]
        threats = connection.execute("SELECT COUNT(*) FROM scans WHERE user_id = ? AND risk_score >= 60", (user["id"],)).fetchone()[0]
        recent = connection.execute("SELECT id, scan_type, input_summary, verdict, risk_score, created_at FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT 5", (user["id"],)).fetchall()
    by_type = {row["scan_type"]: row["total"] for row in rows}
    return {"total_scans": total, "threats_detected": threats, "by_type": by_type, "recent": [dict(row) for row in recent]}


@app.get("/api/model/metrics")
def model_metrics() -> dict:
    if not METRICS_PATH.exists():
        return {"available": False, "message": "Train the spam model to generate evaluation metrics."}
    return {"available": True, **json.loads(METRICS_PATH.read_text(encoding="utf-8"))}