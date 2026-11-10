from typing import List, Optional, Dict
from datetime import datetime
from app.schemas.telemetry import CanonicalTelemetryRecord
from app.schemas.alerts import (
    DetectedAlert,
    AlertSeverity,
    AlertConditionType,
    HealthGrade,
    DiagnosticsEvaluationResult
)

class AlertAndDiagnosticsEngine:
    """
    Evaluates field telemetry against physics rules, per-chemistry limits,
    and fleet thresholds (Master Plan §7.3 & §7.4).
    """

    # Chemistry voltage floors & ceilings
    CHEMISTRY_LIMITS = {
        "NMC": {
            "v_min": 2.80, # Critical under-voltage
            "v_max": 4.25, # Critical over-voltage
            "v_deep_discharge_abuse": 2.70,
            "t_max_discharge": 60.0,
            "t_max_charge": 50.0,
        },
        "LFP": {
            "v_min": 2.50,
            "v_max": 3.65,
            "v_deep_discharge_abuse": 2.40,
            "t_max_discharge": 60.0,
            "t_max_charge": 50.0,
        }
    }

    def __init__(self):
        # Rolling temperature cache to compute dT/dt per sensor: {pack_serial: {sensor_idx: [(timestamp, temp)]}}
        self._temp_history: Dict[str, Dict[int, List[tuple]]] = {}

    def evaluate_telemetry(
        self,
        record: CanonicalTelemetryRecord,
        chemistry: str = "NMC",
        imbalance_warning_threshold_mv: float = 100.0,
        soh_warning_threshold_pct: float = 80.0
    ) -> DiagnosticsEvaluationResult:
        alerts: List[DetectedAlert] = []
        limits = self.CHEMISTRY_LIMITS.get(chemistry.upper(), self.CHEMISTRY_LIMITS["NMC"])

        # 1. Thermal Checks: Absolute limit
        for idx, t_val in enumerate(record.thermal.cell_temperatures_c, start=1):
            sensor_name = f"sensor T{idx}"
            is_charging = record.electrical.pack_current_a > 0.1
            t_limit = limits["t_max_charge"] if is_charging else limits["t_max_discharge"]
            
            if t_val >= t_limit:
                alerts.append(DetectedAlert(
                    pack_serial=record.pack_serial,
                    condition_type=AlertConditionType.OVER_TEMPERATURE,
                    severity=AlertSeverity.CRITICAL,
                    message=f"Over-temperature {t_val}°C on {sensor_name}",
                    sensor_label=sensor_name,
                    measured_value=t_val,
                    threshold_value=t_limit,
                    recommended_action="Stop vehicle immediately, move to an open area, and disconnect load.",
                    timestamp_utc=record.metadata.timestamp_utc
                ))

        # 2. Thermal Checks: Rate of rise (dT/dt) early warning
        # Proposal: dT/dt >= 1.0 °C/min sustained AND T > 45°C, or any dT/dt >= 3.0 °C/min
        dt_alerts = self._check_thermal_runaway_rates(
            record.pack_serial,
            record.thermal.cell_temperatures_c,
            record.metadata.timestamp_utc
        )
        alerts.extend(dt_alerts)

        # 3. Cell Voltage Checks (Min/Max/Plausibility)
        for idx, v_val in enumerate(record.cells.voltages_v, start=1):
            cell_name = f"cell {idx}"
            if v_val < 0.5:
                # Sense fault (broken sense wire / dead cell)
                alerts.append(DetectedAlert(
                    pack_serial=record.pack_serial,
                    condition_type=AlertConditionType.SENSE_FAULT,
                    severity=AlertSeverity.CRITICAL,
                    message=f"Cell sense fault on {cell_name} (reading {v_val}V)",
                    sensor_label=cell_name,
                    measured_value=v_val,
                    threshold_value=0.5,
                    recommended_action="Inspect wiring harness and BMS sense connections immediately.",
                    timestamp_utc=record.metadata.timestamp_utc
                ))
            elif v_val < limits["v_min"]:
                alerts.append(DetectedAlert(
                    pack_serial=record.pack_serial,
                    condition_type=AlertConditionType.CELL_UNDER_VOLTAGE,
                    severity=AlertSeverity.CRITICAL,
                    message=f"{cell_name} under-voltage ({v_val}V < {limits['v_min']}V)",
                    sensor_label=cell_name,
                    measured_value=v_val,
                    threshold_value=limits["v_min"],
                    recommended_action="Charge pack immediately or dispatch technician for inspection.",
                    timestamp_utc=record.metadata.timestamp_utc
                ))
            elif v_val > limits["v_max"]:
                alerts.append(DetectedAlert(
                    pack_serial=record.pack_serial,
                    condition_type=AlertConditionType.CELL_OVER_VOLTAGE,
                    severity=AlertSeverity.CRITICAL,
                    message=f"{cell_name} over-voltage ({v_val}V > {limits['v_max']}V)",
                    sensor_label=cell_name,
                    measured_value=v_val,
                    threshold_value=limits["v_max"],
                    recommended_action="Stop charging immediately; inspect charger voltage profile.",
                    timestamp_utc=record.metadata.timestamp_utc
                ))

        # 4. Cell Imbalance Check (Warning)
        if record.cells.imbalance_mv > imbalance_warning_threshold_mv:
            alerts.append(DetectedAlert(
                pack_serial=record.pack_serial,
                condition_type=AlertConditionType.CELL_IMBALANCE,
                severity=AlertSeverity.WARNING,
                message=f"High cell imbalance {record.cells.imbalance_mv} mV (weakest: cell {record.cells.weakest_cell_index})",
                sensor_label=f"cell {record.cells.weakest_cell_index}",
                measured_value=record.cells.imbalance_mv,
                threshold_value=imbalance_warning_threshold_mv,
                recommended_action="Perform depot balance charging cycle.",
                timestamp_utc=record.metadata.timestamp_utc
            ))

        # 5. SOH Check (Info)
        soh = record.electrical.soh_pct if record.electrical.soh_pct is not None else 100.0
        if soh < soh_warning_threshold_pct:
            alerts.append(DetectedAlert(
                pack_serial=record.pack_serial,
                condition_type=AlertConditionType.SOH_LOW,
                severity=AlertSeverity.INFO,
                message=f"SOH below fleet threshold ({soh}% < {soh_warning_threshold_pct}%)",
                measured_value=soh,
                threshold_value=soh_warning_threshold_pct,
                recommended_action="Schedule scheduled end-of-first-life replacement.",
                timestamp_utc=record.metadata.timestamp_utc
            ))

        # 6. Calculate Health Grade (A/B/C/D) based on SOH and Critical Alerts
        # Rules from PRD & Master Plan §7.3:
        # A: >= 90%, B: 80-90%, C: 70-80%, D: < 70% or any open Critical fault
        has_critical = any(a.severity == AlertSeverity.CRITICAL for a in alerts)
        health_grade = self._calculate_health_grade(soh, has_critical)

        return DiagnosticsEvaluationResult(
            pack_serial=record.pack_serial,
            soh_pct=soh,
            health_grade=health_grade,
            imbalance_mv=record.cells.imbalance_mv,
            weakest_cell_index=record.cells.weakest_cell_index,
            active_alerts=alerts
        )

    def _check_thermal_runaway_rates(
        self,
        pack_serial: str,
        current_temps: List[float],
        timestamp: datetime
    ) -> List[DetectedAlert]:
        alerts = []
        if pack_serial not in self._temp_history:
            self._temp_history[pack_serial] = {}

        history = self._temp_history[pack_serial]

        for idx, t_curr in enumerate(current_temps, start=1):
            if idx not in history:
                history[idx] = [(timestamp, t_curr)]
                continue

            # Keep rolling window of last 5 minutes
            samples = history[idx]
            samples.append((timestamp, t_curr))
            
            # Prune older than 5 min (300 s)
            cutoff_sec = 300
            t_first, temp_first = samples[0]
            delta_sec = (timestamp - t_first).total_seconds()
            
            while delta_sec > cutoff_sec and len(samples) > 2:
                samples.pop(0)
                t_first, temp_first = samples[0]
                delta_sec = (timestamp - t_first).total_seconds()

            if delta_sec >= 30.0: # Need at least 30s delta to compute reliable rate
                delta_min = delta_sec / 60.0
                rate_c_per_min = (t_curr - temp_first) / delta_min
                sensor_name = f"sensor T{idx}"

                # Trigger early warning: dT/dt >= 1.0 C/min and T > 45C OR rate >= 3.0 C/min
                if (rate_c_per_min >= 1.0 and t_curr > 45.0) or (rate_c_per_min >= 3.0):
                    alerts.append(DetectedAlert(
                        pack_serial=pack_serial,
                        condition_type=AlertConditionType.THERMAL_RUNAWAY_RATE,
                        severity=AlertSeverity.CRITICAL,
                        message=f"Temperature rising {round(rate_c_per_min, 1)} °C/min, {sensor_name}",
                        sensor_label=sensor_name,
                        measured_value=round(rate_c_per_min, 1),
                        threshold_value=1.0,
                        recommended_action="Stop the vehicle, move the pack to a safe open area, and inspect.",
                        timestamp_utc=timestamp
                    ))

        return alerts

    @staticmethod
    def _calculate_health_grade(soh_pct: float, has_critical_fault: bool) -> HealthGrade:
        if has_critical_fault or soh_pct < 70.0:
            return HealthGrade.D
        elif soh_pct < 80.0:
            return HealthGrade.C
        elif soh_pct < 90.0:
            return HealthGrade.B
        else:
            return HealthGrade.A

diagnostics_engine = AlertAndDiagnosticsEngine()

