import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_end_to_end_ingest_and_live_pack_state():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        serial = "EVR-48105-0142"

        # 1. Query live state before ingest -> Expect 404
        resp_before = await ac.get(f"/v1/packs/{serial}/live")
        assert resp_before.status_code == 404

        # 2. Ingest payload matching mockup: 16S LFP, 87.6% SOH, Cell 9 is weakest (3.19V)
        voltages_16s = [3.28, 3.29, 3.27, 3.31, 3.30, 3.28, 3.26, 3.27, 3.19, 3.31, 3.28, 3.26, 3.27, 3.30, 3.31, 3.28]
        ingest_payload = {
            "records": [
                {
                    "pack_serial": serial,
                    "metadata": {
                        "source_type": "LTEM_MODULE",
                        "source_id": "imei_4471",
                        "bms_fw_version": "2.4.1",
                        "sequence_num": 1,
                        "timestamp_utc": "2026-11-02T14:00:00Z",
                        "buffered": False
                    },
                    "electrical": {
                        "pack_voltage_v": 51.8,
                        "pack_current_a": -24.6, # Discharging
                        "soc_pct": 58.0,
                        "soh_pct": 87.6,
                        "state": "DISCHARGING",
                        "lifetime_energy_kwh": 2.2,
                        "rated_capacity_ah": 105.0
                    },
                    "cells": {
                        "connected_count": 16,
                        "voltages_v": voltages_16s,
                        "min_voltage_v": 3.19,
                        "max_voltage_v": 3.31,
                        "avg_voltage_v": 3.29,
                        "imbalance_mv": 120.0,
                        "weakest_cell_index": 9
                    },
                    "thermal": {
                        "cell_temperatures_c": [47.0, 46.5, 47.0],
                        "max_cell_temp_c": 47.0,
                        "mosfet_temp_c": 48.0
                    },
                    "status_and_faults": {
                        "bms_state_code": 2,
                        "balancing_active": False,
                        "charge_fet_enabled": True,
                        "discharge_fet_enabled": True,
                        "raw_fault_flags": 0,
                        "active_alarms": []
                    }
                }
            ]
        }

        resp_ingest = await ac.post("/v1/telemetry/batch", json=ingest_payload)
        assert resp_ingest.status_code == 200
        assert resp_ingest.json()["accepted_count"] == 1

        # 3. Query live state after ingest -> Expect full live view matching Mockup
        resp_live = await ac.get(f"/v1/packs/{serial}/live")
        assert resp_live.status_code == 200
        live_data = resp_live.json()

        assert live_data["pack_serial"] == serial
        assert live_data["soc_pct"] == 58.0
        assert live_data["soh_pct"] == 87.6
        assert live_data["health_grade"] == "B"
        assert live_data["pack_voltage_v"] == 51.8
        assert live_data["pack_current_a"] == -24.6
        assert live_data["imbalance_mv"] == 120.0
        assert live_data["weakest_cell_index"] == 9
        assert live_data["active_warning_alerts"] == 1 # High imbalance
        assert live_data["warranty_status"] == "Valid"

@pytest.mark.asyncio
async def test_end_to_end_abuse_detection_and_warranty_evidence():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        serial = "EVR-ABUSE-TEST"
        now = datetime.now(timezone.utc)

        # Ingest a severe deep discharge reading (< 2.50V on LFP)
        abuse_payload = {
            "records": [
                {
                    "pack_serial": serial,
                    "metadata": {
                        "source_type": "BLE_APP",
                        "source_id": "tech_01",
                        "bms_fw_version": "SWP10_V2.1.0",
                        "sequence_num": 500,
                        "timestamp_utc": now.isoformat(),
                        "buffered": False
                    },
                    "electrical": {
                        "pack_voltage_v": 24.0,
                        "pack_current_a": 0.0,
                        "soc_pct": 2.0,
                        "soh_pct": 75.0,
                        "state": "STANDBY"
                    },
                    "cells": {
                        "connected_count": 10,
                        "voltages_v": [2.40, 2.38, 2.35, 2.42, 2.41, 2.39, 2.40, 2.38, 2.40, 2.41],
                        "min_voltage_v": 2.35,
                        "max_voltage_v": 2.42,
                        "avg_voltage_v": 2.39,
                        "imbalance_mv": 70.0,
                        "weakest_cell_index": 3
                    },
                    "thermal": {
                        "cell_temperatures_c": [25.0],
                        "max_cell_temp_c": 25.0
                    },
                    "status_and_faults": {
                        "raw_fault_flags": 0
                    }
                }
            ]
        }

        resp_ingest = await ac.post("/v1/telemetry/batch", json=abuse_payload)
        assert resp_ingest.status_code == 200

        # Query live state -> Warranty should flag "Review recommended" & register permanent evidence
        resp_live = await ac.get(f"/v1/packs/{serial}/live")
        assert resp_live.status_code == 200
        live = resp_live.json()

        assert live["warranty_status"] == "Review recommended"
        assert live["abuse_events_count"] >= 1
        assert len(live["abuse_events"]) >= 1
        assert live["abuse_events"][0]["event_type"] == "DEEP_DISCHARGE"

