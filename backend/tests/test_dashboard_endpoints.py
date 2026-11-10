import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_fleet_overview_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/v1/fleets/1/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert data["fleet_name"] == "Cairo fleet"
        assert data["operator_name"] == "Demo Operator"
        assert data["kpis"]["packs_online"]["total"] == 1200
        assert data["kpis"]["packs_online"]["online"] == 1185
        assert data["kpis"]["avg_soh"]["value"] == 91.4
        assert len(data["health_grades"]) == 4
        assert len(data["soh_12m_trend"]) == 12

@pytest.mark.asyncio
async def test_packs_list_and_register():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List packs
        resp = await ac.get("/v1/packs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        
        # 2. Register new pack
        new_serial = "EVR-TEST-NEW-0099"
        reg_payload = {
            "serial_number": new_serial,
            "commercial_name": "Test LFP Pack",
            "chemistry": "LFP",
            "nominal_voltage": 51.2,
            "rated_capacity_ah": 105.0,
            "series_count": 16,
            "fleet_id": 1
        }
        resp_reg = await ac.post("/v1/packs", json=reg_payload)
        assert resp_reg.status_code == 201
        reg_data = resp_reg.json()
        assert reg_data["pack_serial"] == new_serial
        assert reg_data["soh_pct"] == 100.0

@pytest.mark.asyncio
async def test_alerts_lifecycle_and_work_order():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List alerts
        resp = await ac.get("/v1/alerts")
        assert resp.status_code == 200
        alerts = resp.json()
        assert len(alerts) >= 1
        alert_id = alerts[0]["id"]

        # 2. Acknowledge alert
        resp_ack = await ac.post(f"/v1/alerts/{alert_id}/acknowledge")
        assert resp_ack.status_code == 200
        assert resp_ack.json()["status"] == "Acknowledged"

        # 3. Assign alert and create work order
        assign_payload = {
            "assign_to": "Field team A",
            "priority": "Urgent",
            "notes": "Testing assignment workflow"
        }
        resp_assign = await ac.post(f"/v1/alerts/{alert_id}/assign", json=assign_payload)
        assert resp_assign.status_code == 200
        assigned_data = resp_assign.json()
        assert assigned_data["status"] == "In progress"
        assert assigned_data["work_order"] is not None

@pytest.mark.asyncio
async def test_devices_and_admin_mappings():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Modules
        resp_mod = await ac.get("/v1/devices/modules")
        assert resp_mod.status_code == 200
        assert len(resp_mod.json()) >= 1

        # Admin mappings
        resp_map = await ac.get("/v1/admin/mappings")
        assert resp_map.status_code == 200
        mappings = resp_map.json()
        assert len(mappings) >= 1
        assert mappings[0]["cell_channel_map"] is not None

