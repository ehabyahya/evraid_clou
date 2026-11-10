from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AbuseEventType(BaseModel):
    OVER_CURRENT: str = "OVER_CURRENT"
    DEEP_DISCHARGE: str = "DEEP_DISCHARGE"
    THERMAL_CHARGE_ABUSE: str = "THERMAL_CHARGE_ABUSE"
    THERMAL_DISCHARGE_ABUSE: str = "THERMAL_DISCHARGE_ABUSE"
    NON_APPROVED_CHARGER: str = "NON_APPROVED_CHARGER"

class WarrantyAbuseEvent(BaseModel):
    id: Optional[int] = None
    pack_serial: str
    event_type: str
    peak_value: float
    threshold_value: float
    duration_seconds: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp_utc: datetime
    description: str

class WarrantyEvaluationResult(BaseModel):
    pack_serial: str
    warranty_status: str # "Valid", "Review recommended", "Cycle limit reached"
    abuse_events_count: int
    new_abuse_events: List[WarrantyAbuseEvent]
    total_efc: float = 0.0
    lifetime_cycles_limit: int = 500

