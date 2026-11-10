from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class WarrantySyncPackRequest(BaseModel):
    serial_number: str = Field(..., description="e.g. EVR-C036014-131026-L1-164637")
    model_code: str = Field(..., description="e.g. EVR036014-0BU0-A02")
    bluetooth_name: Optional[str] = Field(None, description="e.g. EVR036014-CFDFA8")
    supplied_to: str = Field(..., description="Customer / Operator name, e.g. LOOP or RABBIT")
    status: str = Field(default="Activated", description="Status in manufacturing/warranty system")
    created_date: datetime = Field(..., description="Manufacturing QA pass date")
    warranty_end_date: Optional[datetime] = None
    warranty_period_months: int = Field(default=12, ge=1)
    lifetime_cycles_limit: int = Field(default=500, ge=1)
    cell_brand: Optional[str] = Field(None, description="e.g. Tenpower")
    cell_model: Optional[str] = Field(None, description="e.g. INR18650-28HE")
    max_motor_watt: Optional[int] = Field(None, description="Max motor power rating e.g. 499")

class WarrantySyncPackResponse(BaseModel):
    serial_number: str
    status: str # "PROVISIONED", "UPDATED"
    assigned_customer: str
    assigned_fleet: str
    warranty_start_date: datetime
    warranty_end_date: datetime
    message: str

