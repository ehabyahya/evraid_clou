from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.dashboard import DeviceModuleItem, DeviceLinkModuleRequest
from app.services.dashboard_data import dashboard_data_store

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get(
    "/modules",
    response_model=List[DeviceModuleItem],
    status_code=status.HTTP_200_OK,
    summary="Get cellular telematics modules registry"
)
async def list_modules():
    """
    Returns registered 4G/LTE-M modules, IMEI, ICCID, signal strength, and firmware status.
    """
    return dashboard_data_store.get_modules()

@router.post(
    "/modules/link",
    response_model=DeviceModuleItem,
    status_code=status.HTTP_200_OK,
    summary="Link or swap telematics module on a pack"
)
async def link_module(request: DeviceLinkModuleRequest):
    """
    Associates an IMEI/ICCID telematics module with a specific battery pack serial.
    """
    return dashboard_data_store.link_module(request)

