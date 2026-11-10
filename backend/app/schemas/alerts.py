from enum import Enum
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"

class AlertConditionType(str, Enum):
    OVER_TEMPERATURE = "OVER_TEMPERATURE"
    THERMAL_RUNAWAY_RATE = "THERMAL_RUNAWAY_RATE"
    CELL_UNDER_VOLTAGE = "CELL_UNDER_VOLTAGE"
    CELL_OVER_VOLTAGE = "CELL_OVER_VOLTAGE"
    SUDDEN_VOLTAGE_DROP = "SUDDEN_VOLTAGE_DROP"
    SENSE_FAULT = "SENSE_FAULT"
    CELL_IMBALANCE = "CELL_IMBALANCE"
    ABUSE_OVER_CURRENT = "ABUSE_OVER_CURRENT"
    ABUSE_DEEP_DISCHARGE = "ABUSE_DEEP_DISCHARGE"
    SOH_LOW = "SOH_LOW"

class DetectedAlert(BaseModel):
    pack_serial: str
    condition_type: AlertConditionType
    severity: AlertSeverity
    message: str
    sensor_label: Optional[str] = None # e.g. "sensor T3" or "cell 9"
    measured_value: float
    threshold_value: float
    recommended_action: str
    timestamp_utc: datetime

class HealthGrade(str, Enum):
    A = "A" # >= 90% SOH
    B = "B" # 80 - 90% SOH
    C = "C" # 70 - 80% SOH
    D = "D" # < 70% SOH or critical active alarm

class DiagnosticsEvaluationResult(BaseModel):
    pack_serial: str
    soh_pct: float
    health_grade: HealthGrade
    imbalance_mv: float
    weakest_cell_index: int
    active_alerts: List[DetectedAlert]
    abuse_events_count: int = 0

