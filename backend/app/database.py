"""SQLAlchemy database engine, session factory, and dependency."""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator

from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Verify database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


IMMUTABILITY_TRIGGERS_SQL = """
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is strictly append-only. UPDATE and DELETE operations are forbidden.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_order_status_history ON order_status_history;
CREATE TRIGGER trg_immutable_order_status_history
BEFORE UPDATE OR DELETE ON order_status_history
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_immutable_assignment_decisions ON assignment_decisions;
CREATE TRIGGER trg_immutable_assignment_decisions
BEFORE UPDATE OR DELETE ON assignment_decisions
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_immutable_notifications ON notifications;
CREATE TRIGGER trg_immutable_notifications
BEFORE UPDATE OR DELETE ON notifications
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_immutable_delivery_attempts_delete ON delivery_attempts;
CREATE TRIGGER trg_immutable_delivery_attempts_delete
BEFORE DELETE ON delivery_attempts
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
"""



def install_immutability_triggers(bind=None):
    """Installs PostgreSQL database triggers to block direct SQL UPDATE and DELETE on audit log tables."""
    target = bind or engine
    try:
        with target.begin() as conn:
            conn.execute(text(IMMUTABILITY_TRIGGERS_SQL))
    except Exception:
        # Graceful fallback if non-PostgreSQL backend or dialect lacks plpgsql
        pass


def create_tables():
    """Create all tables from model metadata and install immutability triggers."""
    from app.models import models  # noqa: F401 — import to register models
    Base.metadata.create_all(bind=engine)
    install_immutability_triggers(engine)

