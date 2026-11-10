from datetime import timedelta
from typing import Dict, Any
from app.schemas.warranty import WarrantySyncPackRequest, WarrantySyncPackResponse

class WarrantyService:
    def __init__(self):
        # Simulated in-memory store for unit test & staging lifecycle
        # In production this queries Customer, Fleet, and Pack database tables
        self._packs: Dict[str, Dict[str, Any]] = {}
        self._known_customers = {"LOOP", "RABBIT"}

    async def sync_pack(self, req: WarrantySyncPackRequest) -> WarrantySyncPackResponse:
        # 1. Resolve warranty end date (default = created_date + warranty_period_months)
        start_date = req.created_date
        if req.warranty_end_date:
            end_date = req.warranty_end_date
        else:
            # Approximate months to days
            end_date = start_date + timedelta(days=req.warranty_period_months * 30)

        # 2. Resolve Customer & Fleet (Unknown goes to 'Unassigned' fleet)
        customer_name = req.supplied_to.strip().upper()
        if customer_name in self._known_customers:
            assigned_customer = customer_name
            assigned_fleet = f"{customer_name}_DEFAULT_FLEET"
        else:
            assigned_customer = "EVRAID"
            assigned_fleet = "UNASSIGNED_FLEET"

        is_update = req.serial_number in self._packs
        status_action = "UPDATED" if is_update else "PROVISIONED"

        # 3. Upsert pack state
        self._packs[req.serial_number] = {
            "serial_number": req.serial_number,
            "model_code": req.model_code,
            "bluetooth_name": req.bluetooth_name,
            "customer": assigned_customer,
            "fleet": assigned_fleet,
            "warranty_start": start_date,
            "warranty_end": end_date,
            "lifetime_cycles_limit": req.lifetime_cycles_limit,
            "connectivity_mode": "BLE_ONLY"
        }

        return WarrantySyncPackResponse(
            serial_number=req.serial_number,
            status=status_action,
            assigned_customer=assigned_customer,
            assigned_fleet=assigned_fleet,
            warranty_start_date=start_date,
            warranty_end_date=end_date,
            message="Pack successfully synchronized with warranty ledger."
        )

warranty_service = WarrantyService()

