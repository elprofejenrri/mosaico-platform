"""Seed deterministic RBAC fixtures. Refuses to run outside local/test."""
from __future__ import annotations

import asyncio
import os
from database import close_pool, get_database
from server import _hash_password, _now_iso, _sync_user_role

TEST_PASSWORD = os.environ.get("RBAC_TEST_PASSWORD", "MosaicoTest!2026")
USERS = [
    ("rbac-admin", "admin@mosaico.test", "RBAC Admin", "administrador_sitio", None),
    ("rbac-student-a", "student@mosaico.test", "Student A", "alumno", "school-a"),
    ("rbac-tutor-a", "tutor@mosaico.test", "Tutor A", "tutor_padre", "school-a"),
    ("rbac-teacher-a", "teacher@mosaico.test", "Teacher A", "profesor", "school-a"),
    ("rbac-school-admin-a", "schooladmin@mosaico.test", "School Admin A", "administrador_escolar", "school-a"),
    ("rbac-finance", "finance@mosaico.test", "Finance AB", "finanzas", "school-a"),
    ("rbac-student-b", "student-b@mosaico.test", "Student B", "alumno", "school-b"),
]


async def upsert(collection, key: dict, doc: dict) -> None:
    if await collection.find_one(key, {"_id": 0}):
        await collection.update_one(key, {"$set": doc})
    else:
        await collection.insert_one(doc)


async def seed() -> None:
    environment = (os.environ.get("MOSAICO_ENV") or os.environ.get("APP_ENV") or "local").lower()
    if environment not in {"local", "test", "testing", "development"}:
        raise SystemExit("Refusing to seed RBAC test users outside local/test.")
    global_db = await get_database()
    import server
    server.db = global_db
    await server.seed_data()
    now = _now_iso()
    for school_id, code, name in (("school-a", "SCHOOL_A", "Escuela A"), ("school-b", "SCHOOL_B", "Escuela B")):
        await upsert(global_db.schools, {"id": school_id}, {
            "id": school_id, "code": code, "name": name, "status": "active",
            "created_at": now, "updated_at": now,
        })
    for user_id, email, name, role, school_id in USERS:
        await upsert(global_db.users, {"user_id": user_id}, {
            "user_id": user_id, "email": email, "name": name, "picture": "", "role": role,
            "password_hash": _hash_password(TEST_PASSWORD), "auth_provider": "local",
            "profile_type": "student" if role == "alumno" else "client",
            "active": True, "status": "active", "active_school_id": school_id,
            "created_at": now, "updated_at": now,
        })
        await _sync_user_role(user_id, role, assigned_by="rbac-admin", school_id=school_id)
        if school_id:
            await upsert(global_db.user_school_memberships, {
                "user_id": user_id, "school_id": school_id, "membership_type": role,
            }, {
                "id": f"membership-{user_id}-{school_id}", "user_id": user_id, "school_id": school_id,
                "membership_type": role, "status": "active", "created_at": now, "updated_at": now,
            })
    await _sync_user_role("rbac-finance", "finanzas", assigned_by="rbac-admin", school_id="school-b")
    await upsert(global_db.user_school_memberships, {
        "user_id": "rbac-finance", "school_id": "school-b", "membership_type": "finanzas",
    }, {
        "id": "membership-rbac-finance-school-b", "user_id": "rbac-finance", "school_id": "school-b",
        "membership_type": "finanzas", "status": "active", "created_at": now, "updated_at": now,
    })
    await upsert(global_db.tutor_student_links, {
        "tutor_user_id": "rbac-tutor-a", "student_user_id": "rbac-student-a", "school_id": "school-a",
    }, {
        "id": "link-tutor-a-student-a", "tutor_user_id": "rbac-tutor-a",
        "student_user_id": "rbac-student-a", "school_id": "school-a",
        "relationship_type": "guardian", "status": "active", "authorized_at": now,
        "authorized_by": "rbac-admin", "created_at": now, "updated_at": now,
    })
    await upsert(global_db.teacher_student_assignments, {"id": "assignment-teacher-a-student-a"}, {
        "id": "assignment-teacher-a-student-a", "teacher_user_id": "rbac-teacher-a",
        "student_user_id": "rbac-student-a", "school_id": "school-a", "status": "active",
        "starts_at": now, "created_at": now, "updated_at": now,
    })
    await upsert(global_db.teachers, {"id": "rbac-teacher-record"}, {
        "id": "rbac-teacher-record", "user_id": "rbac-teacher-a", "name": "Teacher A",
        "email": "teacher@mosaico.test", "bio_en": "RBAC fixture", "bio_es": "Fixture RBAC",
        "picture": "", "languages": ["es", "en"], "specialties": [], "availability": [],
        "active": True, "created_at": now, "updated_at": now,
    })
    for user_id, school_id in (("rbac-student-a", "school-a"), ("rbac-student-b", "school-b")):
        await upsert(global_db.bookings, {"id": f"rbac-booking-{user_id}"}, {
            "id": f"rbac-booking-{user_id}", "user_id": user_id,
            "user_email": next(item[1] for item in USERS if item[0] == user_id),
            "user_name": user_id, "product_id": "single-30", "product_name": "Test class",
            "duration_min": 30, "scheduled_date": "2031-06-15", "scheduled_time": "10:00",
            "timezone": "UTC", "status": "scheduled", "school_id": school_id,
            "teacher_id": "rbac-teacher-record" if school_id == "school-a" else None,
            "created_at": now, "updated_at": now,
        })
        await upsert(global_db.payment_transactions, {"session_id": f"rbac-payment-{user_id}"}, {
            "session_id": f"rbac-payment-{user_id}", "user_id": user_id,
            "user_email": next(item[1] for item in USERS if item[0] == user_id),
            "product_id": "single-30", "amount": 30.0, "currency": "usd",
            "payment_status": "paid", "status": "complete", "metadata": {"fixture": True},
            "booking_created": True, "school_id": school_id, "created_at": now, "updated_at": now,
        })
        await upsert(global_db.credit_movements, {"transaction_id": f"rbac-credit-{user_id}"}, {
            "id": f"rbac-credit-{user_id}", "actor_user_id": "rbac-admin",
            "account_user_id": user_id, "school_id": school_id, "balance_before": 0.0,
            "amount": 5.0, "balance_after": 5.0, "movement_type": "add",
            "reason": "RBAC test fixture", "transaction_id": f"rbac-credit-{user_id}",
            "metadata": {"fixture": True}, "created_at": now,
        })
    await close_pool()
    print(f"Seeded {len(USERS)} RBAC users. Password comes from RBAC_TEST_PASSWORD.")


if __name__ == "__main__":
    asyncio.run(seed())
