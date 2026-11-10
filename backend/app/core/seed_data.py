import json
from typing import List, Dict, Any
from app.models.catalog import BatteryModel, BMSProfile, BMSFirmwareProfile

# Master Battery Catalog defined in Master Technical Plan §2.1
DEFAULT_BATTERY_MODELS: List[Dict[str, Any]] = [
    {
        "model_code": "EVR036007",
        "commercial_name": "LADRIX Kick Scooter 36V 7.5Ah",
        "chemistry": "NMC",
        "nominal_voltage": 36.0,
        "rated_capacity_ah": 7.5,
        "series_count": 10,
        "parallel_count": 3,
        "cell_model": "Cylindrical 18650",
        "max_continuous_discharge_a": 15.0,
        "lifetime_cycles_limit": 500,
    },
    {
        "model_code": "EVR036014",
        "commercial_name": "LADRIX Kick Scooter 36V 14Ah",
        "chemistry": "NMC",
        "nominal_voltage": 36.0,
        "rated_capacity_ah": 14.0,
        "series_count": 10,
        "parallel_count": 5,
        "cell_model": "Tenpower INR18650-28HE (3C)",
        "max_continuous_discharge_a": 25.0,
        "lifetime_cycles_limit": 500,
    },
    {
        "model_code": "EVR0480015",
        "commercial_name": "LADRIX E-Mopeds 48V 15Ah",
        "chemistry": "NMC",
        "nominal_voltage": 48.0,
        "rated_capacity_ah": 15.0,
        "series_count": 13,
        "parallel_count": 5,
        "cell_model": "Cylindrical 21700",
        "max_continuous_discharge_a": 30.0,
        "lifetime_cycles_limit": 700,
    },
    {
        "model_code": "EVR0510105",
        "commercial_name": "LADRIX Golf Carts 51.2V 105Ah (48V Commercial)",
        "chemistry": "LFP",
        "nominal_voltage": 51.2,
        "rated_capacity_ah": 105.0,
        "series_count": 16,
        "parallel_count": 1,
        "cell_model": "Prismatic LiFePO4",
        "max_continuous_discharge_a": 105.0,
        "lifetime_cycles_limit": 3000,
    },
]

# BMS Profiles & Firmware Definitions
DEFAULT_BMS_PROFILES: List[Dict[str, Any]] = [
    {
        "bms_model_code": "EVRBMS-SM10S030A0C-BUO",
        "description": "EVRAID Smart BMS 10S (CAN/UART/BLE)",
        "channel_count": 16, # 16-channel AFE configured for 10S
        "max_continuous_current_a": 30.0,
        "interfaces": "BLE+CAN+UART",
    },
    {
        "bms_model_code": "EVRBMS-SM16S060A0C-BUO",
        "description": "EVRAID Smart BMS 16S Heavy Duty (Golf Cart / Delivery)",
        "channel_count": 16,
        "max_continuous_current_a": 60.0,
        "interfaces": "BLE+Isolated CAN+UART",
    }
]

DEFAULT_FIRMWARE_PROFILES: List[Dict[str, Any]] = [
    {
        "firmware_version": "SWP10_V2.1.0",
        "bms_model_code": "EVRBMS-SM10S030A0C-BUO",
        # Maps physical cells 1..10: Top cell on channel 16, unused 10..15 shorted
        "cell_channel_map": [1, 2, 3, 4, 5, 6, 7, 8, 9, 16],
        "current_sign_convention": "NEG_DISCHARGE",
        "description": "Default production firmware for 10S NMC packs"
    },
    {
        "firmware_version": "SWP16_V1.0.0",
        "bms_model_code": "EVRBMS-SM16S060A0C-BUO",
        # Direct 1-to-1 map for 16S packs
        "cell_channel_map": list(range(1, 17)),
        "current_sign_convention": "NEG_DISCHARGE",
        "description": "Default production firmware for 16S LFP Golf Cart packs"
    }
]

