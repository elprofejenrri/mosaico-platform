"""Backend tests for Lily Spanish API."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
ADMIN_TOKEN = os.environ.get("SUPABASE_ADMIN_TEST_TOKEN", "")
STUDENT_TOKEN = os.environ.get("SUPABASE_STUDENT_TEST_TOKEN", "")


@pytest.fixture
def s():
    return requests.Session()


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


def require_token(token):
    if not token:
        pytest.skip("Set a Supabase test access token for this authenticated test")


# ---- Auth ----
def test_auth_me_admin(s):
    require_token(ADMIN_TOKEN)
    r = s.get(f"{BASE_URL}/api/auth/me", headers=H(ADMIN_TOKEN))
    assert r.status_code == 200, r.text
    assert r.json().get("role") == "admin"


def test_auth_me_student(s):
    require_token(STUDENT_TOKEN)
    r = s.get(f"{BASE_URL}/api/auth/me", headers=H(STUDENT_TOKEN))
    assert r.status_code == 200
    assert r.json().get("role") == "student"


def test_auth_me_unauth(s):
    r = s.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


# ---- Products ----
def test_products_list(s):
    r = s.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    data = r.json()
    ids = {p["id"] for p in data}
    assert {"trial", "single-30", "single-45", "single-60", "pack-5", "pack-10", "monthly"}.issubset(ids)


# ---- Blog ----
def test_blog_list(s):
    r = s.get(f"{BASE_URL}/api/blog")
    assert r.status_code == 200
    slugs = {p["slug"] for p in r.json()}
    assert {"ser-vs-estar", "five-phrases", "consistency"}.issubset(slugs)


def test_blog_detail(s):
    r = s.get(f"{BASE_URL}/api/blog/ser-vs-estar")
    assert r.status_code == 200
    d = r.json()
    assert d["slug"] == "ser-vs-estar"
    assert d["body_en"] and d["body_es"]


# ---- Admin gating ----
def test_admin_stats_admin(s):
    require_token(ADMIN_TOKEN)
    r = s.get(f"{BASE_URL}/api/admin/stats", headers=H(ADMIN_TOKEN))
    assert r.status_code == 200
    d = r.json()
    for k in ("students", "bookings", "upcoming", "revenue_usd"):
        assert k in d


def test_admin_stats_student_forbidden(s):
    require_token(STUDENT_TOKEN)
    r = s.get(f"{BASE_URL}/api/admin/stats", headers=H(STUDENT_TOKEN))
    assert r.status_code == 403


def test_admin_bookings_admin(s):
    require_token(ADMIN_TOKEN)
    r = s.get(f"{BASE_URL}/api/admin/bookings", headers=H(ADMIN_TOKEN))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_bookings_student_forbidden(s):
    require_token(STUDENT_TOKEN)
    r = s.get(f"{BASE_URL}/api/admin/bookings", headers=H(STUDENT_TOKEN))
    assert r.status_code == 403


def test_admin_students_admin(s):
    require_token(ADMIN_TOKEN)
    r = s.get(f"{BASE_URL}/api/admin/students", headers=H(ADMIN_TOKEN))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_students_student_forbidden(s):
    require_token(STUDENT_TOKEN)
    r = s.get(f"{BASE_URL}/api/admin/students", headers=H(STUDENT_TOKEN))
    assert r.status_code == 403


# ---- Availability admin add ----
def test_admin_add_availability(s):
    require_token(ADMIN_TOKEN)
    date = "2031-06-15"
    time = f"{uuid.uuid4().int % 12 + 8:02d}:30"
    r = s.post(f"{BASE_URL}/api/admin/availability",
               json={"date": date, "start_time": time},
               headers=H(ADMIN_TOKEN))
    assert r.status_code == 200, r.text
    g = s.get(f"{BASE_URL}/api/availability", params={"date": date})
    assert g.status_code == 200
    assert any(slot["start_time"] == time for slot in g.json())


# ---- Bookings ----
def test_my_bookings_student(s):
    require_token(STUDENT_TOKEN)
    r = s.get(f"{BASE_URL}/api/bookings/me", headers=H(STUDENT_TOKEN))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---- Stripe checkout ----
def test_stripe_checkout_creates_session(s):
    require_token(ADMIN_TOKEN)
    payload = {
        "product_id": "single-30",
        "origin_url": "https://example.com",
        "date": "2031-06-15",
        "time": "10:00",
        "timezone": "UTC",
    }
    r = s.post(f"{BASE_URL}/api/payments/checkout", json=payload, headers=H(ADMIN_TOKEN))
    assert r.status_code == 200, r.text
    d = r.json()
    assert "url" in d and "stripe.com" in d["url"]
    assert d.get("session_id")
    # status endpoint should return without error
    st = s.get(f"{BASE_URL}/api/payments/status/{d['session_id']}")
    assert st.status_code == 200
    sj = st.json()
    assert "payment_status" in sj and "status" in sj


def test_stripe_checkout_unauth(s):
    payload = {"product_id": "single-30", "origin_url": "https://example.com"}
    r = s.post(f"{BASE_URL}/api/payments/checkout", json=payload)
    assert r.status_code == 401
