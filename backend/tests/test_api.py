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


def test_update_profile(client: TestClient) -> None:
    resp = client.post("/api/auth/profile", json={"name": "Updated Operator", "avatar": "data:image/png;base64,iVBORw0KGgo="})
    assert resp.status_code == 200
    user = resp.json()["user"]
    assert user["name"] == "Updated Operator"
    assert user["avatar"] == "data:image/png;base64,iVBORw0KGgo="
    me = client.get("/api/auth/me").json()["user"]
    assert me["name"] == "Updated Operator"
    assert me["avatar"] == "data:image/png;base64,iVBORw0KGgo="


def test_change_password() -> None:
    with TestClient(app) as client:
        email = f"{uuid4().hex}@example.test"
        signup = client.post("/api/auth/signup", json={"name": "Password User", "email": email, "password": "initial-secret-123"})
        assert signup.status_code == 200

        # Bad current password
        bad_resp = client.post("/api/auth/change-password", json={"current_password": "wrong-secret-000", "new_password": "brand-new-secret-456"})
        assert bad_resp.status_code == 400

        # Successful password change
        good_resp = client.post("/api/auth/change-password", json={"current_password": "initial-secret-123", "new_password": "brand-new-secret-456"})
        assert good_resp.status_code == 200
        assert good_resp.json()["success"] is True

        # Log out and log in with new password
        client.post("/api/auth/logout")
        old_login = client.post("/api/auth/login", json={"email": email, "password": "initial-secret-123"})
        assert old_login.status_code == 401
        new_login = client.post("/api/auth/login", json={"email": email, "password": "brand-new-secret-456"})
        assert new_login.status_code == 200