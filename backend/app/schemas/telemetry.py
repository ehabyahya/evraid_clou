from enum import Enum
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class SourceType(str, Enum):
    BLE_APP = "BLE_APP"
    LTEM_MODULE = "LTEM_MODULE"

class LocationSource(str, Enum):
    PHONE_GPS = "PHONE_GPS"
    MODULE_GNSS = "MODULE_GNSS"

class TelemetryMetadata(BaseModel):
    source_type: SourceType = Field(..., description="BLE_APP or LTEM_MODULE")
    source_id: str = Field(..., description="Technician ID or Module ID")
    bms_fw_version: str = Field(..., description="e.g. SWP10_V2.1.0")
    sequence_num: int = Field(..., ge=0, description="Monotonically increasing sequence number per pack")
    timestamp_utc: datetime = Field(..., description="UTC timestamp of the sample")
    buffered: bool = Field(default=False, description="True if sample was replayed from offline buffer")

class TelemetryLocation(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    source: LocationSource
    accuracy_m: Optional[float] = Field(default=None, ge=0.0)

class TelemetryElectrical(BaseModel):
    pack_voltage_v: float = Field(..., description="Total stack voltage in Volts")
    pack_current_a: float = Field(..., description="Pack current: NEGATIVE = discharge, POSITIVE = charge")
    soc_pct: float = Field(..., ge=0.0, le=100.0, description="State of Charge percentage")
    soh_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="State of Health percentage")
    state: Optional[str] = Field(default="STANDBY", description="STANDBY, CHARGING, DISCHARGING, FAULT")
    lifetime_energy_kwh: Optional[float] = Field(default=None, ge=0.0)
    rated_capacity_ah: Optional[float] = Field(default=None, ge=0.0)

class TelemetryCells(BaseModel):
    connected_count: int = Field(..., ge=1, le=48, description="Number of series cells connected")
    voltages_v: List[float] = Field(..., description="Physical cell voltages in Volts (1-based physical order)")
    min_voltage_v: float = Field(..., description="Minimum cell voltage")
    max_voltage_v: float = Field(..., description="Maximum cell voltage")
    avg_voltage_v: float = Field(..., description="Average cell voltage")
    imbalance_mv: float = Field(..., ge=0.0, description="Delta V (max - min) in millivolts")
    weakest_cell_index: int = Field(..., ge=1, description="1-based index of lowest voltage cell")

class TelemetryThermal(BaseModel):
    cell_temperatures_c: List[float] = Field(default_factory=list, description="Sensor readings T1..Tn")
    max_cell_temp_c: float = Field(..., description="Maximum temperature among cell sensors")
    mosfet_temp_c: Optional[float] = None
    internal_chip_temp_c: Optional[float] = None

class TelemetryStatusAndFaults(BaseModel):
    bms_state_code: Optional[int] = None
    balancing_active: bool = False
    charge_fet_enabled: bool = True
    discharge_fet_enabled: bool = True
    raw_fault_flags: int = 0
    active_alarms: List[str] = Field(default_factory=list)

class TelemetryModuleInfo(BaseModel):
    imei: Optional[str] = None
    iccid: Optional[str] = None
    module_fw: Optional[str] = None
    network: Optional[str] = None
    rssi_dbm: Optional[int] = None
    buffered: bool = False

class CanonicalTelemetryRecord(BaseModel):
    pack_serial: str = Field(..., description="Unique pack serial number e.g. EVR-C036014-131026-L1-164637")
    metadata: TelemetryMetadata
    location: Optional[TelemetryLocation] = None
    electrical: TelemetryElectrical
    cells: TelemetryCells
    thermal: TelemetryThermal
    status_and_faults: TelemetryStatusAndFaults
    module: Optional[TelemetryModuleInfo] = None

class TelemetryBatchIngestRequest(BaseModel):
    records: List[CanonicalTelemetryRecord] = Field(..., min_length=1, max_length=500)

class IngestRecordResult(BaseModel):
    pack_serial: str
    sequence_num: int
    status: str # "ACCEPTED", "DUPLICATE", "REJECTED"
    message: Optional[str] = None

class TelemetryBatchIngestResponse(BaseModel):
    received_count: int
    accepted_count: int
    duplicate_count: int
    rejected_count: int
    results: List[IngestRecordResult]

