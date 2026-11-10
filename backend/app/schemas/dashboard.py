from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.schemas.alerts import AlertSeverity, HealthGrade, DetectedAlert
from app.schemas.abuse import WarrantyAbuseEvent

# --- Overview Schemas ---
class OnlineKpi(BaseModel):
    online: int
    total: int
    pct_reported_today: float

class SohKpi(BaseModel):
    value: float
    delta_90d: float

class OpenAlertsKpi(BaseModel):
    total: int
    critical: int
    warning: int
    info: int

class NeedChargingKpi(BaseModel):
    count: int
    threshold_pct: float = 20.0

class EfcKpi(BaseModel):
    value: float
    highest_pack: float

class OverviewKpis(BaseModel):
    packs_online: OnlineKpi
    avg_soh: SohKpi
    open_alerts: OpenAlertsKpi
    need_charging: NeedChargingKpi
    avg_efc: EfcKpi

class HealthGradeBar(BaseModel):
    grade: str # A, B, C, D
    label: str # e.g. "SOH ≥ 90%"
    count: int
    pct: float
    color: str # hex code

class MonthlySohTrendPoint(BaseModel):
    month: str # e.g. "Nov 25"
    avg_soh: float

class CriticalAlertOverviewItem(BaseModel):
    id: str
    pack_serial: str
    alert_name: str
    sensor_label: Optional[str] = None
    severity: str
    age_str: str
    status: str # "Unassigned", "Assigned", "In Progress"
    raised_at: datetime

class PackNeedingAttentionItem(BaseModel):
    pack_serial: str
    soh_pct: float
    cycles: int
    health_grade: str
    imbalance_mv: float
    status: str
    vehicle_id: Optional[str] = None

class FleetOverviewResponse(BaseModel):
    fleet_id: int
    fleet_name: str
    operator_name: str
    updated_at: datetime
    kpis: OverviewKpis
    health_grades: List[HealthGradeBar]
    soh_12m_trend: List[MonthlySohTrendPoint]
    open_critical_alerts: List[CriticalAlertOverviewItem]
    packs_needing_attention: List[PackNeedingAttentionItem]


# --- Pack Schemas ---
class PackLocation(BaseModel):
    latitude: float
    longitude: float
    accuracy_m: float
    source: str # "PHONE_GPS" or "MODULE_GNSS"
    fix_age_s: int
    address_snippet: Optional[str] = None

class PackListItem(BaseModel):
    pack_serial: str
    ble_adv_name: Optional[str] = None
    vehicle_id: Optional[str] = None
    module_imei: Optional[str] = None
    commercial_name: str
    chemistry: str # "LFP", "NMC"
    series_count: int
    rated_capacity_ah: float
    connectivity_mode: str # "BLE_ONLY", "LTEM_ACTIVE"
    health_grade: str # "A", "B", "C", "D"
    soc_pct: float
    soh_pct: float
    pack_voltage_v: float
    pack_current_a: float
    imbalance_mv: float
    max_temperature_c: float
    equivalent_cycles: int
    active_critical_alerts: int
    active_warning_alerts: int
    warranty_status: str
    last_seen_utc: datetime
    location: Optional[PackLocation] = None

class PackListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[PackListItem]

class PackRegisterRequest(BaseModel):
    serial_number: str
    ble_adv_name: Optional[str] = None
    commercial_name: str = "LADRIX Battery Pack"
    chemistry: str = "LFP" # "LFP" or "NMC"
    nominal_voltage: float = 51.2
    rated_capacity_ah: float = 105.0
    series_count: int = 16
    fleet_id: int = 1
    vehicle_id: Optional[str] = None
    connectivity_mode: str = "LTEM_ACTIVE"
    module_imei: Optional[str] = None
    bms_firmware_version: str = "SWP16_V1.0.0"

class SohProjectionPoint(BaseModel):
    month: str
    soh_pct: float
    is_projection: bool

class DodDistribution(BaseModel):
    range_label: str
    pct: float

class UsageProfile(BaseModel):
    dod_distribution: List[DodDistribution]
    time_above_95_pct_soc: float # percentage of time
    avg_charge_c_rate: float # e.g. 0.4
    time_above_45c: float # percentage of time

class LocationTrailPoint(BaseModel):
    lat: float
    lng: float
    timestamp_utc: datetime
    source: str
    speed_kmh: Optional[float] = None

class RawTelemetrySample(BaseModel):
    timestamp_utc: datetime
    sequence_num: int
    source_type: str
    source_id: str
    soc_pct: float
    soh_pct: float
    voltage_v: float
    current_a: float
    max_temp_c: float
    imbalance_mv: float
    raw_payload: Dict[str, Any]

class PackHistoryResponse(BaseModel):
    pack_serial: str
    soh_history_and_projection: List[SohProjectionPoint]
    months_to_80_pct_eol: float
    usage_profile: UsageProfile
    location_trail: List[LocationTrailPoint]
    raw_telemetry: List[RawTelemetrySample]


# --- Alert & Work Order Schemas ---
class WorkOrder(BaseModel):
    id: str
    alert_id: str
    pack_serial: str
    title: str
    status: str # "TO DO", "IN PROGRESS", "WAITING ON EVRAID", "DONE THIS WEEK"
    priority: str # "Urgent", "High", "Normal"
    assigned_to: str
    due_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class DetailedAlert(BaseModel):
    id: str
    pack_serial: str
    vehicle_id: Optional[str] = None
    location_label: Optional[str] = None
    alert_type: str
    alert_name: str
    sensor_label: Optional[str] = None
    severity: str # "CRITICAL", "WARNING", "INFO"
    raised_at: datetime
    age_str: str
    status: str # "New", "Acknowledged", "In progress", "Closed"
    assignee: Optional[str] = None
    recommended_action: str
    delivery_channels: List[str] # ["dashboard", "email", "SMS to Ops desk"]
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    work_order: Optional[WorkOrder] = None

class AlertAssignRequest(BaseModel):
    assign_to: str
    priority: str = "High"
    due_date: Optional[str] = None
    notes: Optional[str] = None
    escalate_to_evraid: bool = False
    status: str = "TO DO"

class AlertThresholdsConfig(BaseModel):
    fleet_id: int
    thermal_warning_c: float = 45.0
    thermal_critical_c: float = 55.0
    temp_rate_c_per_min: float = 2.0
    cell_imbalance_warning_mv: float = 80.0
    cell_imbalance_critical_mv: float = 150.0
    undervoltage_cutoff_v: float = 2.8
    overcurrent_discharge_a: float = 80.0


# --- Device Registry Schemas ---
class DeviceModuleItem(BaseModel):
    imei: str
    iccid: str
    pack_serial: Optional[str] = None
    vehicle_id: Optional[str] = None
    network: str # "LTE-M", "2G fallback", "BLE App"
    rssi_dbm: int
    signal_bars: int # 1..4
    bms_firmware: str
    has_fw_update: bool
    status: str # "Online", "Offline"
    last_seen_utc: datetime
    last_seen_str: str

class DeviceLinkModuleRequest(BaseModel):
    pack_serial: str
    imei: str
    iccid: Optional[str] = None


# --- Admin Schema Mapping ---
class FirmwareProfileMapping(BaseModel):
    id: int
    firmware_version: str
    bms_model_code: str
    cell_channel_map: List[int]
    current_sign_convention: str
    description: Optional[str] = None
    created_at: datetime

