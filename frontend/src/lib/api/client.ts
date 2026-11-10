import {
  FleetOverviewResponse,
  PackListResponse,
  PackLiveState,
  PackHistoryResponse,
  DetailedAlert,
  WorkOrder,
  DeviceModuleItem,
  FirmwareProfileMapping,
} from "../types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/v1";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error [${res.status}]: ${errText}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`Failed to fetch ${url}:`, err.message);
    throw err;
  }
}

export const api = {
  // Fleet
  getFleetOverview: (fleetId = 1): Promise<FleetOverviewResponse> =>
    fetchJson<FleetOverviewResponse>(`/fleets/${fleetId}/overview`),

  // Packs
  getPacks: (params?: {
    q?: string;
    grade?: string;
    chemistry?: string;
    connectivity?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }): Promise<PackListResponse> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          query.set(k, String(v));
        }
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchJson<PackListResponse>(`/packs${qs}`);
  },

  getPackLiveState: (serial: string): Promise<PackLiveState> =>
    fetchJson<PackLiveState>(`/packs/${encodeURIComponent(serial)}/live`),

  getPackHistory: (serial: string): Promise<PackHistoryResponse> =>
    fetchJson<PackHistoryResponse>(`/packs/${encodeURIComponent(serial)}/history`),

  runDiagnostics: (serial: string): Promise<any> =>
    fetchJson(`/packs/${encodeURIComponent(serial)}/diagnostics/run`, {
      method: "POST",
    }),

  registerPack: (payload: any): Promise<any> =>
    fetchJson("/packs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Alerts
  getAlerts: (params?: {
    severity?: string;
    status?: string;
    assignee?: string;
  }): Promise<DetailedAlert[]> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.set(k, v);
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchJson<DetailedAlert[]>(`/alerts${qs}`);
  },

  acknowledgeAlert: (alertId: string): Promise<DetailedAlert> =>
    fetchJson<DetailedAlert>(`/alerts/${alertId}/acknowledge`, {
      method: "POST",
    }),

  assignAlert: (
    alertId: string,
    payload: {
      assign_to: string;
      priority?: string;
      due_date?: string;
      notes?: string;
      escalate_to_evraid?: boolean;
    }
  ): Promise<DetailedAlert> =>
    fetchJson<DetailedAlert>(`/alerts/${alertId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getWorkOrders: (): Promise<WorkOrder[]> =>
    fetchJson<WorkOrder[]>("/alerts/work-orders"),

  // Devices
  getModules: (): Promise<DeviceModuleItem[]> =>
    fetchJson<DeviceModuleItem[]>("/devices/modules"),

  linkModule: (payload: { pack_serial: string; imei: string; iccid?: string }): Promise<DeviceModuleItem> =>
    fetchJson<DeviceModuleItem>("/devices/modules/link", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Reports
  getMonthlyReport: (fleetId = 1): Promise<any> =>
    fetchJson(`/reports/monthly?fleet_id=${fleetId}`),

  // Admin
  getFirmwareMappings: (): Promise<FirmwareProfileMapping[]> =>
    fetchJson<FirmwareProfileMapping[]>("/admin/mappings"),

  updateFirmwareMapping: (mapping: FirmwareProfileMapping): Promise<FirmwareProfileMapping> =>
    fetchJson<FirmwareProfileMapping>("/admin/mappings", {
      method: "PUT",
      body: JSON.stringify(mapping),
    }),
};

