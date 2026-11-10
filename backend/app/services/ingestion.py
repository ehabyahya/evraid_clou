from typing import Set, Tuple, Dict, Optional
from datetime import datetime
from app.schemas.telemetry import (
    TelemetryBatchIngestRequest,
    TelemetryBatchIngestResponse,
    IngestRecordResult,
    CanonicalTelemetryRecord,
)
from app.schemas.pack import PackLiveState
from app.schemas.alerts import AlertSeverity
from app.services.diagnostics import diagnostics_engine
from app.services.abuse import abuse_engine

class IngestionService:
    def __init__(self):
        # In-memory deduplication set: (pack_serial, sequence_num)
        self._seen_sequences: Set[Tuple[str, int]] = set()
        # In-memory Hot State cache (Redis replacement for dev/staging): {pack_serial: PackLiveState}
        self._pack_live_states: Dict[str, PackLiveState] = {}

    async def ingest_batch(self, batch: TelemetryBatchIngestRequest) -> TelemetryBatchIngestResponse:
        results = []
        accepted = 0
        duplicate = 0
        rejected = 0

        for record in batch.records:
            res = await self._process_record(record)
            results.append(res)
            if res.status == "ACCEPTED":
                accepted += 1
            elif res.status == "DUPLICATE":
                duplicate += 1
            else:
                rejected += 1

        return TelemetryBatchIngestResponse(
            received_count=len(batch.records),
            accepted_count=accepted,
            duplicate_count=duplicate,
            rejected_count=rejected,
            results=results
        )

    async def _process_record(self, record: CanonicalTelemetryRecord) -> IngestRecordResult:
        dedupe_key = (record.pack_serial, record.metadata.sequence_num)
        
        # 1. Deduplication check
        if dedupe_key in self._seen_sequences:
            return IngestRecordResult(
                pack_serial=record.pack_serial,
                sequence_num=record.metadata.sequence_num,
                status="DUPLICATE",
                message="Sample with this sequence number was already ingested."
            )

        # 2. Semantic integrity check
        if record.cells.connected_count != len(record.cells.voltages_v):
            return IngestRecordResult(
                pack_serial=record.pack_serial,
                sequence_num=record.metadata.sequence_num,
                status="REJECTED",
                message=f"connected_count ({record.cells.connected_count}) does not match voltages_v length ({len(record.cells.voltages_v)})."
            )

        # 3. Diagnostics & Alert Evaluation
        diag_result = diagnostics_engine.evaluate_telemetry(record)

        # 4. Abuse & Warranty Evaluation
        warranty_result = abuse_engine.evaluate_telemetry(record)

        # 5. Update Hot State (Pack Live Dashboard View)
        crit_count = sum(1 for a in diag_result.active_alerts if a.severity == AlertSeverity.CRITICAL)
        warn_count = sum(1 for a in diag_result.active_alerts if a.severity == AlertSeverity.WARNING)

        self._pack_live_states[record.pack_serial] = PackLiveState(
            pack_serial=record.pack_serial,
            last_seen_utc=record.metadata.timestamp_utc,
            source_type=record.metadata.source_type.value,
            source_id=record.metadata.source_id,
            soc_pct=record.electrical.soc_pct,
            soh_pct=diag_result.soh_pct,
            health_grade=diag_result.health_grade,
            pack_voltage_v=record.electrical.pack_voltage_v,
            pack_current_a=record.electrical.pack_current_a,
            max_temperature_c=record.thermal.max_cell_temp_c,
            imbalance_mv=diag_result.imbalance_mv,
            weakest_cell_index=diag_result.weakest_cell_index,
            cell_voltages=record.cells.voltages_v,
            active_critical_alerts=crit_count,
            active_warning_alerts=warn_count,
            warranty_status=warranty_result.warranty_status,
            abuse_events_count=warranty_result.abuse_events_count,
            recent_alerts=diag_result.active_alerts,
            abuse_events=abuse_engine.get_abuse_events(record.pack_serial)
        )

        self._seen_sequences.add(dedupe_key)

        return IngestRecordResult(
            pack_serial=record.pack_serial,
            sequence_num=record.metadata.sequence_num,
            status="ACCEPTED",
            message=f"Processed (Grade {diag_result.health_grade.value}, {crit_count} Critical, {warn_count} Warning)"
        )

    def get_pack_live_state(self, pack_serial: str) -> Optional[PackLiveState]:
        return self._pack_live_states.get(pack_serial)

ingestion_service = IngestionService()

