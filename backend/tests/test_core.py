import uuid

from app.utils.tree import would_create_cycle


def test_would_create_cycle_self():
    a = uuid.uuid4()
    assert would_create_cycle({a: None}, a, a) is True


def test_would_create_cycle_loop():
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    mapping = {a: None, b: a, c: b}
    # Making a report to c would cycle a <- b <- c <- a
    assert would_create_cycle(mapping, a, c) is True
    assert would_create_cycle(mapping, c, a) is False


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_me_unauthorized(client):
    assert client.get("/api/auth/me").status_code == 401
