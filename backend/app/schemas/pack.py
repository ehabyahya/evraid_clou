from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.alerts import HealthGrade, DetectedAlert
from app.schemas.abuse import WarrantyAbuseEvent

class PackLiveState(BaseModel):
    pack_serial: str
    last_seen_utc: datetime
    source_type: str
    source_id: str
    soc_pct: float
    soh_pct: float
    health_grade: HealthGrade
    pack_voltage_v: float
    pack_current_a: float
    max_temperature_c: float
    imbalance_mv: float
    weakest_cell_index: int
    cell_voltages: List[float]
    active_critical_alerts: int
    active_warning_alerts: int
    warranty_status: str
    abuse_events_count: int
    recent_alerts: List[DetectedAlert] = []
    abuse_events: List[WarrantyAbuseEvent] = []

