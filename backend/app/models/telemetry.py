from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, UniqueConstraint, ARRAY
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class RawTelemetry(Base):
    """
    Time-series table (TimescaleDB hypertable in prod).
    Stores both normalized metrics for fast indexing/querying AND
    the full untouched JSON payload for permanent fidelity and AI training.
    """
    __tablename__ = "raw_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pack_serial = Column(String(100), nullable=False, index=True)
    timestamp_utc = Column(DateTime(timezone=True), nullable=False, index=True)
    sequence_num = Column(Integer, nullable=False)
    source_type = Column(String(20), nullable=False) # BLE_APP, LTEM_MODULE
    source_id = Column(String(100), nullable=False) # tech_id or module_imei
    bms_fw_version = Column(String(50), nullable=False)
    buffered = Column(Boolean, default=False)

    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_source = Column(String(20), nullable=True) # PHONE_GPS, MODULE_GNSS

    # Key Electrical metrics
    pack_voltage_v = Column(Float, nullable=False)
    pack_current_a = Column(Float, nullable=False) # Negative = discharge
    soc_pct = Column(Float, nullable=False)
    soh_pct = Column(Float, nullable=True)
    state = Column(String(20), default="STANDBY")

    # Cells
    connected_cell_count = Column(Integer, nullable=False)
    cell_voltages = Column(ARRAY(Float), nullable=False)
    cell_min_v = Column(Float, nullable=False)
    cell_max_v = Column(Float, nullable=False)
    cell_avg_v = Column(Float, nullable=False)
    cell_imbalance_mv = Column(Float, nullable=False)
    weakest_cell_index = Column(Integer, nullable=False)

    # Thermal
    cell_temperatures_c = Column(ARRAY(Float), nullable=False)
    max_cell_temp_c = Column(Float, nullable=False)
    mosfet_temp_c = Column(Float, nullable=True)

    # Status & Faults
    raw_fault_flags = Column(Integer, default=0)

    # Untouched original edge JSON payload for 100% auditability & future AI training
    raw_payload = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Idempotent deduplication constraint across edge retransmissions
    __table_args__ = (
        UniqueConstraint("pack_serial", "source_id", "sequence_num", name="uq_pack_source_sequence"),
    )

