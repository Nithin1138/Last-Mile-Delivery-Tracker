"""
Deterministic seed script for Last-Mile Delivery Tracker.

Seeds:
- 1 Admin account
- 2 Customer accounts (B2B & B2C)
- 4 Delivery Agents (varied availability, zones, locations, and loads)
- 3 Zones (North, South, East)
- 10 Areas & Pincodes
- 4 Rate Cards (B2B/B2C × INTRA/INTER) + Versioning history
- 2 COD Surcharge configs
- 6 Realistic Orders demonstrating all states (DELIVERED, IN_TRANSIT, FAILED, RESCHEDULED, CREATED)
- Full append-only status histories and delivery attempts for all orders
"""

import sys
import os
from decimal import Decimal
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base, create_tables
from app.models.models import (
    User, RoleEnum, DeliveryAgent, AgentStatusEnum, Zone, Area,
    RateCard, CODSurcharge, Order, OrderStatusEnum, OrderTypeEnum,
    PaymentTypeEnum, ZoneRelationEnum, OrderStatusHistory, DeliveryAttempt,
    DeliveryAttemptStatusEnum, AssignmentDecision, AssignmentModeEnum
)
from app.core.security import hash_password


def seed(safe_if_exists: bool = False):
    db = SessionLocal()
    if safe_if_exists or os.environ.get("SEED_IF_EMPTY") == "1":
        # Check if already seeded
        try:
            user_count = db.query(User).count()
            if user_count > 0:
                print("ℹ️ Database already seeded. Skipping destructive re-seed.")
                db.close()
                return
        except Exception:
            pass  # Tables don't exist yet, proceed with creation

    print("🌱 Initializing clean schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    try:
        now = datetime.now(timezone.utc)

        # -------------------------------------------------------------------
        # 1. Users
        # -------------------------------------------------------------------
        print("👤 Seeding Users...")
        admin = User(
            email="admin@lastmile.dev",
            password_hash=hash_password("admin123"),
            name="Siddharth Mehta (Operations Admin)",
            phone="+919876543210",
            role=RoleEnum.ADMIN,
        )

        b2b_customer = User(
            email="logistics@acmecorp.in",
            password_hash=hash_password("customer123"),
            name="Acme Corp Supply Chain",
            phone="+919811122233",
            role=RoleEnum.CUSTOMER,
        )

        b2c_customer = User(
            email="rohit.verma@gmail.com",
            password_hash=hash_password("customer123"),
            name="Rohit Verma",
            phone="+919822233344",
            role=RoleEnum.CUSTOMER,
        )

        agent_user_1 = User(
            email="vikram.singh@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Vikram Singh",
            phone="+919833344455",
            role=RoleEnum.AGENT,
        )

        agent_user_2 = User(
            email="rahul.sharma@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Rahul Sharma",
            phone="+919844455566",
            role=RoleEnum.AGENT,
        )

        agent_user_3 = User(
            email="amit.kumar@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Amit Kumar",
            phone="+919855566677",
            role=RoleEnum.AGENT,
        )

        agent_user_4 = User(
            email="priya.patel@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Priya Patel",
            phone="+919866677788",
            role=RoleEnum.AGENT,
        )

        db.add_all([admin, b2b_customer, b2c_customer, agent_user_1, agent_user_2, agent_user_3, agent_user_4])
        db.flush()

        # -------------------------------------------------------------------
        # 2. Zones & Areas
        # -------------------------------------------------------------------
        print("🗺️ Seeding Zones & Pincode Areas...")
        zone_north = Zone(name="North (Delhi NCR)")
        zone_south = Zone(name="South (Mumbai Metro)")
        zone_east = Zone(name="East (Bengaluru Hub)")
        db.add_all([zone_north, zone_south, zone_east])
        db.flush()

        areas = [
            # Delhi NCR (North)
            Area(pincode="110001", name="Connaught Place, Central Delhi", zone_id=zone_north.id),
            Area(pincode="110016", name="Hauz Khas, South Delhi", zone_id=zone_north.id),
            Area(pincode="110020", name="Okhla Industrial Area Phase-III", zone_id=zone_north.id),
            Area(pincode="110092", name="Laxmi Nagar, East Delhi", zone_id=zone_north.id),
            # Mumbai Metro (South)
            Area(pincode="400001", name="Fort / Nariman Point, South Mumbai", zone_id=zone_south.id),
            Area(pincode="400051", name="Bandra Kurla Complex (BKC)", zone_id=zone_south.id),
            Area(pincode="400076", name="Powai Hiranandani", zone_id=zone_south.id),
            # Bengaluru Hub (East)
            Area(pincode="560001", name="MG Road / Brigade Road, Central", zone_id=zone_east.id),
            Area(pincode="560034", name="Koramangala 4th Block", zone_id=zone_east.id),
            Area(pincode="560100", name="Electronic City Phase-I", zone_id=zone_east.id),
        ]
        db.add_all(areas)
        db.flush()

        # -------------------------------------------------------------------
        # 3. Delivery Agents
        # -------------------------------------------------------------------
        print("🛵 Seeding Delivery Agents...")
        agent_1 = DeliveryAgent(
            user_id=agent_user_1.id,
            availability_status=AgentStatusEnum.AVAILABLE,
            max_capacity=5,
            current_load=0,
            latitude=28.6315,  # Connaught Place, Delhi
            longitude=77.2167,
            current_zone_id=zone_north.id,
        )

        agent_2 = DeliveryAgent(
            user_id=agent_user_2.id,
            availability_status=AgentStatusEnum.BUSY,
            max_capacity=5,
            current_load=2,
            latitude=28.5355,  # Hauz Khas / Saket, Delhi
            longitude=77.2410,
            current_zone_id=zone_north.id,
        )

        agent_3 = DeliveryAgent(
            user_id=agent_user_3.id,
            availability_status=AgentStatusEnum.AVAILABLE,
            max_capacity=5,
            current_load=0,
            latitude=18.9220,  # Fort, Mumbai
            longitude=72.8347,
            current_zone_id=zone_south.id,
        )

        agent_4 = DeliveryAgent(
            user_id=agent_user_4.id,
            availability_status=AgentStatusEnum.OFFLINE,
            max_capacity=5,
            current_load=0,
            latitude=19.0600,  # BKC, Mumbai
            longitude=72.8600,
            current_zone_id=zone_south.id,
        )

        db.add_all([agent_1, agent_2, agent_3, agent_4])
        db.flush()

        # -------------------------------------------------------------------
        # 4. Rate Cards & COD Surcharges
        # -------------------------------------------------------------------
        print("💳 Seeding Rate Cards & COD Rules...")
        rate_cards = [
            RateCard(
                order_type=OrderTypeEnum.B2C,
                zone_type=ZoneRelationEnum.INTRA,
                base_fee=Decimal("40.00"),
                rate_per_kg=Decimal("15.00"),
                version=1,
                is_active=True,
            ),
            RateCard(
                order_type=OrderTypeEnum.B2C,
                zone_type=ZoneRelationEnum.INTER,
                base_fee=Decimal("50.00"),
                rate_per_kg=Decimal("20.00"),
                version=1,
                is_active=True,
            ),
            RateCard(
                order_type=OrderTypeEnum.B2B,
                zone_type=ZoneRelationEnum.INTRA,
                base_fee=Decimal("30.00"),
                rate_per_kg=Decimal("10.00"),
                version=1,
                is_active=True,
            ),
            RateCard(
                order_type=OrderTypeEnum.B2B,
                zone_type=ZoneRelationEnum.INTER,
                base_fee=Decimal("45.00"),
                rate_per_kg=Decimal("12.00"),
                version=1,
                is_active=True,
            ),
        ]
        db.add_all(rate_cards)

        cod_surcharges = [
            CODSurcharge(
                order_type=OrderTypeEnum.B2C,
                flat_amount=Decimal("25.00"),
                percent_of_base=Decimal("2.5"),
                is_active=True,
            ),
            CODSurcharge(
                order_type=OrderTypeEnum.B2B,
                flat_amount=Decimal("50.00"),
                percent_of_base=Decimal("1.5"),
                is_active=True,
            ),
        ]
        db.add_all(cod_surcharges)
        db.flush()

        # -------------------------------------------------------------------
        # 5. Orders & Timelines
        # -------------------------------------------------------------------
        print("📦 Seeding Demo Orders across all states...")

        # Order 1: DELIVERED (B2C INTRA in Delhi)
        # 30x20x15 = 9000/5000 = 1.8 kg. Actual: 2.5 kg. Chargeable: 2.5 kg
        # Base: 40 + (15 * 2.5) = 77.50. Prepaid -> Total: 77.50
        order_delivered = Order(
            customer_id=b2c_customer.id,
            agent_id=agent_1.id,
            pickup_address="Block B, Connaught Place, New Delhi",
            pickup_pincode="110001",
            pickup_zone_id=zone_north.id,
            pickup_latitude=28.6315,
            pickup_longitude=77.2167,
            drop_address="Green Park Extension, South Delhi",
            drop_pincode="110016",
            drop_zone_id=zone_north.id,
            drop_latitude=28.5580,
            drop_longitude=77.2030,
            length_cm=Decimal("30"),
            breadth_cm=Decimal("20"),
            height_cm=Decimal("15"),
            actual_weight_kg=Decimal("2.5"),
            volumetric_weight_kg=Decimal("1.80"),
            chargeable_weight_kg=Decimal("2.50"),
            base_charge=Decimal("77.50"),
            cod_charge=Decimal("0.00"),
            total_charge=Decimal("77.50"),
            rate_card_id=rate_cards[0].id,
            zone_type=ZoneRelationEnum.INTRA,
            order_type=OrderTypeEnum.B2C,
            payment_type=PaymentTypeEnum.PREPAID,
            status=OrderStatusEnum.DELIVERED,
            created_at=now - timedelta(hours=6),
            updated_at=now - timedelta(hours=1),
        )
        db.add(order_delivered)
        db.flush()

        # History for Order 1
        db.add_all([
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status=None,
                new_status="CREATED",
                changed_by=b2c_customer.id,
                reason="Order placed by customer",
                created_at=now - timedelta(hours=6),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="CREATED",
                new_status="ASSIGNED",
                changed_by=admin.id,
                reason="Auto-assigned to nearest agent in Delhi NCR (Vikram Singh, 1.2km)",
                created_at=now - timedelta(hours=5, minutes=45),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="ASSIGNED",
                new_status="PICKED_UP",
                changed_by=agent_user_1.id,
                reason="Package picked up from Connaught Place",
                created_at=now - timedelta(hours=4),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="PICKED_UP",
                new_status="IN_TRANSIT",
                changed_by=agent_user_1.id,
                reason="Package en route to Green Park",
                created_at=now - timedelta(hours=3),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="IN_TRANSIT",
                new_status="OUT_FOR_DELIVERY",
                changed_by=agent_user_1.id,
                reason="Agent out for delivery at recipient location",
                created_at=now - timedelta(hours=2),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="OUT_FOR_DELIVERY",
                new_status="DELIVERED",
                changed_by=agent_user_1.id,
                reason="Package delivered to security desk with OTP verification",
                created_at=now - timedelta(hours=1),
            ),
        ])
        db.add(DeliveryAttempt(
            order_id=order_delivered.id,
            attempt_number=1,
            agent_id=agent_1.id,
            started_at=now - timedelta(hours=2),
            completed_at=now - timedelta(hours=1),
            status=DeliveryAttemptStatusEnum.DELIVERED,
            created_at=now - timedelta(hours=5, minutes=45),
        ))

        # Order 2: FAILED & RESCHEDULED (B2C INTER: Delhi -> Mumbai)
        # 50x40x30 = 12 kg volumetric. Actual: 8kg. Chargeable: 12kg (Canonical test case)
        # Base: 50 + (20 * 12) = 290. COD: 25 + 2.5%*290 = 32.25. Total: 322.25
        order_failed = Order(
            customer_id=b2c_customer.id,
            agent_id=None,  # Unassigned pending reassignment
            pickup_address="Tower 4, Okhla Phase 3, Delhi",
            pickup_pincode="110020",
            pickup_zone_id=zone_north.id,
            pickup_latitude=28.5245,
            pickup_longitude=77.2790,
            drop_address="Hiranandani Gardens, Powai, Mumbai",
            drop_pincode="400076",
            drop_zone_id=zone_south.id,
            drop_latitude=19.1176,
            drop_longitude=72.9060,
            length_cm=Decimal("50"),
            breadth_cm=Decimal("40"),
            height_cm=Decimal("30"),
            actual_weight_kg=Decimal("8.0"),
            volumetric_weight_kg=Decimal("12.00"),
            chargeable_weight_kg=Decimal("12.00"),
            base_charge=Decimal("290.00"),
            cod_charge=Decimal("32.25"),
            total_charge=Decimal("322.25"),
            rate_card_id=rate_cards[1].id,
            zone_type=ZoneRelationEnum.INTER,
            order_type=OrderTypeEnum.B2C,
            payment_type=PaymentTypeEnum.COD,
            status=OrderStatusEnum.RESCHEDULED,
            scheduled_date=now + timedelta(days=1),
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=2),
        )
        db.add(order_failed)
        db.flush()

        db.add_all([
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status=None,
                new_status="CREATED",
                changed_by=b2c_customer.id,
                reason="Order placed with COD payment",
                created_at=now - timedelta(days=1),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="CREATED",
                new_status="ASSIGNED",
                changed_by=admin.id,
                reason="Assigned to Mumbai Agent Amit Kumar",
                created_at=now - timedelta(hours=18),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="ASSIGNED",
                new_status="PICKED_UP",
                changed_by=agent_user_3.id,
                reason="Hub handoff completed",
                created_at=now - timedelta(hours=12),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="PICKED_UP",
                new_status="IN_TRANSIT",
                changed_by=agent_user_3.id,
                reason="Arrived at Mumbai Powai delivery center",
                created_at=now - timedelta(hours=8),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="IN_TRANSIT",
                new_status="OUT_FOR_DELIVERY",
                changed_by=agent_user_3.id,
                reason="First delivery attempt",
                created_at=now - timedelta(hours=5),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="OUT_FOR_DELIVERY",
                new_status="FAILED",
                changed_by=agent_user_3.id,
                reason="Customer unavailable at delivery address; phone switched off",
                created_at=now - timedelta(hours=4),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="FAILED",
                new_status="RESCHEDULED",
                changed_by=b2c_customer.id,
                reason="Customer requested rescheduled delivery for tomorrow afternoon",
                created_at=now - timedelta(hours=2),
            ),
        ])
        db.add(DeliveryAttempt(
            order_id=order_failed.id,
            attempt_number=1,
            agent_id=agent_3.id,
            started_at=now - timedelta(hours=5),
            completed_at=now - timedelta(hours=4),
            status=DeliveryAttemptStatusEnum.FAILED,
            failure_reason="Customer unavailable at delivery address; phone switched off",
            created_at=now - timedelta(hours=18),
        ))

        # Order 3: IN_TRANSIT (B2B INTRA: Delhi CP -> Laxmi Nagar)
        order_intransit = Order(
            customer_id=b2b_customer.id,
            agent_id=agent_2.id,
            pickup_address="Warehouse 2, Connaught Place, Delhi",
            pickup_pincode="110001",
            pickup_zone_id=zone_north.id,
            drop_address="Retail Hub, Laxmi Nagar, East Delhi",
            drop_pincode="110092",
            drop_zone_id=zone_north.id,
            length_cm=Decimal("40"),
            breadth_cm=Decimal("30"),
            height_cm=Decimal("20"),
            actual_weight_kg=Decimal("15.0"),
            volumetric_weight_kg=Decimal("4.80"),
            chargeable_weight_kg=Decimal("15.00"),
            base_charge=Decimal("180.00"),  # 30 + (10 * 15)
            cod_charge=Decimal("0.00"),
            total_charge=Decimal("180.00"),
            rate_card_id=rate_cards[2].id,
            zone_type=ZoneRelationEnum.INTRA,
            order_type=OrderTypeEnum.B2B,
            payment_type=PaymentTypeEnum.PREPAID,
            status=OrderStatusEnum.IN_TRANSIT,
            created_at=now - timedelta(hours=3),
            updated_at=now - timedelta(hours=1),
        )
        db.add(order_intransit)
        db.flush()

        db.add_all([
            OrderStatusHistory(
                order_id=order_intransit.id,
                previous_status=None,
                new_status="CREATED",
                changed_by=b2b_customer.id,
                reason="Bulk merchant shipment created",
                created_at=now - timedelta(hours=3),
            ),
            OrderStatusHistory(
                order_id=order_intransit.id,
                previous_status="CREATED",
                new_status="ASSIGNED",
                changed_by=admin.id,
                reason="Auto-assigned to Agent Rahul Sharma",
                created_at=now - timedelta(hours=2, minutes=30),
            ),
            OrderStatusHistory(
                order_id=order_intransit.id,
                previous_status="ASSIGNED",
                new_status="PICKED_UP",
                changed_by=agent_user_2.id,
                reason="Picked up from CP warehouse",
                created_at=now - timedelta(hours=1, minutes=45),
            ),
            OrderStatusHistory(
                order_id=order_intransit.id,
                previous_status="PICKED_UP",
                new_status="IN_TRANSIT",
                changed_by=agent_user_2.id,
                reason="Crossing ITO bridge towards Laxmi Nagar",
                created_at=now - timedelta(hours=1),
            ),
        ])
        db.add(DeliveryAttempt(
            order_id=order_intransit.id,
            attempt_number=1,
            agent_id=agent_2.id,
            started_at=now - timedelta(hours=1, minutes=45),
            status=DeliveryAttemptStatusEnum.IN_PROGRESS,
            created_at=now - timedelta(hours=2, minutes=30),
        ))

        # Order 4: CREATED (Ready for live evaluator Auto-Assignment demo)
        order_created = Order(
            customer_id=b2c_customer.id,
            agent_id=None,
            pickup_address="Block C, Connaught Place, New Delhi",
            pickup_pincode="110001",
            pickup_zone_id=zone_north.id,
            pickup_latitude=28.6328,
            pickup_longitude=77.2197,
            drop_address="Saket District Centre, New Delhi",
            drop_pincode="110016",
            drop_zone_id=zone_north.id,
            drop_latitude=28.5284,
            drop_longitude=77.2185,
            length_cm=Decimal("25"),
            breadth_cm=Decimal("15"),
            height_cm=Decimal("10"),
            actual_weight_kg=Decimal("1.2"),
            volumetric_weight_kg=Decimal("0.75"),
            chargeable_weight_kg=Decimal("1.20"),
            base_charge=Decimal("58.00"),  # 40 + (15 * 1.2)
            cod_charge=Decimal("0.00"),
            total_charge=Decimal("58.00"),
            rate_card_id=rate_cards[0].id,
            zone_type=ZoneRelationEnum.INTRA,
            order_type=OrderTypeEnum.B2C,
            payment_type=PaymentTypeEnum.PREPAID,
            status=OrderStatusEnum.CREATED,
            created_at=now - timedelta(minutes=15),
        )
        db.add(order_created)
        db.flush()

        db.add(OrderStatusHistory(
            order_id=order_created.id,
            previous_status=None,
            new_status="CREATED",
            changed_by=b2c_customer.id,
            reason="Fresh order awaiting assignment",
            created_at=now - timedelta(minutes=15),
        ))

        db.commit()
        print("✅ Database successfully seeded with demo accounts, zones, rate cards, and orders!")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
