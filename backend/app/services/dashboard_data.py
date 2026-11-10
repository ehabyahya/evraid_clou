import sys
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.schemas.dashboard import (
    FleetOverviewResponse, OverviewKpis, OnlineKpi, SohKpi, OpenAlertsKpi, 
    NeedChargingKpi, EfcKpi, HealthGradeBar, MonthlySohTrendPoint,
    CriticalAlertOverviewItem, PackNeedingAttentionItem,
    PackListItem, PackLocation, PackListResponse, PackRegisterRequest,
    PackHistoryResponse, SohProjectionPoint, UsageProfile, DodDistribution,
    LocationTrailPoint, RawTelemetrySample, DetailedAlert, WorkOrder,
    AlertAssignRequest, DeviceModuleItem, DeviceLinkModuleRequest,
    FirmwareProfileMapping
)
from app.schemas.pack import PackLiveState
from app.schemas.alerts import HealthGrade, DetectedAlert, AlertSeverity, AlertConditionType
from app.schemas.abuse import WarrantyAbuseEvent
from app.services.ingestion import ingestion_service
from app.services.diagnostics import diagnostics_engine

class DashboardDataStore:
    def __init__(self):
        self._initialized = False
        self._packs: Dict[str, Dict[str, Any]] = {}
        self._alerts: Dict[str, DetailedAlert] = {}
        self._work_orders: Dict[str, WorkOrder] = {}
        self._modules: Dict[str, DeviceModuleItem] = {}
        self._firmware_mappings: List[FirmwareProfileMapping] = []
        
        # Don't auto-seed in test environments so unit tests start clean
        is_testing = any("pytest" in mod for mod in sys.modules) or "pytest" in sys.argv[0]
        if not is_testing:
            self.seed_mock_data()

    def seed_mock_data(self):
        now = datetime.now(timezone.utc)

        # 1. Firmware Mappings
        self._firmware_mappings = [
            FirmwareProfileMapping(
                id=1,
                firmware_version="SWP10_V2.1.0",
                bms_model_code="EVRBMS-SM10S030A0C-BUO",
                cell_channel_map=[1, 2, 3, 4, 5, 6, 7, 8, 9, 16],
                current_sign_convention="NEG_DISCHARGE",
                description="Default production firmware for 10S NMC packs",
                created_at=now - timedelta(days=120)
            ),
            FirmwareProfileMapping(
                id=2,
                firmware_version="SWP16_V1.0.0",
                bms_model_code="EVRBMS-SM16S060A0C-BUO",
                cell_channel_map=list(range(1, 17)),
                current_sign_convention="NEG_DISCHARGE",
                description="Default production firmware for 16S LFP Golf Cart packs",
                created_at=now - timedelta(days=90)
            ),
            FirmwareProfileMapping(
                id=3,
                firmware_version="SWP13_V1.1.2",
                bms_model_code="EVRBMS-SM13S045A0C-BUO",
                cell_channel_map=list(range(1, 14)),
                current_sign_convention="NEG_DISCHARGE",
                description="Production firmware for 13S NMC E-Mopeds",
                created_at=now - timedelta(days=60)
            )
        ]

        # 2. Key Mockup Packs
        # Pack 1: EVR-48105-0142 (Mockup #1 & #2 Hero Pack)
        voltages_16s = [3.28, 3.29, 3.27, 3.31, 3.30, 3.28, 3.26, 3.27, 3.19, 3.31, 3.28, 3.26, 3.27, 3.30, 3.31, 3.28]
        self._packs["EVR-48105-0142"] = {
            "pack_serial": "EVR-48105-0142",
            "ble_adv_name": "EVR051105-48105-0142",
            "commercial_name": "LADRIX Commercial Golf Cart 51.2V 105Ah",
            "chemistry": "LFP",
            "series_count": 16,
            "rated_capacity_ah": 105.0,
            "nominal_voltage": 51.2,
            "connectivity_mode": "LTEM_ACTIVE",
            "module_imei": "860432049104471",
            "vehicle_id": "SC-2210",
            "commissioned_date": "Jul 2025",
            "bms_model": "Smart BMS 48 V 105 A",
            "bms_firmware": "2.4.1",
            "soc_pct": 58.0,
            "soh_pct": 87.6,
            "health_grade": "B",
            "pack_voltage_v": 51.8,
            "pack_current_a": -24.6, # Discharging
            "max_temperature_c": 47.0,
            "imbalance_mv": 120.0,
            "weakest_cell_index": 9,
            "equivalent_cycles": 412,
            "throughput_mwh": 2.2,
            "active_critical_alerts": 1,
            "active_warning_alerts": 1,
            "warranty_status": "Valid",
            "abuse_overcurrent_count": 2,
            "abuse_overtemp_charge_count": 1,
            "abuse_deep_discharge_count": 0,
            "abuse_unapproved_charger_count": 0,
            "last_seen_utc": now - timedelta(seconds=12),
            "cell_voltages": voltages_16s,
            "location": PackLocation(
                latitude=30.0618,
                longitude=31.2201,
                accuracy_m=4.5,
                source="MODULE_GNSS",
                fix_age_s=12,
                address_snippet="Zamalek, Cairo"
            )
        }

        # Pack 2: EVR-C036014-131026-L1-164637 (Mockup #2 BLE Pack)
        voltages_10s = [3.89, 3.91, 3.84, 3.90, 3.92, 3.88, 3.91, 3.89, 3.90, 3.91]
        self._packs["EVR-C036014-131026-L1-164637"] = {
            "pack_serial": "EVR-C036014-131026-L1-164637",
            "ble_adv_name": "EVR036014-CFDFA8",
            "commercial_name": "LADRIX Kick Scooter 36V 14Ah",
            "chemistry": "NMC",
            "series_count": 10,
            "rated_capacity_ah": 14.0,
            "nominal_voltage": 36.0,
            "connectivity_mode": "BLE_ONLY",
            "module_imei": None,
            "vehicle_id": "KS-1049",
            "commissioned_date": "Aug 2025",
            "bms_model": "EVRAID Smart BMS 10S",
            "bms_firmware": "SWP10_V2.1.0",
            "soc_pct": 76.0,
            "soh_pct": 94.2,
            "health_grade": "A",
            "pack_voltage_v": 38.9,
            "pack_current_a": -8.4,
            "max_temperature_c": 33.5,
            "imbalance_mv": 70.0,
            "weakest_cell_index": 3,
            "equivalent_cycles": 185,
            "throughput_mwh": 0.09,
            "active_critical_alerts": 0,
            "active_warning_alerts": 0,
            "warranty_status": "Valid",
            "abuse_overcurrent_count": 0,
            "abuse_overtemp_charge_count": 0,
            "abuse_deep_discharge_count": 0,
            "abuse_unapproved_charger_count": 0,
            "last_seen_utc": now - timedelta(hours=2),
            "cell_voltages": voltages_10s,
            "location": PackLocation(
                latitude=29.9602,
                longitude=31.2568,
                accuracy_m=12.0,
                source="PHONE_GPS",
                fix_age_s=7200,
                address_snippet="Maadi, Cairo"
            )
        }

        # Pack 3: EVR-48015-0892 (Critical cell 9 under-voltage)
        voltages_13s = [3.75, 3.76, 3.74, 3.78, 3.75, 3.76, 3.77, 3.75, 2.71, 3.76, 3.74, 3.75, 3.76]
        self._packs["EVR-48015-0892"] = {
            "pack_serial": "EVR-48015-0892",
            "ble_adv_name": "EVR048015-0892",
            "commercial_name": "LADRIX E-Moped 48V 15Ah",
            "chemistry": "NMC",
            "series_count": 13,
            "rated_capacity_ah": 15.0,
            "nominal_voltage": 48.0,
            "connectivity_mode": "LTEM_ACTIVE",
            "module_imei": "860432049108920",
            "vehicle_id": "MP-4402",
            "commissioned_date": "Jan 2025",
            "bms_model": "EVRAID Smart BMS 13S",
            "bms_firmware": "SWP13_V1.1.2",
            "soc_pct": 18.0, # Need charging
            "soh_pct": 74.8,
            "health_grade": "C",
            "pack_voltage_v": 47.8,
            "pack_current_a": -12.0,
            "max_temperature_c": 41.0,
            "imbalance_mv": 1050.0,
            "weakest_cell_index": 9,
            "equivalent_cycles": 520,
            "throughput_mwh": 0.38,
            "active_critical_alerts": 1,
            "active_warning_alerts": 1,
            "warranty_status": "Review recommended",
            "abuse_overcurrent_count": 1,
            "abuse_overtemp_charge_count": 0,
            "abuse_deep_discharge_count": 2,
            "abuse_unapproved_charger_count": 0,
            "last_seen_utc": now - timedelta(minutes=18),
            "cell_voltages": voltages_13s,
            "location": PackLocation(
                latitude=30.0131,
                longitude=31.4289,
                accuracy_m=5.0,
                source="MODULE_GNSS",
                fix_age_s=1080,
                address_snippet="New Cairo"
            )
        }

        # Pack 4: EVR-036007-0341 (Severe degradation Grade D)
        voltages_d = [3.45, 3.48, 3.22, 3.49, 3.51, 3.46, 3.50, 3.47, 3.46, 3.48]
        self._packs["EVR-036007-0341"] = {
            "pack_serial": "EVR-036007-0341",
            "ble_adv_name": "EVR036007-0341",
            "commercial_name": "LADRIX Kick Scooter 36V 7.5Ah",
            "chemistry": "NMC",
            "series_count": 10,
            "rated_capacity_ah": 7.5,
            "nominal_voltage": 36.0,
            "connectivity_mode": "LTEM_ACTIVE",
            "module_imei": "860432049103410",
            "vehicle_id": "KS-0812",
            "commissioned_date": "May 2024",
            "bms_model": "EVRAID Smart BMS 10S",
            "bms_firmware": "SWP10_V2.1.0",
            "soc_pct": 12.0, # Need charging
            "soh_pct": 68.2,
            "health_grade": "D",
            "pack_voltage_v": 34.5,
            "pack_current_a": -5.2,
            "max_temperature_c": 38.0,
            "imbalance_mv": 290.0,
            "weakest_cell_index": 3,
            "equivalent_cycles": 610,
            "throughput_mwh": 0.16,
            "active_critical_alerts": 1,
            "active_warning_alerts": 0,
            "warranty_status": "Cycle limit reached",
            "abuse_overcurrent_count": 0,
            "abuse_overtemp_charge_count": 0,
            "abuse_deep_discharge_count": 4,
            "abuse_unapproved_charger_count": 1,
            "last_seen_utc": now - timedelta(minutes=26),
            "cell_voltages": voltages_d,
            "location": PackLocation(
                latitude=30.0389,
                longitude=31.2120,
                accuracy_m=6.2,
                source="MODULE_GNSS",
                fix_age_s=1560,
                address_snippet="Dokki, Giza"
            )
        }

        # Pack 5: EVR-48105-0219 (Pristine Grade A)
        voltages_a = [3.31] * 16
        self._packs["EVR-48105-0219"] = {
            "pack_serial": "EVR-48105-0219",
            "ble_adv_name": "EVR051105-48105-0219",
            "commercial_name": "LADRIX Commercial Golf Cart 51.2V 105Ah",
            "chemistry": "LFP",
            "series_count": 16,
            "rated_capacity_ah": 105.0,
            "nominal_voltage": 51.2,
            "connectivity_mode": "LTEM_ACTIVE",
            "module_imei": "860432049102190",
            "vehicle_id": "GC-104",
            "commissioned_date": "Sep 2025",
            "bms_model": "Smart BMS 48 V 105 A",
            "bms_firmware": "SWP16_V1.0.0",
            "soc_pct": 92.0,
            "soh_pct": 98.1,
            "health_grade": "A",
            "pack_voltage_v": 53.0,
            "pack_current_a": 15.0, # Charging
            "max_temperature_c": 31.0,
            "imbalance_mv": 12.0,
            "weakest_cell_index": 1,
            "equivalent_cycles": 64,
            "throughput_mwh": 0.34,
            "active_critical_alerts": 0,
            "active_warning_alerts": 0,
            "warranty_status": "Valid",
            "abuse_overcurrent_count": 0,
            "abuse_overtemp_charge_count": 0,
            "abuse_deep_discharge_count": 0,
            "abuse_unapproved_charger_count": 0,
            "last_seen_utc": now - timedelta(seconds=45),
            "cell_voltages": voltages_a,
            "location": PackLocation(
                latitude=29.9800,
                longitude=30.9500,
                accuracy_m=3.8,
                source="MODULE_GNSS",
                fix_age_s=45,
                address_snippet="6th of October City"
            )
        }

        # Only register into ingestion_service._pack_live_states if not running pytest
        is_testing = any("pytest" in mod for mod in sys.modules) or "pytest" in sys.argv[0]
        if not is_testing:
            ingestion_service._pack_live_states["EVR-48105-0142"] = PackLiveState(
                pack_serial="EVR-48105-0142",
                last_seen_utc=now - timedelta(seconds=12),
                source_type="LTEM_MODULE",
                source_id="imei_4471",
                soc_pct=58.0,
                soh_pct=87.6,
                health_grade=HealthGrade.B,
                pack_voltage_v=51.8,
                pack_current_a=-24.6,
                max_temperature_c=47.0,
                imbalance_mv=120.0,
                weakest_cell_index=9,
                cell_voltages=voltages_16s,
                active_critical_alerts=1,
                active_warning_alerts=1,
                warranty_status="Valid",
                abuse_events_count=3,
                recent_alerts=[
                    DetectedAlert(
                        pack_serial="EVR-48105-0142",
                        condition_type=AlertConditionType.THERMAL_RUNAWAY_RATE,
                        severity=AlertSeverity.CRITICAL,
                        message="Thermal rise rate exceeds safe threshold (+2.1 °C/min)",
                        sensor_label="sensor T3",
                        measured_value=2.1,
                        threshold_value=2.0,
                        recommended_action="Stop vehicle immediately, move pack to open area, inspect sensor T3 and cell 9 area.",
                        timestamp_utc=now - timedelta(minutes=4)
                    ),
                    DetectedAlert(
                        pack_serial="EVR-48105-0142",
                        condition_type=AlertConditionType.CELL_IMBALANCE,
                        severity=AlertSeverity.WARNING,
                        message="Cell imbalance 120 mV exceeds warning threshold 80 mV",
                        sensor_label="cell 9",
                        measured_value=120.0,
                        threshold_value=80.0,
                        recommended_action="Schedule cell re-balancing at next depot charge cycle.",
                        timestamp_utc=now - timedelta(hours=2)
                    )
                ]
            )

        # 3. Alerts Matching Mockup #1 & #3
        alert1 = DetailedAlert(
            id="ALT-2026-001",
            pack_serial="EVR-48105-0142",
            vehicle_id="SC-2210",
            location_label="Zamalek, Cairo",
            alert_type="THERMAL_RUNAWAY_RATE",
            alert_name="Temperature rising 2.1 °C/min",
            sensor_label="sensor T3",
            severity="CRITICAL",
            raised_at=now - timedelta(minutes=4),
            age_str="4 min ago",
            status="New",
            assignee=None,
            recommended_action="Stop the vehicle, move the pack to a safe open area, and inspect sensor T3 and the cell 9 area.",
            delivery_channels=["dashboard", "email", "SMS to Ops desk"],
            work_order=None
        )
        alert2 = DetailedAlert(
            id="ALT-2026-002",
            pack_serial="EVR-48015-0892",
            vehicle_id="MP-4402",
            location_label="New Cairo",
            alert_type="CELL_UNDERVOLTAGE",
            alert_name="Cell 9 under-voltage, 2.71 V",
            sensor_label="cell 9",
            severity="CRITICAL",
            raised_at=now - timedelta(minutes=18),
            age_str="18 min ago",
            status="In progress",
            assignee="Field team A",
            recommended_action="Isolate pack from moped, check cell 9 for internal micro-short or BMS sense lead fault.",
            delivery_channels=["dashboard", "email"],
            work_order=WorkOrder(
                id="WO-0102",
                alert_id="ALT-2026-002",
                pack_serial="EVR-48015-0892",
                title="Inspect cell 9 under-voltage on MP-4402",
                status="IN PROGRESS",
                priority="Urgent",
                assigned_to="Field team A",
                due_date="Today 18:00",
                notes="Technician dispatched to New Cairo station 4",
                created_at=now - timedelta(minutes=15),
                updated_at=now - timedelta(minutes=5)
            )
        )
        alert3 = DetailedAlert(
            id="ALT-2026-003",
            pack_serial="EVR-036007-0341",
            vehicle_id="KS-0812",
            location_label="Dokki, Giza",
            alert_type="SUDDEN_VOLTAGE_DROP",
            alert_name="Sudden cell voltage drop",
            sensor_label="cell 3",
            severity="CRITICAL",
            raised_at=now - timedelta(minutes=26),
            age_str="26 min ago",
            status="Acknowledged",
            assignee="Field team B",
            recommended_action="Retrieve scooter to depot, verify cell tap connection 3.",
            delivery_channels=["dashboard", "email"],
            acknowledged_at=now - timedelta(minutes=20),
            acknowledged_by="Hassan (Ops)",
            work_order=WorkOrder(
                id="WO-0103",
                alert_id="ALT-2026-003",
                pack_serial="EVR-036007-0341",
                title="Retrieve scooter KS-0812 for cell tap inspection",
                status="TO DO",
                priority="High",
                assigned_to="Field team B",
                due_date="Tomorrow 10:00",
                notes="Assigned from critical alerts table",
                created_at=now - timedelta(minutes=19),
                updated_at=now - timedelta(minutes=19)
            )
        )
        alert4 = DetailedAlert(
            id="ALT-2026-004",
            pack_serial="EVR-48105-0142",
            vehicle_id="SC-2210",
            location_label="Zamalek, Cairo",
            alert_type="CELL_IMBALANCE_WARNING",
            alert_name="Cell imbalance 120 mV exceeds threshold",
            sensor_label="cell 9",
            severity="WARNING",
            raised_at=now - timedelta(hours=2),
            age_str="2 h ago",
            status="Acknowledged",
            assignee="Depot Charging Desk",
            recommended_action="Execute overnight passive balancing cycle on standard charger.",
            delivery_channels=["dashboard"],
            work_order=WorkOrder(
                id="WO-0098",
                alert_id="ALT-2026-004",
                pack_serial="EVR-48105-0142",
                title="Overnight depot balancing cycle",
                status="WAITING ON EVRAID",
                priority="Normal",
                assigned_to="EVRaid Support",
                due_date="Nov 10",
                notes="Warranty claim review & evidence attached",
                created_at=now - timedelta(hours=2),
                updated_at=now - timedelta(hours=1)
            )
        )
        alert5 = DetailedAlert(
            id="ALT-2026-005",
            pack_serial="EVR-48105-0219",
            vehicle_id="GC-104",
            location_label="6th of October City",
            alert_type="ROUTINE_CYCLE_MILESTONE",
            alert_name="Pack reached 50 cycles milestone",
            sensor_label=None,
            severity="INFO",
            raised_at=now - timedelta(days=2),
            age_str="2 days ago",
            status="Closed",
            assignee="Auto-system",
            recommended_action="No action required.",
            delivery_channels=["dashboard"],
            work_order=WorkOrder(
                id="WO-0089",
                alert_id="ALT-2026-005",
                pack_serial="EVR-48105-0219",
                title="50-cycle log verification",
                status="DONE THIS WEEK",
                priority="Normal",
                assigned_to="Auto-system",
                due_date="Nov 06",
                notes="Auto-verified healthy delta V",
                created_at=now - timedelta(days=2),
                updated_at=now - timedelta(days=1)
            )
        )

        for a in [alert1, alert2, alert3, alert4, alert5]:
            self._alerts[a.id] = a
            if a.work_order:
                self._work_orders[a.work_order.id] = a.work_order

        # 4. Device Modules Matching Mockup #4
        self._modules = {
            "860432049104471": DeviceModuleItem(
                imei="860432049104471",
                iccid="8920000000000004471",
                pack_serial="EVR-48105-0142",
                vehicle_id="SC-2210",
                network="LTE-M",
                rssi_dbm=-75,
                signal_bars=4,
                bms_firmware="2.4.1",
                has_fw_update=True,
                status="Online",
                last_seen_utc=now - timedelta(seconds=12),
                last_seen_str="12 s ago"
            ),
            "860432049108920": DeviceModuleItem(
                imei="860432049108920",
                iccid="8920000000000008920",
                pack_serial="EVR-48015-0892",
                vehicle_id="MP-4402",
                network="LTE-M",
                rssi_dbm=-82,
                signal_bars=3,
                bms_firmware="SWP13_V1.1.2",
                has_fw_update=False,
                status="Online",
                last_seen_utc=now - timedelta(minutes=18),
                last_seen_str="18 min ago"
            ),
            "860432049103410": DeviceModuleItem(
                imei="860432049103410",
                iccid="8920000000000003410",
                pack_serial="EVR-036007-0341",
                vehicle_id="KS-0812",
                network="2G fallback",
                rssi_dbm=-104,
                signal_bars=1,
                bms_firmware="SWP10_V2.1.0",
                has_fw_update=False,
                status="Online",
                last_seen_utc=now - timedelta(minutes=26),
                last_seen_str="26 min ago"
            ),
            "860432049102190": DeviceModuleItem(
                imei="860432049102190",
                iccid="8920000000000002190",
                pack_serial="EVR-48105-0219",
                vehicle_id="GC-104",
                network="LTE-M",
                rssi_dbm=-68,
                signal_bars=4,
                bms_firmware="SWP16_V1.0.0",
                has_fw_update=False,
                status="Online",
                last_seen_utc=now - timedelta(seconds=45),
                last_seen_str="45 s ago"
            ),
            "860432049109999": DeviceModuleItem(
                imei="860432049109999",
                iccid="8920000000000009999",
                pack_serial=None, # Unassigned spare module
                vehicle_id=None,
                network="LTE-M",
                rssi_dbm=-90,
                signal_bars=2,
                bms_firmware="SWP16_V1.0.0",
                has_fw_update=False,
                status="Offline",
                last_seen_utc=now - timedelta(days=5),
                last_seen_str="5 days ago"
            )
        }
        self._initialized = True

    # --- Fleet Overview API ---
    def get_fleet_overview(self, fleet_id: int) -> FleetOverviewResponse:
        if not self._initialized:
            self.seed_mock_data()

        now = datetime.now(timezone.utc)
        
        # 12-Month SOH Trend matching Mockup #1 (96% -> 91.4%)
        months = ["Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26", "Jul 26", "Aug 26", "Sep 26", "Oct 26"]
        trend_vals = [96.0, 95.6, 95.1, 94.7, 94.2, 93.8, 93.3, 92.9, 92.4, 92.0, 91.7, 91.4]
        trend = [MonthlySohTrendPoint(month=m, avg_soh=v) for m, v in zip(months, trend_vals)]

        # Health Grade Distribution matching Mockup #1
        health_bars = [
            HealthGradeBar(grade="A", label="SOH ≥ 90%", count=780, pct=65.0, color="#16A34A"),
            HealthGradeBar(grade="B", label="80–90%", count=312, pct=26.0, color="#34D399"),
            HealthGradeBar(grade="C", label="70–80%", count=84, pct=7.0, color="#D97706"),
            HealthGradeBar(grade="D", label="below 70%", count=24, pct=2.0, color="#DC2626"),
        ]

        # Open Critical Alerts
        crit_alerts = [
            CriticalAlertOverviewItem(
                id=a.id,
                pack_serial=a.pack_serial,
                alert_name=a.alert_name,
                sensor_label=a.sensor_label,
                severity=a.severity,
                age_str=a.age_str,
                status="Unassigned" if not a.assignee else "Assigned",
                raised_at=a.raised_at
            )
            for a in self._alerts.values() if a.severity == "CRITICAL" and a.status != "Closed"
        ]

        # Packs Needing Attention matching Mockup #1
        packs_attn = [
            PackNeedingAttentionItem(
                pack_serial="EVR-036007-0341",
                soh_pct=68.2,
                cycles=610,
                health_grade="D",
                imbalance_mv=290.0,
                status="Degraded SOH",
                vehicle_id="KS-0812"
            ),
            PackNeedingAttentionItem(
                pack_serial="EVR-48015-0892",
                soh_pct=74.8,
                cycles=520,
                health_grade="C",
                imbalance_mv=1050.0,
                status="Low SOH & Cell fault",
                vehicle_id="MP-4402"
            ),
            PackNeedingAttentionItem(
                pack_serial="EVR-48105-0142",
                soh_pct=87.6,
                cycles=412,
                health_grade="B",
                imbalance_mv=120.0,
                status="Cell imbalance 120 mV",
                vehicle_id="SC-2210"
            )
        ]

        return FleetOverviewResponse(
            fleet_id=fleet_id,
            fleet_name="Cairo fleet",
            operator_name="Demo Operator",
            updated_at=now,
            kpis=OverviewKpis(
                packs_online=OnlineKpi(online=1185, total=1200, pct_reported_today=98.8),
                avg_soh=SohKpi(value=91.4, delta_90d=-0.6),
                open_alerts=OpenAlertsKpi(total=23, critical=3, warning=12, info=8),
                need_charging=NeedChargingKpi(count=42, threshold_pct=20.0),
                avg_efc=EfcKpi(value=384.0, highest_pack=1240.0)
            ),
            health_grades=health_bars,
            soh_12m_trend=trend,
            open_critical_alerts=crit_alerts,
            packs_needing_attention=packs_attn
        )

    # --- Pack Query and History ---
    def get_packs(
        self,
        q: Optional[str] = None,
        grade: Optional[str] = None,
        chemistry: Optional[str] = None,
        connectivity: Optional[str] = None,
        status_filter: Optional[str] = None,
        sort_by: str = "last_seen",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 50
    ) -> PackListResponse:
        if not self._initialized:
            self.seed_mock_data()

        items = list(self._packs.values())

        # Filtering
        if q:
            ql = q.lower()
            items = [
                p for p in items
                if ql in p["pack_serial"].lower()
                or (p.get("ble_adv_name") and ql in p["ble_adv_name"].lower())
                or (p.get("module_imei") and ql in p["module_imei"].lower())
                or (p.get("vehicle_id") and ql in p["vehicle_id"].lower())
            ]
        if grade:
            items = [p for p in items if p["health_grade"].upper() == grade.upper()]
        if chemistry:
            items = [p for p in items if p["chemistry"].upper() == chemistry.upper()]
        if connectivity:
            items = [p for p in items if p["connectivity_mode"].upper() == connectivity.upper()]
        if status_filter:
            if status_filter == "need_charging":
                items = [p for p in items if p["soc_pct"] < 20.0]
            elif status_filter == "critical_alert":
                items = [p for p in items if p["active_critical_alerts"] > 0]

        # Sorting
        reverse = (sort_order.lower() == "desc")
        if sort_by == "soh_pct":
            items.sort(key=lambda x: x["soh_pct"], reverse=reverse)
        elif sort_by == "soc_pct":
            items.sort(key=lambda x: x["soc_pct"], reverse=reverse)
        elif sort_by == "efc":
            items.sort(key=lambda x: x["equivalent_cycles"], reverse=reverse)
        elif sort_by == "imbalance_mv":
            items.sort(key=lambda x: x["imbalance_mv"], reverse=reverse)
        else: # last_seen
            items.sort(key=lambda x: x["last_seen_utc"], reverse=reverse)

        total = len(items)
        start = (page - 1) * page_size
        paged_items = items[start:start + page_size]

        formatted_items = [
            PackListItem(
                pack_serial=p["pack_serial"],
                ble_adv_name=p.get("ble_adv_name"),
                vehicle_id=p.get("vehicle_id"),
                module_imei=p.get("module_imei"),
                commercial_name=p["commercial_name"],
                chemistry=p["chemistry"],
                series_count=p["series_count"],
                rated_capacity_ah=p["rated_capacity_ah"],
                connectivity_mode=p["connectivity_mode"],
                health_grade=p["health_grade"],
                soc_pct=p["soc_pct"],
                soh_pct=p["soh_pct"],
                pack_voltage_v=p["pack_voltage_v"],
                pack_current_a=p["pack_current_a"],
                imbalance_mv=p["imbalance_mv"],
                max_temperature_c=p["max_temperature_c"],
                equivalent_cycles=p["equivalent_cycles"],
                active_critical_alerts=p["active_critical_alerts"],
                active_warning_alerts=p["active_warning_alerts"],
                warranty_status=p["warranty_status"],
                last_seen_utc=p["last_seen_utc"],
                location=p.get("location")
            )
            for p in paged_items
        ]

        return PackListResponse(total=total, page=page, page_size=page_size, items=formatted_items)

    def register_pack(self, req: PackRegisterRequest) -> PackListItem:
        now = datetime.now(timezone.utc)
        cell_count = req.series_count
        nominal_cell_v = 3.2 if req.chemistry == "LFP" else 3.7
        voltages = [nominal_cell_v] * cell_count

        new_pack = {
            "pack_serial": req.serial_number,
            "ble_adv_name": req.ble_adv_name or f"EVR-{req.serial_number[-6:]}",
            "commercial_name": req.commercial_name,
            "chemistry": req.chemistry,
            "series_count": req.series_count,
            "rated_capacity_ah": req.rated_capacity_ah,
            "nominal_voltage": req.nominal_voltage,
            "connectivity_mode": req.connectivity_mode,
            "module_imei": req.module_imei,
            "vehicle_id": req.vehicle_id or "UNASSIGNED",
            "commissioned_date": now.strftime("%b %Y"),
            "bms_model": "EVRAID Smart BMS",
            "bms_firmware": req.bms_firmware_version,
            "soc_pct": 100.0,
            "soh_pct": 100.0,
            "health_grade": "A",
            "pack_voltage_v": round(nominal_cell_v * cell_count, 1),
            "pack_current_a": 0.0,
            "max_temperature_c": 25.0,
            "imbalance_mv": 5.0,
            "weakest_cell_index": 1,
            "equivalent_cycles": 0,
            "throughput_mwh": 0.0,
            "active_critical_alerts": 0,
            "active_warning_alerts": 0,
            "warranty_status": "Valid",
            "abuse_overcurrent_count": 0,
            "abuse_overtemp_charge_count": 0,
            "abuse_deep_discharge_count": 0,
            "abuse_unapproved_charger_count": 0,
            "last_seen_utc": now,
            "cell_voltages": voltages,
            "location": PackLocation(
                latitude=30.0444,
                longitude=31.2357,
                accuracy_m=10.0,
                source="PHONE_GPS",
                fix_age_s=0,
                address_snippet="Cairo Depot"
            )
        }
        self._packs[req.serial_number] = new_pack
        
        # Also register live state
        ingestion_service._pack_live_states[req.serial_number] = PackLiveState(
            pack_serial=req.serial_number,
            last_seen_utc=now,
            source_type=req.connectivity_mode,
            source_id="manual_registration",
            soc_pct=100.0,
            soh_pct=100.0,
            health_grade=HealthGrade.A,
            pack_voltage_v=new_pack["pack_voltage_v"],
            pack_current_a=0.0,
            max_temperature_c=25.0,
            imbalance_mv=5.0,
            weakest_cell_index=1,
            cell_voltages=voltages,
            active_critical_alerts=0,
            active_warning_alerts=0,
            warranty_status="Valid",
            abuse_events_count=0
        )

        return PackListItem(
            pack_serial=new_pack["pack_serial"],
            ble_adv_name=new_pack["ble_adv_name"],
            vehicle_id=new_pack["vehicle_id"],
            module_imei=new_pack["module_imei"],
            commercial_name=new_pack["commercial_name"],
            chemistry=new_pack["chemistry"],
            series_count=new_pack["series_count"],
            rated_capacity_ah=new_pack["rated_capacity_ah"],
            connectivity_mode=new_pack["connectivity_mode"],
            health_grade=new_pack["health_grade"],
            soc_pct=new_pack["soc_pct"],
            soh_pct=new_pack["soh_pct"],
            pack_voltage_v=new_pack["pack_voltage_v"],
            pack_current_a=new_pack["pack_current_a"],
            imbalance_mv=new_pack["imbalance_mv"],
            max_temperature_c=new_pack["max_temperature_c"],
            equivalent_cycles=new_pack["equivalent_cycles"],
            active_critical_alerts=new_pack["active_critical_alerts"],
            active_warning_alerts=new_pack["active_warning_alerts"],
            warranty_status=new_pack["warranty_status"],
            last_seen_utc=new_pack["last_seen_utc"],
            location=new_pack["location"]
        )

    def get_pack_history(self, serial: str) -> PackHistoryResponse:
        now = datetime.now(timezone.utc)
        pack = self._packs.get(serial)
        current_soh = pack["soh_pct"] if pack else 87.6

        # SOH history & projection points matching Mockup #2
        # History: 100% (Jul 25) -> 97% -> 94% -> 91% -> 87.6% (today)
        # Projection: 85% -> 82% -> 80% in ~8 months
        history_points = [
            SohProjectionPoint(month="Jul 25", soh_pct=100.0, is_projection=False),
            SohProjectionPoint(month="Oct 25", soh_pct=97.2, is_projection=False),
            SohProjectionPoint(month="Jan 26", soh_pct=94.1, is_projection=False),
            SohProjectionPoint(month="Apr 26", soh_pct=91.5, is_projection=False),
            SohProjectionPoint(month="Jul 26", soh_pct=89.0, is_projection=False),
            SohProjectionPoint(month="Oct 26", soh_pct=current_soh, is_projection=False),
            # Projected linear fade
            SohProjectionPoint(month="Jan 27", soh_pct=round(current_soh - 2.8, 1), is_projection=True),
            SohProjectionPoint(month="Apr 27", soh_pct=round(current_soh - 5.6, 1), is_projection=True),
            SohProjectionPoint(month="Jun 27", soh_pct=80.0, is_projection=True),
            SohProjectionPoint(month="Jul 27", soh_pct=78.5, is_projection=True)
        ]

        usage = UsageProfile(
            dod_distribution=[
                DodDistribution(range_label="0–20%", pct=15.0),
                DodDistribution(range_label="20–40%", pct=28.0),
                DodDistribution(range_label="40–60%", pct=35.0),
                DodDistribution(range_label="60–80%", pct=16.0),
                DodDistribution(range_label="80–100%", pct=6.0),
            ],
            time_above_95_pct_soc=6.0,
            avg_charge_c_rate=0.4,
            time_above_45c=1.2
        )

        location_trail = [
            LocationTrailPoint(lat=30.0618, lng=31.2201, timestamp_utc=now - timedelta(minutes=5), source="MODULE_GNSS", speed_kmh=18.5),
            LocationTrailPoint(lat=30.0601, lng=31.2215, timestamp_utc=now - timedelta(minutes=15), source="MODULE_GNSS", speed_kmh=22.0),
            LocationTrailPoint(lat=30.0575, lng=31.2230, timestamp_utc=now - timedelta(minutes=30), source="MODULE_GNSS", speed_kmh=0.0),
            LocationTrailPoint(lat=30.0550, lng=31.2245, timestamp_utc=now - timedelta(hours=1), source="MODULE_GNSS", speed_kmh=14.0),
            LocationTrailPoint(lat=30.0520, lng=31.2260, timestamp_utc=now - timedelta(hours=2), source="MODULE_GNSS", speed_kmh=0.0)
        ]

        raw_telemetry = [
            RawTelemetrySample(
                timestamp_utc=now - timedelta(seconds=12),
                sequence_num=4120,
                source_type="LTEM_MODULE",
                source_id="imei_4471",
                soc_pct=58.0,
                soh_pct=87.6,
                voltage_v=51.8,
                current_a=-24.6,
                max_temp_c=47.0,
                imbalance_mv=120.0,
                raw_payload={
                    "bms_state": 2,
                    "cells": pack["cell_voltages"] if pack else [3.28]*16,
                    "mosfet_temp": 48.0,
                    "rssi": -75,
                    "fets": {"charge": True, "discharge": True}
                }
            ),
            RawTelemetrySample(
                timestamp_utc=now - timedelta(seconds=42),
                sequence_num=4119,
                source_type="LTEM_MODULE",
                source_id="imei_4471",
                soc_pct=58.2,
                soh_pct=87.6,
                voltage_v=51.9,
                current_a=-23.8,
                max_temp_c=46.5,
                imbalance_mv=118.0,
                raw_payload={"bms_state": 2, "mosfet_temp": 47.5, "rssi": -76}
            )
        ]

        return PackHistoryResponse(
            pack_serial=serial,
            soh_history_and_projection=history_points,
            months_to_80_pct_eol=8.0,
            usage_profile=usage,
            location_trail=location_trail,
            raw_telemetry=raw_telemetry
        )

    def run_pack_diagnostics(self, serial: str) -> Dict[str, Any]:
        pack = self._packs.get(serial)
        live_state = ingestion_service.get_pack_live_state(serial)
        
        now = datetime.now(timezone.utc)
        # Recalculate diagnostics snapshot
        return {
            "pack_serial": serial,
            "recalculated_at": now.isoformat(),
            "status": "DIAGNOSTIC_COMPLETED",
            "health_grade": live_state.health_grade.value if live_state else (pack["health_grade"] if pack else "B"),
            "soh_pct": live_state.soh_pct if live_state else 87.6,
            "imbalance_mv": live_state.imbalance_mv if live_state else 120.0,
            "weakest_cell_index": live_state.weakest_cell_index if live_state else 9,
            "abuse_events_count": live_state.abuse_events_count if live_state else 3,
            "active_alerts_count": (live_state.active_critical_alerts + live_state.active_warning_alerts) if live_state else 2,
            "message": "Physics cloud snapshot successfully re-evaluated against latest battery telemetry."
        }

    # --- Alerts & Work Orders API ---
    def get_alerts(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        assignee: Optional[str] = None
    ) -> List[DetailedAlert]:
        if not self._initialized:
            self.seed_mock_data()

        alerts = list(self._alerts.values())
        if severity:
            alerts = [a for a in alerts if a.severity.upper() == severity.upper()]
        if status:
            if status.lower() == "open":
                alerts = [a for a in alerts if a.status != "Closed"]
            elif status.lower() == "closed":
                alerts = [a for a in alerts if a.status == "Closed"]
            else:
                alerts = [a for a in alerts if a.status.lower() == status.lower()]
        if assignee:
            if assignee == "assigned_to_me":
                alerts = [a for a in alerts if a.assignee and "me" in a.assignee.lower()]
            else:
                alerts = [a for a in alerts if a.assignee and assignee.lower() in a.assignee.lower()]

        alerts.sort(key=lambda a: a.raised_at, reverse=True)
        return alerts

    def acknowledge_alert(self, alert_id: str, user_name: str = "Current User") -> DetailedAlert:
        if alert_id not in self._alerts:
            raise KeyError(f"Alert {alert_id} not found")
        
        now = datetime.now(timezone.utc)
        alert = self._alerts[alert_id]
        alert.status = "Acknowledged"
        alert.acknowledged_at = now
        alert.acknowledged_by = user_name
        return alert

    def assign_alert_and_create_work_order(self, alert_id: str, req: AlertAssignRequest) -> DetailedAlert:
        if alert_id not in self._alerts:
            raise KeyError(f"Alert {alert_id} not found")

        now = datetime.now(timezone.utc)
        alert = self._alerts[alert_id]
        alert.status = "In progress"
        alert.assignee = req.assign_to
        if not alert.acknowledged_at:
            alert.acknowledged_at = now
            alert.acknowledged_by = "Ops Lead"

        wo_id = f"WO-{len(self._work_orders) + 101:04d}"
        status_board = "WAITING ON EVRAID" if req.escalate_to_evraid else req.status

        work_order = WorkOrder(
            id=wo_id,
            alert_id=alert_id,
            pack_serial=alert.pack_serial,
            title=f"Work Order: {alert.alert_name} ({alert.pack_serial})",
            status=status_board,
            priority=req.priority,
            assigned_to=req.assign_to,
            due_date=req.due_date or (now + timedelta(days=2)).strftime("%b %d"),
            notes=req.notes,
            created_at=now,
            updated_at=now
        )
        self._work_orders[wo_id] = work_order
        alert.work_order = work_order
        return alert

    def get_work_orders(self) -> List[WorkOrder]:
        if not self._initialized:
            self.seed_mock_data()
        return list(self._work_orders.values())

    # --- Devices & Modules API ---
    def get_modules(self) -> List[DeviceModuleItem]:
        if not self._initialized:
            self.seed_mock_data()
        return list(self._modules.values())

    def link_module(self, req: DeviceLinkModuleRequest) -> DeviceModuleItem:
        now = datetime.now(timezone.utc)
        imei = req.imei
        pack_serial = req.pack_serial

        # Unlink any existing module for this pack
        for m in self._modules.values():
            if m.pack_serial == pack_serial:
                m.pack_serial = None

        if imei in self._modules:
            mod = self._modules[imei]
            mod.pack_serial = pack_serial
            mod.last_seen_utc = now
            mod.last_seen_str = "Just now"
        else:
            mod = DeviceModuleItem(
                imei=imei,
                iccid=req.iccid or f"8920000000000{imei[-7:]}",
                pack_serial=pack_serial,
                vehicle_id="SC-AUTO",
                network="LTE-M",
                rssi_dbm=-75,
                signal_bars=4,
                bms_firmware="SWP16_V1.0.0",
                has_fw_update=False,
                status="Online",
                last_seen_utc=now,
                last_seen_str="Just now"
            )
            self._modules[imei] = mod

        # Also update pack record
        if pack_serial in self._packs:
            self._packs[pack_serial]["module_imei"] = imei
            self._packs[pack_serial]["connectivity_mode"] = "LTEM_ACTIVE"

        return mod

    # --- Admin Mappings API ---
    def get_firmware_mappings(self) -> List[FirmwareProfileMapping]:
        if not self._initialized:
            self.seed_mock_data()
        return self._firmware_mappings

    def update_firmware_mapping(self, mapping: FirmwareProfileMapping) -> FirmwareProfileMapping:
        for idx, m in enumerate(self._firmware_mappings):
            if m.id == mapping.id or m.firmware_version == mapping.firmware_version:
                self._firmware_mappings[idx] = mapping
                return mapping
        self._firmware_mappings.append(mapping)
        return mapping

dashboard_data_store = DashboardDataStore()
