"""
Concurrency-safe agent claim — the core of assignment safety.

Uses atomic conditional UPDATE to prevent two orders from claiming the
same agent capacity simultaneously.
"""

from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.models import AgentStatusEnum
from app.core.events import log_event


def atomic_claim_agent(db: Session, agent_id: UUID, order_id: UUID) -> bool:
    """Atomically claim an agent for an order.

    Uses a conditional UPDATE with explicit PostgreSQL enum casting that only
    succeeds if the agent is active, AVAILABLE, and has not reached max capacity.

    Transitions status to BUSY only when current_load + 1 reaches max_capacity.

    Args:
        db: Database session.
        agent_id: The agent to claim.
        order_id: The order this claim is for (for logging).

    Returns:
        True if the agent was successfully claimed, False if inactive, already at capacity, or taken.
    """
    result = db.execute(
        text("""
            UPDATE delivery_agents
            SET current_load = current_load + 1,
                availability_status = CASE
                    WHEN current_load + 1 >= max_capacity THEN CAST(:busy AS agent_status_enum)
                    ELSE CAST(:available AS agent_status_enum)
                END,
                updated_at = NOW()
            WHERE id = :agent_id
              AND is_active = TRUE
              AND availability_status = CAST(:available AS agent_status_enum)
              AND current_load < max_capacity
        """),
        {
            "busy": AgentStatusEnum.BUSY.value,
            "available": AgentStatusEnum.AVAILABLE.value,
            "agent_id": str(agent_id),
        },
    )

    rows_affected = result.rowcount

    if rows_affected == 0:
        log_event(
            "AGENT_CLAIM_FAILED",
            agent=str(agent_id),
            order=str(order_id),
            reason="agent_inactive_not_available_or_capacity_exceeded",
        )
        return False

    log_event(
        "AGENT_CLAIMED",
        agent=str(agent_id),
        order=str(order_id),
    )
    return True


def release_agent(db: Session, agent_id: UUID):
    """Release an agent (decrement load).

    If the agent was marked BUSY due to capacity and is now below capacity,
    it automatically transitions back to AVAILABLE (unless OFFLINE).
    """
    db.execute(
        text("""
            UPDATE delivery_agents
            SET current_load = GREATEST(current_load - 1, 0),
                availability_status = CASE
                    WHEN availability_status != CAST(:offline AS agent_status_enum) AND (current_load - 1 < max_capacity) THEN CAST(:available AS agent_status_enum)
                    ELSE availability_status
                END,
                updated_at = NOW()
            WHERE id = :agent_id
        """),
        {
            "agent_id": str(agent_id),
            "available": AgentStatusEnum.AVAILABLE.value,
            "offline": AgentStatusEnum.OFFLINE.value,
        },
    )

    log_event("AGENT_RELEASED", agent=str(agent_id))
