from typing import List, Dict, Optional
from datetime import datetime
from app.schemas.telemetry import CanonicalTelemetryRecord
from app.schemas.abuse import WarrantyAbuseEvent, WarrantyEvaluationResult

class AbuseAndWarrantyEvidenceEngine:
    """
    Evaluates telemetry against permanent warranty criteria (Master Plan §4.3).
    All abuse events are logged immutably and kept permanently as warranty evidence.
    Warranty status is advisory: EVRaid support makes final void/valid determination.
    """

    def __init__(self):
        # Simulated permanent ledger: {pack_serial: List[WarrantyAbuseEvent]}
        self._abuse_ledger: Dict[str, List[WarrantyAbuseEvent]] = {}
        # Tracking duration of continuous over-current: {pack_serial: (start_time, peak_current)}
        self._overcurrent_tracker: Dict[str, tuple] = {}

    def evaluate_telemetry(
        self,
        record: CanonicalTelemetryRecord,
        max_discharge_a: float = 30.0,
        deep_discharge_v: float = 2.70,
        lifetime_cycles_limit: int = 500,
        current_efc: float = 0.0
    ) -> WarrantyEvaluationResult:
        new_events: List[WarrantyAbuseEvent] = []
        serial = record.pack_serial
        ts = record.metadata.timestamp_utc
        lat = record.location.latitude if record.location else None
        lon = record.location.longitude if record.location else None

        # 1. Over-current check: |I_dsg| > I_lim for > 10s transient window
        # In telemetry, negative = discharge
        current_a = record.electrical.pack_current_a
        is_discharging = current_a < 0
        discharge_magnitude = abs(current_a) if is_discharging else 0.0

        if discharge_magnitude > max_discharge_a:
            if serial not in self._overcurrent_tracker:
                self._overcurrent_tracker[serial] = (ts, discharge_magnitude)
            else:
                start_ts, peak_val = self._overcurrent_tracker[serial]
                peak_val = max(peak_val, discharge_magnitude)
                self._overcurrent_tracker[serial] = (start_ts, peak_val)
                duration = (ts - start_ts).total_seconds()

                if duration >= 10.0:
                    event = WarrantyAbuseEvent(
                        pack_serial=serial,
                        event_type="OVER_CURRENT",
                        peak_value=round(peak_val, 2),
                        threshold_value=max_discharge_a,
                        duration_seconds=duration,
                        latitude=lat,
                        longitude=lon,
                        timestamp_utc=ts,
                        description=f"Over-current sustained for {int(duration)}s (peak {peak_val:.1f}A > {max_discharge_a}A)"
                    )
                    new_events.append(event)
                    # Reset tracker to avoid duplicate event on every subsequent packet
                    del self._overcurrent_tracker[serial]
        else:
            if serial in self._overcurrent_tracker:
                del self._overcurrent_tracker[serial]

        # 2. Deep discharge abuse: Any cell below chemistry minimum floor
        min_cell_v = record.cells.min_voltage_v
        if min_cell_v < deep_discharge_v:
            event = WarrantyAbuseEvent(
                pack_serial=serial,
                event_type="DEEP_DISCHARGE",
                peak_value=min_cell_v,
                threshold_value=deep_discharge_v,
                latitude=lat,
                longitude=lon,
                timestamp_utc=ts,
                description=f"Deep discharge below chemistry floor ({min_cell_v}V < {deep_discharge_v}V on cell {record.cells.weakest_cell_index})"
            )
            new_events.append(event)

        # 3. Thermal Abuse: Charging above 45°C or Discharging above 60°C
        max_temp = record.thermal.max_cell_temp_c
        if current_a > 0.1 and max_temp > 45.0:
            event = WarrantyAbuseEvent(
                pack_serial=serial,
                event_type="THERMAL_CHARGE_ABUSE",
                peak_value=max_temp,
                threshold_value=45.0,
                latitude=lat,
                longitude=lon,
                timestamp_utc=ts,
                description=f"Charge thermal abuse: pack charged at {max_temp}°C (> 45°C limit)"
            )
            new_events.append(event)
        elif is_discharging and max_temp > 60.0:
            event = WarrantyAbuseEvent(
                pack_serial=serial,
                event_type="THERMAL_DISCHARGE_ABUSE",
                peak_value=max_temp,
                threshold_value=60.0,
                latitude=lat,
                longitude=lon,
                timestamp_utc=ts,
                description=f"Discharge thermal abuse: pack operated at {max_temp}°C (> 60°C limit)"
            )
            new_events.append(event)

        # Persist new events to immutable ledger
        if serial not in self._abuse_ledger:
            self._abuse_ledger[serial] = []
        self._abuse_ledger[serial].extend(new_events)

        total_abuse_count = len(self._abuse_ledger[serial])

        # Advisory Warranty status logic (Master Plan §4.3)
        if current_efc >= lifetime_cycles_limit:
            warranty_status = "Cycle limit reached"
        elif total_abuse_count > 0:
            warranty_status = "Review recommended"
        else:
            warranty_status = "Valid"

        return WarrantyEvaluationResult(
            pack_serial=serial,
            warranty_status=warranty_status,
            abuse_events_count=total_abuse_count,
            new_abuse_events=new_events,
            total_efc=current_efc,
            lifetime_cycles_limit=lifetime_cycles_limit
        )

    def get_abuse_events(self, pack_serial: str) -> List[WarrantyAbuseEvent]:
        return self._abuse_ledger.get(pack_serial, [])

abuse_engine = AbuseAndWarrantyEvidenceEngine()

