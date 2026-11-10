import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

AUTH_HEADER = {"Authorization": "Bearer evraid-warranty-sync-secret-key"}

@pytest.mark.asyncio
async def test_warranty_sync_pack_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Valid payload but missing Auth header
        payload = {
            "serial_number": "EVR-C036014-131026-L1-164637",
            "model_code": "EVR036014-0BU0-A02",
            "supplied_to": "LOOP",
            "created_date": "2026-10-13T08:00:00Z"
        }
        resp = await ac.post("/v1/integrations/warranty/sync-pack", json=payload)
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_warranty_sync_pack_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "serial_number": "EVR-C036014-131026-L1-164637",
            "model_code": "EVR036014-0BU0-A02",
            "bluetooth_name": "EVR036014-CFDFA8",
            "supplied_to": "LOOP",
            "status": "Activated",
            "created_date": "2026-10-13T08:00:00Z",
            "warranty_end_date": "2027-10-13T00:00:00Z",
            "warranty_period_months": 12,
            "lifetime_cycles_limit": 500,
            "cell_brand": "Tenpower",
            "cell_model": "INR18650-28HE",
            "max_motor_watt": 499
        }

        # 1. First sync -> PROVISIONED to LOOP fleet
        resp = await ac.post("/v1/integrations/warranty/sync-pack", json=payload, headers=AUTH_HEADER)
        assert resp.status_code == 200
        data = resp.json()
        assert data["serial_number"] == "EVR-C036014-131026-L1-164637"
        assert data["status"] == "PROVISIONED"
        assert data["assigned_customer"] == "LOOP"
        assert data["assigned_fleet"] == "LOOP_DEFAULT_FLEET"

        # 2. Re-sync (Idempotent update) -> UPDATED
        resp_update = await ac.post("/v1/integrations/warranty/sync-pack", json=payload, headers=AUTH_HEADER)
        assert resp_update.status_code == 200
        assert resp_update.json()["status"] == "UPDATED"

@pytest.mark.asyncio
async def test_warranty_sync_unknown_operator_fallback():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "serial_number": "EVR-C036014-999999-L1-000001",
            "model_code": "EVR036014-0BU0-A02",
            "supplied_to": "UNKNOWN_NEW_OPERATOR",
            "status": "Activated",
            "created_date": "2026-11-01T08:00:00Z",
            "warranty_period_months": 12
        }

        resp = await ac.post("/v1/integrations/warranty/sync-pack", json=payload, headers=AUTH_HEADER)
        assert resp.status_code == 200
        data = resp.json()
        # Fallback to Unassigned fleet under EVRaid custody
        assert data["assigned_customer"] == "EVRAID"
        assert data["assigned_fleet"] == "UNASSIGNED_FLEET"
