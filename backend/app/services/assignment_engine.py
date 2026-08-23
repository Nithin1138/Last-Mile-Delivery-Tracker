"""
Assignment engine — ranks and selects the best delivery agent for an order.

Three-tier ranking strategy:
1. Nearest by Haversine distance (when coordinates available)
2. Same-zone preference tie-breaker
3. Least loaded / first available fallback
"""

import json
from dataclasses import dataclass, asdict
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.models import (
    DeliveryAgent,
    AgentStatusEnum,
    Order,
    AssignmentDecision,
    AssignmentModeEnum,
    OrderStatusEnum,
)
from app.services.distance import calculate_distance
from app.services.agent_claim import atomic_claim_agent
from app.services.order_lifecycle import transition_order, create_delivery_attempt
from app.core.errors import AppError, ErrorCodes
from app.core.events import log_event


@dataclass
class CandidateAgent:
    """An agent candidate considered for assignment."""

    agent_id: str
    agent_name: str
    distance_km: Optional[float]
    zone_match: bool
    availability: str
    current_load: int
    max_capacity: int


def find_eligible_agents(db: Session) -> List[DeliveryAgent]:
    """Find all agents eligible for assignment.

    Filters: active, AVAILABLE status, current_load < max_capacity.
    """
    return (
        db.query(DeliveryAgent)
        .filter(
            DeliveryAgent.is_active == True,
            DeliveryAgent.availability_status == AgentStatusEnum.AVAILABLE,
            DeliveryAgent.current_load < DeliveryAgent.max_capacity,
        )
        .all()
    )


def rank_candidates(
    agents: List[DeliveryAgent],
    pickup_lat: Optional[float],
    pickup_lon: Optional[float],
    pickup_zone_id: Optional[UUID],
) -> List[Tuple[DeliveryAgent, Optional[float], bool]]:
    """Rank agents by suitability for assignment.

    Returns list of (agent, distance_km, zone_match) tuples, sorted by:
    1. Distance ascending (nearest first; unknown distance at end)
    2. Zone match (same zone preferred as tie-breaker)
    3. Current load ascending (least loaded first)
    """
    ranked = []

    for agent in agents:
        distance = calculate_distance(
            pickup_lat, pickup_lon, agent.latitude, agent.longitude
        )
        zone_match = (
            pickup_zone_id is not None
            and agent.current_zone_id is not None
            and agent.current_zone_id == pickup_zone_id
        )
        ranked.append((agent, distance, zone_match))

    # Sort: nearest distance first, zone match as tie-breaker, then least loaded
    def sort_key(item):
        agent, distance, zone_match = item
        return (
            distance if distance is not None else float("inf"),  # 1. Nearest by GPS distance
            0 if zone_match else 1,                             # 2. Zone match preference
            agent.current_load,                                  # 3. Least loaded
        )

    ranked.sort(key=sort_key)
    return ranked


def auto_assign_order(
    db: Session,
    order: Order,
    assigned_by: Optional[UUID] = None,
) -> AssignmentDecision:
    """Automatically assign the best available agent to an order.

    Acquires a pessimistic row-level lock (SELECT ... FOR UPDATE) on the order row
    to guarantee concurrency safety regardless of whether invocation originates from
    the API endpoint, background worker, or CLI task.

    Walks through ranked candidates, attempting atomic claim on each
    until one succeeds. Creates assignment decision audit record.

    Raises:
        AppError: If no eligible agent is available or order is not in CREATED/RESCHEDULED status.
    """
    locked_order = (
        db.query(Order)
        .filter(Order.id == order.id)
        .with_for_update()
        .populate_existing()
        .first()
    )
    if not locked_order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    current_status = locked_order.status.value if hasattr(locked_order.status, 'value') else locked_order.status
    if current_status not in [OrderStatusEnum.CREATED.value, OrderStatusEnum.RESCHEDULED.value]:
        raise AppError(
            code=ErrorCodes.INVALID_STATUS_TRANSITION,
            message=f"Cannot assign agent to order in {current_status} status.",
            status_code=400,
        )

    eligible = find_eligible_agents(db)

    if not eligible:
        raise AppError(
            code=ErrorCodes.NO_AVAILABLE_AGENT,
            message="No available delivery agent was found for assignment.",
            status_code=400,
        )

    ranked = rank_candidates(
        eligible,
        float(locked_order.pickup_latitude) if locked_order.pickup_latitude is not None else None,
        float(locked_order.pickup_longitude) if locked_order.pickup_longitude is not None else None,
        locked_order.pickup_zone_id,
    )

    # Build candidates list for audit
    candidates_data = []
    for agent, distance, zone_match in ranked:
        candidates_data.append(
            CandidateAgent(
                agent_id=str(agent.id),
                agent_name=agent.user.name if agent.user else "Unknown",
                distance_km=round(distance, 2) if distance is not None else None,
                zone_match=zone_match,
                availability=agent.availability_status.value,
                current_load=agent.current_load,
                max_capacity=agent.max_capacity,
            )
        )

    # Try to claim agents in ranked order
    selected_agent = None
    selected_distance = None
    selected_zone_match = False

    for agent, distance, zone_match in ranked:
        success = atomic_claim_agent(db, agent.id, locked_order.id)
        if success:
            selected_agent = agent
            selected_distance = distance
            selected_zone_match = zone_match
            break

    if selected_agent is None:
        raise AppError(
            code=ErrorCodes.NO_AVAILABLE_AGENT,
            message="All candidate agents were claimed by other orders.",
            status_code=400,
        )


    # Determine reason
    if selected_distance is not None and selected_zone_match:
        reason = "nearest_available_agent_in_pickup_zone"
    elif selected_distance is not None:
        reason = "nearest_available_agent_by_distance"
    elif selected_zone_match:
        reason = "same_zone_agent"
    else:
        reason = "first_available_agent"

    # Update order
    locked_order.agent_id = selected_agent.id

    # Transition status
    transition_order(
        db, locked_order, OrderStatusEnum.ASSIGNED.value,
        changed_by=assigned_by,
        reason=f"Auto-assigned to agent: {reason}",
    )

    # Create delivery attempt
    create_delivery_attempt(db, locked_order.id, selected_agent.id, locked_order.scheduled_date)

    # Record assignment decision
    decision = AssignmentDecision(
        order_id=locked_order.id,
        selected_agent_id=selected_agent.id,
        selection_mode=AssignmentModeEnum.AUTO,
        candidate_count=len(ranked),
        selected_distance_km=(
            round(selected_distance, 2)
            if selected_distance is not None
            else None
        ),
        pickup_zone_id=locked_order.pickup_zone_id,
        selected_agent_zone_id=selected_agent.current_zone_id,
        reason=reason,
        candidates_json=json.dumps([asdict(c) for c in candidates_data]),
    )
    db.add(decision)

    log_event(
        "AUTO_ASSIGNMENT",
        order=str(locked_order.id),
        agent=str(selected_agent.id),
        distance_km=str(round(selected_distance, 2)) if selected_distance is not None else "N/A",
        candidates=len(ranked),
        reason=reason,
    )

    return decision


def manual_assign_order(
    db: Session,
    order: Order,
    agent_id: UUID,
    assigned_by: Optional[UUID] = None,
) -> AssignmentDecision:
    """Manually assign a specific agent to an order.

    Acquires row-level lock (SELECT ... FOR UPDATE) to ensure concurrency safety.

    Raises:
        AppError: If the agent is not available or at capacity.
    """
    locked_order = (
        db.query(Order)
        .filter(Order.id == order.id)
        .with_for_update()
        .populate_existing()
        .first()
    )
    if not locked_order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    current_status = locked_order.status.value if hasattr(locked_order.status, 'value') else locked_order.status
    if current_status not in [OrderStatusEnum.CREATED.value, OrderStatusEnum.RESCHEDULED.value]:
        raise AppError(
            code=ErrorCodes.INVALID_STATUS_TRANSITION,
            message=f"Cannot assign agent to order in {current_status} status.",
            status_code=400,
        )

    agent = db.query(DeliveryAgent).filter(DeliveryAgent.id == agent_id).first()

    if agent is None:
        raise AppError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message="The specified delivery agent was not found.",
            status_code=404,
        )

    success = atomic_claim_agent(db, agent_id, locked_order.id)
    if not success:
        raise AppError(
            code=ErrorCodes.AGENT_UNAVAILABLE,
            message="Agent is not available or at capacity.",
            status_code=400,
        )

    # Calculate distance for audit
    distance = calculate_distance(
        float(locked_order.pickup_latitude) if locked_order.pickup_latitude is not None else None,
        float(locked_order.pickup_longitude) if locked_order.pickup_longitude is not None else None,
        agent.latitude,
        agent.longitude,
    )

    locked_order.agent_id = agent.id

    # Transition status
    transition_order(
        db, locked_order, OrderStatusEnum.ASSIGNED.value,
        changed_by=assigned_by,
        reason="Manually assigned to agent",
    )

    # Create delivery attempt
    create_delivery_attempt(db, locked_order.id, agent.id, locked_order.scheduled_date)

    # Record decision
    decision = AssignmentDecision(
        order_id=locked_order.id,
        selected_agent_id=agent.id,
        selection_mode=AssignmentModeEnum.MANUAL,
        candidate_count=1,
        selected_distance_km=(
            round(distance, 2)
            if distance is not None
            else None
        ),
        pickup_zone_id=locked_order.pickup_zone_id,
        selected_agent_zone_id=agent.current_zone_id,
        reason="manual_assignment_by_admin",
    )
    db.add(decision)

    log_event(
        "MANUAL_ASSIGNMENT",
        order=str(locked_order.id),
        agent=str(agent.id),
        distance_km=str(round(distance, 2)) if distance is not None else "N/A",
        assigned_by=str(assigned_by) if assigned_by else "system",
        reason="manual_assignment_by_admin",
    )

    return decision
