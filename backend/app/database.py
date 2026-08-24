import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a database session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_health() -> bool:
    """Check database connectivity with a simple SELECT 1 query."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


check_db_connection = check_db_health


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

CREATE OR REPLACE FUNCTION prevent_delivery_attempt_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Identity immutability: id, order_id, attempt_number cannot be modified
    IF OLD.id <> NEW.id OR OLD.order_id <> NEW.order_id OR OLD.attempt_number <> NEW.attempt_number THEN
        RAISE EXCEPTION 'DeliveryAttempt identity fields (id, order_id, attempt_number) are strictly immutable.';
    END IF;

    -- 2. Terminal immutability: If already FAILED or DELIVERED, no update is permitted
    IF OLD.status IN ('DELIVERED', 'FAILED') THEN
        RAISE EXCEPTION 'DeliveryAttempt record #% is in terminal status % and cannot be modified.', OLD.attempt_number, OLD.status;
    END IF;

    -- 3. Lifecycle state machine: cannot revert IN_PROGRESS back to PENDING
    IF OLD.status = 'IN_PROGRESS' AND NEW.status = 'PENDING' THEN
        RAISE EXCEPTION 'Illegal lifecycle transition on DeliveryAttempt: cannot revert IN_PROGRESS to PENDING.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_delivery_attempts_update ON delivery_attempts;
CREATE TRIGGER trg_immutable_delivery_attempts_update
BEFORE UPDATE ON delivery_attempts
FOR EACH ROW EXECUTE FUNCTION prevent_delivery_attempt_mutation();
"""


def install_immutability_triggers(bind=None):
    """Installs PostgreSQL database triggers to block direct SQL UPDATE and DELETE on audit log tables."""
    target = bind or engine
    try:
        with target.begin() as conn:
            conn.execute(text(IMMUTABILITY_TRIGGERS_SQL))
    except Exception as e:
        logger.debug(f"Trigger installation notice (expected in non-PostgreSQL / test environments): {e}")


def create_tables():
    """Create all tables from model metadata and install immutability triggers."""
    from app.models import models  # noqa: F401 — import to register models
    Base.metadata.create_all(bind=engine)
    install_immutability_triggers(engine)
