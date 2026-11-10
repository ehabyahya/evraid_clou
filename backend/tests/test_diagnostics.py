import pytest
from datetime import datetime, timedelta, timezone
from app.services.diagnostics import diagnostics_engine
from app.schemas.telemetry import CanonicalTelemetryRecord
from app.schemas.alerts import AlertSeverity, AlertConditionType, HealthGrade

def create_sample_telemetry(
    pack_serial="EVR-48105-0142",
    voltages=None,
    temps=None,
    soh=87.6,
    current=-24.6,
    imbalance=120.0,
    weakest_cell=9,
    timestamp=None
):
    if voltages is None:
        # 16S LFP sample: cell 9 is weakest at 3.19V
        voltages = [3.28, 3.29, 3.27, 3.31, 3.30, 3.28, 3.26, 3.27, 3.19, 3.31, 3.28, 3.26, 3.27, 3.30, 3.31, 3.28]
    if temps is None:
        temps = [47.0, 46.5, 47.0] # Sensor T1..T3
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    return CanonicalTelemetryRecord(
        pack_serial=pack_serial,
        metadata={
            "source_type": "LTEM_MODULE",
            "source_id": "imei_4471",
            "bms_fw_version": "2.4.1",
            "sequence_num": 1,
            "timestamp_utc": timestamp,
            "buffered": False
        },
        electrical={
            "pack_voltage_v": 51.8,
            "pack_current_a": current,
            "soc_pct": 58.0,
            "soh_pct": soh,
            "state": "DISCHARGING",
            "lifetime_energy_kwh": 2.2,
            "rated_capacity_ah": 105.0
        },
        cells={
            "connected_count": len(voltages),
            "voltages_v": voltages,
            "min_voltage_v": min(voltages),
            "max_voltage_v": max(voltages),
            "avg_voltage_v": round(sum(voltages) / len(voltages), 3),
            "imbalance_mv": imbalance,
            "weakest_cell_index": weakest_cell
        },
        thermal={
            "cell_temperatures_c": temps,
            "max_cell_temp_c": max(temps),
            "mosfet_temp_c": 48.0
        },
        status_and_faults={
            "bms_state_code": 2,
            "balancing_active": False,
            "charge_fet_enabled": True,
            "discharge_fet_enabled": True,
            "raw_fault_flags": 0,
            "active_alarms": []
        }
    )

def test_cell_imbalance_warning_and_grade_b():
    # Pack matching mockup EVR-48105-0142: SOH=87.6% -> Grade B, Imbalance 120mV -> Warning
    rec = create_sample_telemetry(soh=87.6, imbalance=120.0, weakest_cell=9)
    result = diagnostics_engine.evaluate_telemetry(rec, chemistry="LFP")

    assert result.health_grade == HealthGrade.B
    assert result.imbalance_mv == 120.0
    assert result.weakest_cell_index == 9
    
    warning_alerts = [a for a in result.active_alerts if a.severity == AlertSeverity.WARNING]
    assert len(warning_alerts) == 1
    assert warning_alerts[0].condition_type == AlertConditionType.CELL_IMBALANCE
    assert "cell 9" in warning_alerts[0].sensor_label

def test_cell_under_voltage_downgrades_to_grade_d():
    # If cell 9 drops to 2.45V (< 2.50V for LFP) -> Critical Alert -> Grade D
    voltages = [3.28] * 16
    voltages[8] = 2.45 # cell 9
    rec = create_sample_telemetry(voltages=voltages, soh=87.6)
    
    result = diagnostics_engine.evaluate_telemetry(rec, chemistry="LFP")
    assert result.health_grade == HealthGrade.D
    critical_alerts = [a for a in result.active_alerts if a.severity == AlertSeverity.CRITICAL]
    assert any(a.condition_type == AlertConditionType.CELL_UNDER_VOLTAGE for a in critical_alerts)

def test_thermal_runaway_rate_of_rise_detection():
    # Simulates thermal runaway rate of rise dT/dt on sensor T3
    # Step 1: initial reading at T=0 (43°C)
    t0 = datetime(2026, 11, 2, 12, 0, 0, tzinfo=timezone.utc)
    rec1 = create_sample_telemetry(pack_serial="EVR-THERMAL-TEST", temps=[30.0, 30.0, 43.0], timestamp=t0)
    res1 = diagnostics_engine.evaluate_telemetry(rec1)
    assert not any(a.condition_type == AlertConditionType.THERMAL_RUNAWAY_RATE for a in res1.active_alerts)

    # Step 2: 2 minutes later, T3 rises to 47.2°C (rate = (47.2 - 43) / 2 = 2.1 °C/min, exactly matches mockup!)
    t1 = t0 + timedelta(minutes=2)
    rec2 = create_sample_telemetry(pack_serial="EVR-THERMAL-TEST", temps=[30.0, 30.0, 47.2], timestamp=t1)
    res2 = diagnostics_engine.evaluate_telemetry(rec2)
    
    rate_alerts = [a for a in res2.active_alerts if a.condition_type == AlertConditionType.THERMAL_RUNAWAY_RATE]
    assert len(rate_alerts) == 1
    assert rate_alerts[0].severity == AlertSeverity.CRITICAL
    assert rate_alerts[0].sensor_label == "sensor T3"
    assert "2.1 °C/min" in rate_alerts[0].message

