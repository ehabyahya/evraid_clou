from typing import List
from fastapi import APIRouter, status
from app.schemas.dashboard import FirmwareProfileMapping
from app.services.dashboard_data import dashboard_data_store

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get(
    "/mappings",
    response_model=List[FirmwareProfileMapping],
    status_code=status.HTTP_200_OK,
    summary="Get BMS firmware profiles and physical cell channel maps"
)
async def list_firmware_mappings():
    return dashboard_data_store.get_firmware_mappings()

@router.put(
    "/mappings",
    response_model=FirmwareProfileMapping,
    status_code=status.HTTP_200_OK,
    summary="Update or add a BMS firmware channel mapping profile"
)
async def update_firmware_mapping(mapping: FirmwareProfileMapping):
    return dashboard_data_store.update_firmware_mapping(mapping)

