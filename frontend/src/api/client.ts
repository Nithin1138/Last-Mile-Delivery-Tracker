import axios from 'axios';
import type {
  AuthResponse,
  Order,
  PriceQuote,
  TimelineEntry,
  DeliveryAttempt,
  AssignmentDecision,
  DashboardMetrics,
  Agent,
  Zone,
  Area,
  RateCard,
  CODSurcharge,
  NotificationRecord,
} from '../types';

let rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
if (rawBase && !rawBase.startsWith('http://') && !rawBase.startsWith('https://') && !rawBase.startsWith('/')) {
  rawBase = `https://${rawBase}`;
}
const API_BASE = rawBase
  ? rawBase.endsWith('/api')
    ? rawBase
    : `${rawBase.replace(/\/+$/, '')}/api`
  : '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token if stored
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Format structured API error message
export function extractErrorMessage(error: any): string {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.response?.data?.detail) {
    if (typeof error.response.data.detail === 'string') {
      return error.response.data.detail;
    }
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ');
    }
  }
  return error.message || 'An unexpected error occurred';
}

// --------------------------------------------------------------------------
// Auth API
// --------------------------------------------------------------------------
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },
  register: async (payload: { email: string; password: string; name: string; phone?: string; role?: string }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', payload);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  updateMe: async (payload: { name?: string; phone?: string }) => {
    const res = await apiClient.put('/auth/me', payload);
    return res.data;
  },
  forgotPassword: async (email: string): Promise<{ message: string; status: string }> => {
    const res = await apiClient.post<{ message: string; status: string }>('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (payload: { email: string; otp_code: string; new_password: string }): Promise<{ message: string; status: string }> => {
    const res = await apiClient.post<{ message: string; status: string }>('/auth/reset-password', payload);
    return res.data;
  },
};


// --------------------------------------------------------------------------
// Pricing & Orders API
// --------------------------------------------------------------------------
export const ordersApi = {
  getQuote: async (payload: {
    pickup_pincode: string;
    drop_pincode: string;
    length_cm: number;
    breadth_cm: number;
    height_cm: number;
    actual_weight_kg: number;
    order_type: string;
    payment_type: string;
  }): Promise<PriceQuote> => {
    const res = await apiClient.post<PriceQuote>('/orders/quote', payload);
    return res.data;
  },

  createOrder: async (payload: any): Promise<Order> => {
    const res = await apiClient.post<Order>('/orders', payload);
    return res.data;
  },

  listOrders: async (params?: {
    status?: string;
    zone_id?: string;
    agent_id?: string;
    customer_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ orders: Order[]; total: number; page: number; page_size: number }> => {
    const res = await apiClient.get('/orders', { params });
    return res.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const res = await apiClient.get<Order>(`/orders/${id}`);
    return res.data;
  },

  updateStatus: async (id: string, payload: { status: string; reason?: string; failure_reason?: string; admin_override?: boolean }) => {
    const res = await apiClient.post(`/orders/${id}/status`, payload);
    return res.data;
  },

  assignAgent: async (id: string, payload: { mode: 'auto' | 'manual'; agent_id?: string }) => {
    const res = await apiClient.post(`/orders/${id}/assign`, payload);
    return res.data;
  },

  rescheduleOrder: async (id: string, payload: { new_scheduled_date: string; reason?: string }) => {
    const res = await apiClient.post(`/orders/${id}/reschedule`, payload);
    return res.data;
  },

  getTimeline: async (id: string): Promise<TimelineEntry[]> => {
    const res = await apiClient.get<TimelineEntry[]>(`/orders/${id}/timeline`);
    return res.data;
  },

  getAttempts: async (id: string): Promise<DeliveryAttempt[]> => {
    const res = await apiClient.get<DeliveryAttempt[]>(`/orders/${id}/attempts`);
    return res.data;
  },

  getAssignments: async (id: string): Promise<AssignmentDecision[]> => {
    const res = await apiClient.get<AssignmentDecision[]>(`/orders/${id}/assignments`);
    return res.data;
  },

  getNotifications: async (id: string): Promise<NotificationRecord[]> => {
    const res = await apiClient.get<NotificationRecord[]>(`/orders/${id}/notifications`);
    return res.data;
  },
};

// --------------------------------------------------------------------------
// Admin API
// --------------------------------------------------------------------------
export const adminApi = {
  getDashboard: async (): Promise<DashboardMetrics> => {
    const res = await apiClient.get<DashboardMetrics>('/admin/dashboard');
    return res.data;
  },

  listZones: async (): Promise<Zone[]> => {
    const res = await apiClient.get<Zone[]>('/admin/zones');
    return res.data;
  },

  createZone: async (name: string): Promise<Zone> => {
    const res = await apiClient.post<Zone>('/admin/zones', { name });
    return res.data;
  },

  listAreas: async (zone_id?: string): Promise<Area[]> => {
    const res = await apiClient.get<Area[]>('/admin/areas', { params: { zone_id } });
    return res.data;
  },

  createArea: async (payload: { pincode: string; name?: string; zone_id: string }): Promise<Area> => {
    const res = await apiClient.post<Area>('/admin/areas', payload);
    return res.data;
  },

  listRateCards: async (): Promise<RateCard[]> => {
    const res = await apiClient.get<RateCard[]>('/admin/rate-cards');
    return res.data;
  },

  createRateCard: async (payload: { order_type: string; zone_type: string; base_fee: number; rate_per_kg: number }): Promise<RateCard> => {
    const res = await apiClient.post<RateCard>('/admin/rate-cards', payload);
    return res.data;
  },

  updateRateCard: async (id: string, payload: { base_fee?: number; rate_per_kg?: number }): Promise<RateCard> => {
    const res = await apiClient.put<RateCard>(`/admin/rate-cards/${id}`, payload);
    return res.data;
  },

  listCODSurcharges: async (): Promise<CODSurcharge[]> => {
    const res = await apiClient.get<CODSurcharge[]>('/admin/cod-surcharges');
    return res.data;
  },

  createCODSurcharge: async (payload: { order_type: string; flat_amount: number; percent_of_base: number }): Promise<CODSurcharge> => {
    const res = await apiClient.post<CODSurcharge>('/admin/cod-surcharges', payload);
    return res.data;
  },

  listAgents: async (): Promise<Agent[]> => {
    const res = await apiClient.get<Agent[]>('/admin/agents');
    return res.data;
  },

  createAgent: async (payload: any): Promise<Agent> => {
    const res = await apiClient.post<Agent>('/admin/agents', payload);
    return res.data;
  },

  updateAgent: async (id: string, payload: any): Promise<Agent> => {
    const res = await apiClient.patch<Agent>(`/admin/agents/${id}`, payload);
    return res.data;
  },
};

// --------------------------------------------------------------------------
// Agent Self API
// --------------------------------------------------------------------------
export const agentSelfApi = {
  getSelf: async (): Promise<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone?: string;
    availability_status: string;
    max_capacity: number;
    current_load: number;
    latitude?: number;
    longitude?: number;
    current_zone_id?: string;
    current_zone_name?: string;
  }> => {
    const res = await apiClient.get('/agents/me');
    return res.data;
  },
  listZones: async (): Promise<Zone[]> => {
    const res = await apiClient.get<Zone[]>('/agents/zones');
    return res.data;
  },
  updateSelf: async (payload: { availability_status?: string; latitude?: number; longitude?: number; zone_id?: string }) => {
    const res = await apiClient.put('/agents/me', payload);
    return res.data;
  },
};
