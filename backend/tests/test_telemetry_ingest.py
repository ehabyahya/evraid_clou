import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": "0.1.0"}

@pytest.mark.asyncio
async def test_batch_ingest_ble_sample_and_deduplication():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Sample payload representing a real BLE app reading for a 10S NMC pack
        payload = {
            "records": [
                {
                    "pack_serial": "EVR-C036014-131026-L1-164637",
                    "metadata": {
                        "source_type": "BLE_APP",
                        "source_id": "tech_cairo_04",
                        "bms_fw_version": "SWP10_V2.1.0",
                        "sequence_num": 101,
                        "timestamp_utc": "2026-11-02T12:00:00Z",
                        "buffered": False
                    },
                    "location": {
                        "latitude": 30.0131,
                        "longitude": 31.2089,
                        "source": "PHONE_GPS",
                        "accuracy_m": 3.5
                    },
                    "electrical": {
                        "pack_voltage_v": 39.85,
                        "pack_current_a": -0.01,
                        "soc_pct": 97.2,
                        "soh_pct": 100.0,
                        "state": "STANDBY",
                        "lifetime_energy_kwh": 4.245,
                        "rated_capacity_ah": 14.0
                    },
                    "cells": {
                        "connected_count": 10,
                        "voltages_v": [3.997, 3.998, 3.993, 3.996, 4.003, 4.005, 3.996, 3.998, 4.000, 4.005],
                        "min_voltage_v": 3.993,
                        "max_voltage_v": 4.005,
                        "avg_voltage_v": 3.999,
                        "imbalance_mv": 12.0,
                        "weakest_cell_index": 3
                    },
                    "thermal": {
                        "cell_temperatures_c": [23.0, 23.5],
                        "max_cell_temp_c": 23.5,
                        "mosfet_temp_c": 24.0,
                        "internal_chip_temp_c": 25.0
                    },
                    "status_and_faults": {
                        "bms_state_code": 2,
                        "balancing_active": False,
                        "charge_fet_enabled": True,
                        "discharge_fet_enabled": False,
                        "raw_fault_flags": 0,
                        "active_alarms": []
                    }
                }
            ]
        }

        # 1. First upload: must be ACCEPTED
        resp1 = await ac.post("/v1/telemetry/batch", json=payload)
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["received_count"] == 1
        assert data1["accepted_count"] == 1
        assert data1["duplicate_count"] == 0
        assert data1["results"][0]["status"] == "ACCEPTED"

        # 2. Re-upload identical sequence_num: must be marked DUPLICATE (idempotent)
        resp2 = await ac.post("/v1/telemetry/batch", json=payload)
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["received_count"] == 1
        assert data2["accepted_count"] == 0
        assert data2["duplicate_count"] == 1
        assert data2["results"][0]["status"] == "DUPLICATE"

