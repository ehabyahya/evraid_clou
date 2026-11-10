from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from app.schemas.dashboard import DetailedAlert, AlertAssignRequest, WorkOrder, AlertThresholdsConfig
from app.services.dashboard_data import dashboard_data_store

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get(
    "",
    response_model=List[DetailedAlert],
    status_code=status.HTTP_200_OK,
    summary="List alerts with severity, status and assignment filters"
)
async def list_alerts(
    severity: Optional[str] = Query(None, description="CRITICAL, WARNING, INFO"),
    status: Optional[str] = Query(None, description="open, closed, new, acknowledged, in progress"),
    assignee: Optional[str] = Query(None, description="assigned_to_me or technician name")
):
    """
    Returns alerts list matching Mockup #3 filter pills:
    Open, Critical, Warning, Info, Assigned to me, Closed.
    """
    return dashboard_data_store.get_alerts(severity=severity, status=status, assignee=assignee)

@router.post(
    "/{alert_id}/acknowledge",
    response_model=DetailedAlert,
    status_code=status.HTTP_200_OK,
    summary="Acknowledge an active alert"
)
async def acknowledge_alert(alert_id: str):
    """
    Sets alert status to Acknowledged and records timestamp to track the 1h SLA.
    """
    try:
        return dashboard_data_store.acknowledge_alert(alert_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert '{alert_id}' not found")

@router.post(
    "/{alert_id}/assign",
    response_model=DetailedAlert,
    status_code=status.HTTP_200_OK,
    summary="Assign alert and create linked work order"
)
async def assign_alert(alert_id: str, request: AlertAssignRequest):
    """
    Assigns alert to field team or ops desk and creates a linked card in the Work Orders Kanban.
    """
    try:
        return dashboard_data_store.assign_alert_and_create_work_order(alert_id, request)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert '{alert_id}' not found")

@router.get(
    "/work-orders",
    response_model=List[WorkOrder],
    status_code=status.HTTP_200_OK,
    summary="Get all work orders for Kanban board"
)
async def list_work_orders():
    """
    Returns work orders categorized into TO DO, IN PROGRESS, WAITING ON EVRAID, DONE THIS WEEK.
    """
    return dashboard_data_store.get_work_orders()

@router.get(
    "/thresholds",
    response_model=AlertThresholdsConfig,
    status_code=status.HTTP_200_OK,
    summary="Get fleet alert threshold settings"
)
async def get_alert_thresholds(fleet_id: int = 1):
    return AlertThresholdsConfig(fleet_id=fleet_id)

@router.put(
    "/thresholds",
    response_model=AlertThresholdsConfig,
    status_code=status.HTTP_200_OK,
    summary="Update fleet alert threshold settings"
)
async def update_alert_thresholds(config: AlertThresholdsConfig):
    return config

