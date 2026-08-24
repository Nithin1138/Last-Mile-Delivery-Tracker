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
        print("👤 Seeding Users")
        admin = User(
            email="admin@lastmile.dev",
            password_hash=hash_password("admin123"),
            name="Veera Nithin (Operations Admin)",
            phone="+919876543210",
            role=RoleEnum.ADMIN,
        )

        b2b_customer = User(
            email="pujitha.logistics@andhraexports.in",
            password_hash=hash_password("customer123"),
            name="Pujitha Rao (Andhra Exports & Logistics)",
            phone="+919811122233",
            role=RoleEnum.CUSTOMER,
        )

        b2c_customer = User(
            email="alekhya.reddy@gmail.com",
            password_hash=hash_password("customer123"),
            name="Alekhya Reddy",
            phone="+919822233344",
            role=RoleEnum.CUSTOMER,
        )

        agent_user_1 = User(
            email="babu.naidu@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Babu Naidu",
            phone="+919833344455",
            role=RoleEnum.AGENT,
        )

        agent_user_2 = User(
            email="srinivas.rao@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Srinivas Rao",
            phone="+919844455566",
            role=RoleEnum.AGENT,
        )

        agent_user_3 = User(
            email="kalyan.varma@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Kalyan Varma",
            phone="+919855566677",
            role=RoleEnum.AGENT,
        )

        agent_user_4 = User(
            email="ananya.chowdary@delivery.dev",
            password_hash=hash_password("agent123"),
            name="Ananya Chowdary",
            phone="+919866677788",
            role=RoleEnum.AGENT,
        )

        db.add_all([admin, b2b_customer, b2c_customer, agent_user_1, agent_user_2, agent_user_3, agent_user_4])
        db.flush()

        # -------------------------------------------------------------------
        # 2. Zones & Areas (Hyderabad / Cyberabad, Vijayawada / Guntur, Visakhapatnam)
        # -------------------------------------------------------------------
        print("🗺️ Seeding Zones & Pincode Areas...")
        zone_north = Zone(name="North (Hyderabad / Cyberabad Hub)")
        zone_south = Zone(name="South (Vijayawada / Guntur Metro)")
        zone_east = Zone(name="East (Visakhapatnam Port City Hub)")
        db.add_all([zone_north, zone_south, zone_east])
        db.flush()

        areas = [
            # Hyderabad / Cyberabad (North)
            Area(pincode="500001", name="Abids / Charminar, Hyderabad", zone_id=zone_north.id),
            Area(pincode="500081", name="HITEC City / Madhapur, Cyberabad", zone_id=zone_north.id),
            Area(pincode="500034", name="Banjara Hills / Jubilee Hills, Hyderabad", zone_id=zone_north.id),
            Area(pincode="500090", name="Kukatpally / KPHB Colony, Hyderabad", zone_id=zone_north.id),
            # Vijayawada / Guntur (South)
            Area(pincode="520001", name="Governorpet / One Town, Vijayawada", zone_id=zone_south.id),
            Area(pincode="520010", name="Benz Circle / MG Road, Vijayawada", zone_id=zone_south.id),
            Area(pincode="522002", name="Arundelpet / Brodipet, Guntur", zone_id=zone_south.id),
            # Visakhapatnam (East)
            Area(pincode="530001", name="Main Road / Port Area, Visakhapatnam", zone_id=zone_east.id),
            Area(pincode="530017", name="MVP Colony, Visakhapatnam", zone_id=zone_east.id),
            Area(pincode="530045", name="Gajuwaka Industrial Hub, Visakhapatnam", zone_id=zone_east.id),
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
            latitude=17.4485,  # Madhapur / HITEC City, Hyderabad
            longitude=78.3750,
            current_zone_id=zone_north.id,
        )

        agent_2 = DeliveryAgent(
            user_id=agent_user_2.id,
            availability_status=AgentStatusEnum.BUSY,
            max_capacity=5,
            current_load=2,
            latitude=17.4123,  # Banjara Hills, Hyderabad
            longitude=78.4350,
            current_zone_id=zone_north.id,
        )

        agent_3 = DeliveryAgent(
            user_id=agent_user_3.id,
            availability_status=AgentStatusEnum.AVAILABLE,
            max_capacity=5,
            current_load=0,
            latitude=16.5062,  # Benz Circle, Vijayawada
            longitude=80.6480,
            current_zone_id=zone_south.id,
        )

        agent_4 = DeliveryAgent(
            user_id=agent_user_4.id,
            availability_status=AgentStatusEnum.OFFLINE,
            max_capacity=5,
            current_load=0,
            latitude=17.6868,  # MVP Colony, Visakhapatnam
            longitude=83.2185,
            current_zone_id=zone_east.id,
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

        # Order 1: DELIVERED (B2C INTRA in Hyderabad)
        # 30x20x15 = 9000/5000 = 1.8 kg. Actual: 2.5 kg. Chargeable: 2.5 kg
        # Base: 40 + (15 * 2.5) = 77.50. Prepaid -> Total: 77.50
        order_delivered = Order(
            customer_id=b2c_customer.id,
            agent_id=agent_1.id,
            pickup_address="Cyber Towers, HITEC City, Hyderabad",
            pickup_pincode="500081",
            pickup_zone_id=zone_north.id,
            pickup_latitude=17.4485,
            pickup_longitude=78.3750,
            drop_address="Road No. 36, Jubilee Hills, Hyderabad",
            drop_pincode="500034",
            drop_zone_id=zone_north.id,
            drop_latitude=17.4320,
            drop_longitude=78.4070,
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
                reason="Order placed by customer (Alekhya Reddy)",
                created_at=now - timedelta(hours=6),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="CREATED",
                new_status="ASSIGNED",
                changed_by=admin.id,
                reason="Auto-assigned to nearest agent in Hyderabad Hub (Babu Naidu, 1.2km)",
                created_at=now - timedelta(hours=5, minutes=45),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="ASSIGNED",
                new_status="PICKED_UP",
                changed_by=agent_user_1.id,
                reason="Package picked up from Cyber Towers, HITEC City",
                created_at=now - timedelta(hours=4),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="PICKED_UP",
                new_status="IN_TRANSIT",
                changed_by=agent_user_1.id,
                reason="Package en route to Jubilee Hills",
                created_at=now - timedelta(hours=3),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="IN_TRANSIT",
                new_status="OUT_FOR_DELIVERY",
                changed_by=agent_user_1.id,
                reason="Agent Babu Naidu out for delivery at recipient residence",
                created_at=now - timedelta(hours=2),
            ),
            OrderStatusHistory(
                order_id=order_delivered.id,
                previous_status="OUT_FOR_DELIVERY",
                new_status="DELIVERED",
                changed_by=agent_user_1.id,
                reason="Package delivered with customer OTP verification",
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

        # Order 2: FAILED & RESCHEDULED (B2C INTER: Hyderabad -> Vijayawada)
        # 50x40x30 = 12 kg volumetric. Actual: 8kg. Chargeable: 12kg (Canonical test case)
        # Base: 50 + (20 * 12) = 290. COD: 25 + 2.5%*290 = 32.25. Total: 322.25
        order_failed = Order(
            customer_id=b2c_customer.id,
            agent_id=None,  # Unassigned pending reassignment
            pickup_address="KPHB Colony Phase 3, Kukatpally, Hyderabad",
            pickup_pincode="500090",
            pickup_zone_id=zone_north.id,
            pickup_latitude=17.4930,
            pickup_longitude=78.4010,
            drop_address="Benz Circle, MG Road, Vijayawada",
            drop_pincode="520010",
            drop_zone_id=zone_south.id,
            drop_latitude=16.5062,
            drop_longitude=80.6480,
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
                reason="Assigned to Vijayawada Agent Kalyan Varma",
                created_at=now - timedelta(hours=18),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="ASSIGNED",
                new_status="PICKED_UP",
                changed_by=agent_user_3.id,
                reason="Hub handoff completed at Vijayawada Central",
                created_at=now - timedelta(hours=12),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="PICKED_UP",
                new_status="IN_TRANSIT",
                changed_by=agent_user_3.id,
                reason="Arrived at Benz Circle delivery center",
                created_at=now - timedelta(hours=8),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="IN_TRANSIT",
                new_status="OUT_FOR_DELIVERY",
                changed_by=agent_user_3.id,
                reason="First delivery attempt by Kalyan Varma",
                created_at=now - timedelta(hours=5),
            ),
            OrderStatusHistory(
                order_id=order_failed.id,
                previous_status="OUT_FOR_DELIVERY",
                new_status="FAILED",
                changed_by=agent_user_3.id,
                reason="Customer unavailable at delivery address; phone unreachable",
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
            failure_reason="Customer unavailable at delivery address; phone unreachable",
            created_at=now - timedelta(hours=18),
        ))

        # Order 3: IN_TRANSIT (B2B INTRA: Hyderabad Abids -> Madhapur)
        order_intransit = Order(
            customer_id=b2b_customer.id,
            agent_id=agent_2.id,
            pickup_address="Warehouse 2, Abids Commercial Hub, Hyderabad",
            pickup_pincode="500001",
            pickup_zone_id=zone_north.id,
            drop_address="Logistics Terminal, Madhapur, Hyderabad",
            drop_pincode="500081",
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
                reason="Bulk merchant shipment created by Pujitha Rao",
                created_at=now - timedelta(hours=3),
            ),
            OrderStatusHistory(
                order_id=order_intransit.id,
                previous_status="CREATED",
                new_status="ASSIGNED",
                changed_by=admin.id,
                reason="Auto-assigned to Agent Srinivas Rao",
                created_at=now - timedelta(hours=2, minutes=30),
            ),
            OrderStatusHistory(
                order_id=order_intransit.id,
                previous_status="ASSIGNED",
                new_status="PICKED_UP",
                changed_by=agent_user_2.id,
                reason="Picked up from Abids warehouse",
                created_at=now - timedelta(hours=1, minutes=45),
            ),
            OrderStatusHistory(
                order_id=order_intransit.id,
                previous_status="PICKED_UP",
                new_status="IN_TRANSIT",
                changed_by=agent_user_2.id,
                reason="En route via PVNR Expressway towards Madhapur",
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
            pickup_address="Inorbit Mall Road, Madhapur, Cyberabad",
            pickup_pincode="500081",
            pickup_zone_id=zone_north.id,
            pickup_latitude=17.4360,
            pickup_longitude=78.3840,
            drop_address="Road No. 1, Banjara Hills, Hyderabad",
            drop_pincode="500034",
            drop_zone_id=zone_north.id,
            drop_latitude=17.4150,
            drop_longitude=78.4480,
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
            reason="Fresh order awaiting automated dispatch",
            created_at=now - timedelta(minutes=15),
        ))

        db.commit()
        print("✅ Database successfully seeded with Telugu demo accounts, zones, rate cards, and orders!")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()

