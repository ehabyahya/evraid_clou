from fastapi import APIRouter, status
from app.schemas.telemetry import TelemetryBatchIngestRequest, TelemetryBatchIngestResponse
from app.services.ingestion import ingestion_service

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

@router.post(
    "/batch",
    response_model=TelemetryBatchIngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Ingestion for BLE App & Cellular Gateways"
)
async def ingest_telemetry_batch(batch: TelemetryBatchIngestRequest):
    """
    Ingests a batch of canonical telemetry packets from the field (BLE technician app or direct IoT module).
    Provides idempotent deduplication on (pack_serial, sequence_num).
    """
    return await ingestion_service.ingest_batch(batch)

