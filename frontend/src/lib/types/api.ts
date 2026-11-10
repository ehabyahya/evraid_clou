// Types matching backend Pydantic models

export type HealthGrade = "A" | "B" | "C" | "D";
export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";
export type ConnectivityMode = "BLE_ONLY" | "LTEM_ACTIVE";
export type BatteryChemistry = "LFP" | "NMC";

export interface OnlineKpi {
  online: number;
  total: number;
  pct_reported_today: number;
}

export interface SohKpi {
  value: number;
  delta_90d: number;
}

export interface OpenAlertsKpi {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export interface NeedChargingKpi {
  count: number;
  threshold_pct: number;
}

export interface EfcKpi {
  value: number;
  highest_pack: number;
}

export interface OverviewKpis {
  packs_online: OnlineKpi;
  avg_soh: SohKpi;
  open_alerts: OpenAlertsKpi;
  need_charging: NeedChargingKpi;
  avg_efc: EfcKpi;
}

export interface HealthGradeBar {
  grade: HealthGrade;
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface MonthlySohTrendPoint {
  month: string;
  avg_soh: number;
}

export interface CriticalAlertOverviewItem {
  id: string;
  pack_serial: string;
  alert_name: string;
  sensor_label?: string;
  severity: AlertSeverity;
  age_str: string;
  status: string;
  raised_at: string;
}

export interface PackNeedingAttentionItem {
  pack_serial: string;
  soh_pct: number;
  cycles: number;
  health_grade: HealthGrade;
  imbalance_mv: number;
  status: string;
  vehicle_id?: string;
}

export interface FleetOverviewResponse {
  fleet_id: number;
  fleet_name: string;
  operator_name: string;
  updated_at: string;
  kpis: OverviewKpis;
  health_grades: HealthGradeBar[];
  soh_12m_trend: MonthlySohTrendPoint[];
  open_critical_alerts: CriticalAlertOverviewItem[];
  packs_needing_attention: PackNeedingAttentionItem[];
}

export interface PackLocation {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  source: "PHONE_GPS" | "MODULE_GNSS";
  fix_age_s: number;
  address_snippet?: string;
}

export interface PackListItem {
  pack_serial: string;
  ble_adv_name?: string;
  vehicle_id?: string;
  module_imei?: string;
  commercial_name: string;
  chemistry: BatteryChemistry;
  series_count: number;
  rated_capacity_ah: number;
  connectivity_mode: ConnectivityMode;
  health_grade: HealthGrade;
  soc_pct: number;
  soh_pct: number;
  pack_voltage_v: number;
  pack_current_a: number;
  imbalance_mv: number;
  max_temperature_c: number;
  equivalent_cycles: number;
  active_critical_alerts: number;
  active_warning_alerts: number;
  warranty_status: string;
  last_seen_utc: string;
  location?: PackLocation;
}

export interface PackListResponse {
  total: number;
  page: number;
  page_size: number;
  items: PackListItem[];
}

export interface DetectedAlert {
  pack_serial: string;
  condition_type: string;
  severity: AlertSeverity;
  message: string;
  sensor_label?: string;
  measured_value: number;
  threshold_value: number;
  recommended_action: string;
  timestamp_utc: string;
}

export interface WarrantyAbuseEvent {
  event_id: string;
  pack_serial: string;
  abuse_type: string;
  timestamp_utc: string;
  sensor_label?: string;
  peak_value: number;
  threshold_value: number;
  duration_seconds: number;
  severity: string;
  notes?: string;
}

export interface PackLiveState {
  pack_serial: string;
  last_seen_utc: string;
  source_type: string;
  source_id: string;
  soc_pct: number;
  soh_pct: number;
  health_grade: HealthGrade;
  pack_voltage_v: number;
  pack_current_a: number;
  max_temperature_c: number;
  imbalance_mv: number;
  weakest_cell_index: number;
  cell_voltages: number[];
  active_critical_alerts: number;
  active_warning_alerts: number;
  warranty_status: string;
  abuse_events_count: number;
  recent_alerts: DetectedAlert[];
  abuse_events: any[];
}

export interface SohProjectionPoint {
  month: string;
  soh_pct: number;
  is_projection: boolean;
}

export interface DodDistribution {
  range_label: string;
  pct: number;
}

export interface UsageProfile {
  dod_distribution: DodDistribution[];
  time_above_95_pct_soc: number;
  avg_charge_c_rate: number;
  time_above_45c: number;
}

export interface LocationTrailPoint {
  lat: number;
  lng: number;
  timestamp_utc: string;
  source: string;
  speed_kmh?: number;
}

export interface RawTelemetrySample {
  timestamp_utc: string;
  sequence_num: number;
  source_type: string;
  source_id: string;
  soc_pct: number;
  soh_pct: number;
  voltage_v: number;
  current_a: number;
  max_temp_c: number;
  imbalance_mv: number;
  raw_payload: Record<string, any>;
}

export interface PackHistoryResponse {
  pack_serial: string;
  soh_history_and_projection: SohProjectionPoint[];
  months_to_80_pct_eol: number;
  usage_profile: UsageProfile;
  location_trail: LocationTrailPoint[];
  raw_telemetry: RawTelemetrySample[];
}

export interface WorkOrder {
  id: string;
  alert_id: string;
  pack_serial: string;
  title: string;
  status: "TO DO" | "IN PROGRESS" | "WAITING ON EVRAID" | "DONE THIS WEEK";
  priority: "Urgent" | "High" | "Normal";
  assigned_to: string;
  due_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DetailedAlert {
  id: string;
  pack_serial: string;
  vehicle_id?: string;
  location_label?: string;
  alert_type: string;
  alert_name: string;
  sensor_label?: string;
  severity: AlertSeverity;
  raised_at: string;
  age_str: string;
  status: "New" | "Acknowledged" | "In progress" | "Closed";
  assignee?: string;
  recommended_action: string;
  delivery_channels: string[];
  acknowledged_at?: string;
  acknowledged_by?: string;
  work_order?: WorkOrder;
}

export interface DeviceModuleItem {
  imei: string;
  iccid: string;
  pack_serial?: string;
  vehicle_id?: string;
  network: string;
  rssi_dbm: number;
  signal_bars: number;
  bms_firmware: string;
  has_fw_update: boolean;
  status: "Online" | "Offline";
  last_seen_utc: string;
  last_seen_str: string;
}

export interface FirmwareProfileMapping {
  id: number;
  firmware_version: string;
  bms_model_code: string;
  cell_channel_map: number[];
  current_sign_convention: string;
  description?: string;
  created_at: string;
}

