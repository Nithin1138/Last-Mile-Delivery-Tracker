"""
Pytest configuration and test database fixtures.

Strict isolation:
- All tests MUST run against a dedicated test database (TEST_DATABASE_URL).
- Never runs against or destroys the development/production database.
- Explicitly fails fast if TEST_DATABASE_URL is missing or equals DATABASE_URL.
"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db, install_immutability_triggers
from app.main import app
from app.config import settings
from app.models.models import (
    User, RoleEnum, Zone, Area, RateCard, CODSurcharge,
    OrderTypeEnum, ZoneRelationEnum, DeliveryAgent, AgentStatusEnum
)
from app.core.security import hash_password, create_access_token

# ---------------------------------------------------------------------------
# Strict Test Database URL Resolution & Validation
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or settings.TEST_DATABASE_URL

if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL must be configured for tests. "
        "Never run tests against the development or production database."
    )

if TEST_DATABASE_URL.strip() == settings.DATABASE_URL.strip():
    raise RuntimeError(
        "TEST_DATABASE_URL must be different from DATABASE_URL to prevent "
        "test setup/teardown from destroying application data."
    )

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def clean_tables_per_test():
    """Ensures each test starts and ends with clean isolated tables and triggers."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    install_immutability_triggers(engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    install_immutability_triggers(engine)



@pytest.fixture
def db():
    """Provides a database session for testing."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    """TestClient with get_db overridden to use the isolated test database session."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_fixture(db):
    user = User(
        email="admin_fixture@lastmile.dev",
        password_hash=hash_password("adminpass123"),
        name="Admin Fixture",
        role=RoleEnum.ADMIN,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def customer_fixture(db):
    user = User(
        email="customer_fixture@lastmile.dev",
        password_hash=hash_password("customerpass123"),
        name="Customer Fixture",
        role=RoleEnum.CUSTOMER,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def agent_fixture(db):
    user = User(
        email="agent_fixture@lastmile.dev",
        password_hash=hash_password("agentpass123"),
        name="Agent Fixture",
        role=RoleEnum.AGENT,
    )
    db.add(user)
    db.flush()
    agent = DeliveryAgent(
        user_id=user.id,
        availability_status=AgentStatusEnum.AVAILABLE,
        max_capacity=5,
        current_load=0,
        latitude=28.6139,
        longitude=77.2090,
    )
    db.add(agent)
    db.flush()
    return user, agent


@pytest.fixture
def admin_token(admin_fixture):
    return create_access_token({"sub": str(admin_fixture.id), "role": admin_fixture.role.value})


@pytest.fixture
def customer_token(customer_fixture):
    return create_access_token({"sub": str(customer_fixture.id), "role": customer_fixture.role.value})
