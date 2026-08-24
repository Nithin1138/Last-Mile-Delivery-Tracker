export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export type OrderStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RESCHEDULED'
  | 'CANCELLED';

export type OrderType = 'B2B' | 'B2C';
export type PaymentType = 'PREPAID' | 'COD';
export type AgentAvailability = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Zone {
  id: string;
  name: string;
  is_active: boolean;
  area_count?: number;
}

export interface Area {
  id: string;
  pincode: string;
  name?: string;
  zone_id: string;
  zone_name?: string;
  is_active: boolean;
}

export interface RateCard {
  id: string;
  order_type: OrderType;
  zone_type: 'INTRA' | 'INTER';
  base_fee: number;
  rate_per_kg: number;
  is_active: boolean;
  version: number;
  effective_from?: string;
  effective_to?: string;
}

export interface CODSurcharge {
  id: string;
  order_type: OrderType;
  flat_amount: number;
  percent_of_base: number;
  is_active: boolean;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  availability_status: AgentAvailability;
  max_capacity: number;
  current_load: number;
  latitude?: number;
  longitude?: number;
  current_zone_id?: string;
  current_zone_name?: string;
  is_active: boolean;
}

export interface PriceQuote {
  actual_weight_kg: number;
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
  pickup_zone_name: string;
  drop_zone_name: string;
  zone_type: string;
  order_type: string;
  rate_card_id: string;
  rate_card_version: number;
  base_fee: number;
  rate_per_kg: number;
  weight_charge: number;
  base_charge: number;
  cod_applicable: boolean;
  cod_flat: number;
  cod_percent: number;
  cod_charge: number;
  total_charge: number;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name?: string;
  agent_id?: string;
  agent_name?: string;
  pickup_address: string;
  pickup_pincode: string;
  pickup_zone_name?: string;
  drop_address: string;
  drop_pincode: string;
  drop_zone_name?: string;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  actual_weight_kg: number;
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
  base_charge: number;
  cod_charge: number;
  total_charge: number;
  zone_type?: string;
  order_type: OrderType;
  payment_type: PaymentType;
  status: OrderStatus;
  scheduled_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface TimelineEntry {
  id: string;
  previous_status?: string;
  new_status: string;
  changed_by?: string;
  actor_name?: string;
  reason?: string;
  created_at: string;
}

export interface DeliveryAttempt {
  id: string;
  order_id: string;
  attempt_number: number;
  agent_id?: string;
  agent_name?: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'FAILED';
  failure_reason?: string;
  created_at: string;
}

export interface AssignmentCandidate {
  agent_id: string;
  agent_name: string;
  distance_km: number | null;
  zone_match: boolean;
  availability: string;
  current_load: number;
  max_capacity: number;
}

export interface AssignmentDecision {
  id: string;
  order_id: string;
  selected_agent_id?: string;
  selected_agent_name?: string;
  selection_mode: 'AUTO' | 'MANUAL';
  candidate_count: number;
  selected_distance_km?: number;
  pickup_zone_name?: string;
  selected_agent_zone_name?: string;
  reason?: string;
  candidates?: AssignmentCandidate[];
  created_at: string;
}

export interface DashboardMetrics {
  total_orders: number;
  orders_by_status: Record<string, number>;
  delivered_today: number;
  failed_today: number;
  agents: Record<string, number>;
  total_agents: number;
  avg_delivery_time_hours?: number;
  recent_activity: Array<{
    id: string;
    order_id: string;
    previous_status?: string;
    new_status: string;
    actor_name?: string;
    reason?: string;
    created_at: string;
  }>;
}

export interface NotificationRecord {
  id: string;
  order_id?: string;
  notification_type: string;
  channel: 'EMAIL' | string;
  subject?: string;
  body: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  error_message?: string;
  created_at: string;
}


