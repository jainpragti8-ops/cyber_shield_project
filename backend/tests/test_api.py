from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        suffix = uuid4().hex
        response = test_client.post("/api/auth/signup", json={"name": "Test User", "email": f"{suffix}@example.test", "password": "correct-horse-battery"})
        assert response.status_code == 200
        yield test_client
        test_client.post("/api/auth/logout")


def test_url_demo_is_high_risk_and_is_saved(client: TestClient) -> None:
    response = client.post("/api/scan/url", json={"url": "http://192.168.1.5/login@verify-account.example"})
    assert response.status_code == 200
    result = response.json()
    assert result["verdict"] == "High Risk"
    assert len(result["indicators"]) >= 3
    history = client.get("/api/history", params={"scan_type": "url"}).json()
    assert history[0]["id"] == result["id"]
    client.delete("/api/history")


def test_normal_https_url_has_low_risk(client: TestClient) -> None:
    response = client.post("/api/scan/url", json={"url": "https://www.wikipedia.org"})
    assert response.status_code == 200
    assert response.json()["verdict"] == "Low Risk"
    client.delete("/api/history")


def test_brand_lookalike_domain_is_flagged(client: TestClient) -> None:
    response = client.post("/api/scan/url", json={"url": "https://paypal-login.attacker.example"})
    assert response.status_code == 200
    assert any("brand" in item.lower() for item in response.json()["indicators"])
    client.delete("/api/history")


def test_spam_endpoint_uses_trained_model(client: TestClient) -> None:
    response = client.post("/api/scan/spam", json={"message": "Congratulations, claim your free prize now!"})
    assert response.status_code == 200
    result = response.json()
    assert result["method"] == "ml"
    assert 0 <= result["spam_probability"] <= 1
    client.delete("/api/history")


def test_invalid_url_is_rejected(client: TestClient) -> None:
    assert client.post("/api/scan/url", json={"url": "not a url"}).status_code == 422


def test_text_upload_reports_hash_and_signature_mismatch(client: TestClient) -> None:
    response = client.post("/api/scan/file", files={"file": ("report.pdf", b"plain text", "text/plain")})
    assert response.status_code == 200
    result = response.json()
    assert len(result["sha256"]) == 64
    assert any("signature" in item for item in result["indicators"])
    client.delete("/api/history")


def test_scans_require_authentication() -> None:
    with TestClient(app) as client:
        response = client.post("/api/scan/url", json={"url": "https://example.com"})
        assert response.status_code == 401


def test_signup_login_and_logout() -> None:
    with TestClient(app) as client:
        email = f"{uuid4().hex}@example.test"
        payload = {"name": "Cyber User", "email": email, "password": "correct-horse-battery"}
        signup = client.post("/api/auth/signup", json=payload)
        assert signup.status_code == 200
        assert client.get("/api/auth/me").json()["user"]["email"] == email
        assert client.post("/api/auth/logout").json()["logged_out"] is True
        assert client.get("/api/auth/me").status_code == 401
        login = client.post("/api/auth/login", json={"email": email, "password": payload["password"]})
        assert login.status_code == 200
        assert client.get("/api/auth/me").status_code == 200


def test_duplicate_email_and_bad_password_are_rejected() -> None:
    with TestClient(app) as client:
        payload = {"name": "Cyber User", "email": f"{uuid4().hex}@example.test", "password": "correct-horse-battery"}
        assert client.post("/api/auth/signup", json=payload).status_code == 200
        assert client.post("/api/auth/signup", json=payload).status_code == 409
        assert client.post("/api/auth/login", json={"email": payload["email"], "password": "wrong-password"}).status_code == 401


def test_scan_history_is_isolated_per_account(client: TestClient) -> None:
    scanned = client.post("/api/scan/url", json={"url": "https://example.com"}).json()
    with TestClient(app) as second_client:
        suffix = uuid4().hex
        second_client.post("/api/auth/signup", json={"name": "Second User", "email": f"{suffix}@example.test", "password": "correct-horse-battery"})
        assert second_client.get("/api/history").json() == []
        assert second_client.get(f"/api/history/{scanned['id']}").status_code == 404