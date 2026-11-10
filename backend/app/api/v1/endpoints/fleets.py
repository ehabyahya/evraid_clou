from fastapi import APIRouter, status, Query
from app.schemas.dashboard import FleetOverviewResponse
from app.services.dashboard_data import dashboard_data_store

router = APIRouter(prefix="/fleets", tags=["fleets"])

@router.get(
    "/{fleet_id}/overview",
    response_model=FleetOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Fleet Overview KPIs and Diagnostic Rollups"
)
async def get_fleet_overview(fleet_id: int):
    """
    Returns aggregated fleet statistics matching Mockup #1:
    5 KPI cards, Health Grade distribution bars, 12-month SOH trend line,
    open critical alerts, and packs needing immediate operational attention.
    """
    return dashboard_data_store.get_fleet_overview(fleet_id)

