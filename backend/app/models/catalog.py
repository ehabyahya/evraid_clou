from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, 
    Text, UniqueConstraint, ARRAY
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    country = Column(String(50), default="Egypt")
    subscription_tier = Column(String(20), default="Basic") # Basic, Pro, Enterprise
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fleets = relationship("Fleet", back_populates="customer", cascade="all, delete-orphan")


class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    reporting_interval_in_use_s = Column(Integer, default=30)
    reporting_interval_idle_s = Column(Integer, default=900) # 15 min
    alert_imbalance_threshold_mv = Column(Float, default=100.0)
    soh_warning_threshold_pct = Column(Float, default=80.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="fleets")
    packs = relationship("Pack", back_populates="fleet")


class BatteryModel(Base):
    __tablename__ = "battery_models"

    id = Column(Integer, primary_key=True, index=True)
    model_code = Column(String(50), unique=True, nullable=False) # Canonical code e.g. EVR036014
    commercial_name = Column(String(100), nullable=False)
    chemistry = Column(String(20), nullable=False) # NMC, LFP
    nominal_voltage = Column(Float, nullable=False) # e.g. 36.0, 51.2
    rated_capacity_ah = Column(Float, nullable=False) # e.g. 14.0, 105.0
    series_count = Column(Integer, nullable=False) # e.g. 10, 13, 16, 20
    parallel_count = Column(Integer, default=1)
    cell_model = Column(String(100), nullable=True) # e.g. Tenpower INR18650-28HE
    max_continuous_discharge_a = Column(Float, nullable=True)
    lifetime_cycles_limit = Column(Integer, default=500)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    packs = relationship("Pack", back_populates="model")


class BMSProfile(Base):
    __tablename__ = "bms_profiles"

    id = Column(Integer, primary_key=True, index=True)
    bms_model_code = Column(String(50), unique=True, nullable=False) # e.g. EVRBMS-SM10S030A0C-BUO
    description = Column(String(100), nullable=True)
    channel_count = Column(Integer, nullable=False) # e.g. 10, 16, 24
    max_continuous_current_a = Column(Float, default=30.0)
    interfaces = Column(String(50), default="BLE+CAN+UART")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    firmware_profiles = relationship("BMSFirmwareProfile", back_populates="bms_profile")


class BMSFirmwareProfile(Base):
    __tablename__ = "bms_firmware_profiles"

    id = Column(Integer, primary_key=True, index=True)
    firmware_version = Column(String(50), unique=True, nullable=False) # e.g. SWP10_V2.1.0
    bms_profile_id = Column(Integer, ForeignKey("bms_profiles.id"), nullable=True)
    # Ordered array mapping physical cells 1..S to 1-based raw channel indices e.g. [1,2,3,4,5,6,7,8,9,16]
    cell_channel_map = Column(ARRAY(Integer), nullable=False)
    current_sign_convention = Column(String(20), default="NEG_DISCHARGE") # NEG_DISCHARGE / POS_DISCHARGE
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bms_profile = relationship("BMSProfile", back_populates="firmware_profiles")


class Pack(Base):
    __tablename__ = "packs"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(100), unique=True, nullable=False, index=True) # e.g. EVR-C036014-131026-L1-164637
    ble_adv_name = Column(String(100), nullable=True, index=True) # e.g. EVR036014-CFDFA8
    model_id = Column(Integer, ForeignKey("battery_models.id"), nullable=True)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=True)
    connectivity_mode = Column(String(20), default="BLE_ONLY") # BLE_ONLY, LTEM_ACTIVE
    warranty_start_date = Column(DateTime(timezone=True), nullable=True)
    warranty_end_date = Column(DateTime(timezone=True), nullable=True)
    lifetime_cycles_limit = Column(Integer, default=500)
    commissioned_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    model = relationship("BatteryModel", back_populates="packs")
    fleet = relationship("Fleet", back_populates="packs")

