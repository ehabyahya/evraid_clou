from datetime import datetime, timezone
from fastapi import APIRouter, status, Response
from app.services.dashboard_data import dashboard_data_store

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get(
    "/monthly",
    status_code=status.HTTP_200_OK,
    summary="Get monthly fleet health summary data"
)
async def get_monthly_report(fleet_id: int = 1):
    overview = dashboard_data_store.get_fleet_overview(fleet_id)
    return {
        "report_period": "October 2026",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "operator": overview.operator_name,
        "fleet": overview.fleet_name,
        "fleet_size": overview.kpis.packs_online.total,
        "reporting_rate_pct": overview.kpis.packs_online.pct_reported_today,
        "average_soh_pct": overview.kpis.avg_soh.value,
        "soh_degradation_90d": overview.kpis.avg_soh.delta_90d,
        "grade_distribution": [g.dict() for g in overview.health_grades],
        "total_energy_delivered_mwh": 142.6,
        "active_critical_alerts_count": overview.kpis.open_alerts.critical,
        "warranty_claims_in_review": 1,
        "recommendations": [
            "Initiate depot cell-balancing schedule for 84 Grade C packs to arrest impedance divergence.",
            "Inspect pack EVR-48105-0142 sensor T3 wiring harness at Zamalek depot.",
            "Verify cell tap 9 integrity on pack EVR-48015-0892 before return to service."
        ]
    }

@router.get(
    "/export/csv",
    status_code=status.HTTP_200_OK,
    summary="Export fleet inventory & health as CSV"
)
async def export_fleet_csv(fleet_id: int = 1):
    packs = dashboard_data_store.get_packs(page=1, page_size=200).items
    lines = [
        "pack_serial,commercial_name,chemistry,soh_pct,soc_pct,grade,imbalance_mv,cycles,last_seen"
    ]
    for p in packs:
        lines.append(f"{p.pack_serial},{p.commercial_name},{p.chemistry},{p.soh_pct},{p.soc_pct},{p.health_grade},{p.imbalance_mv},{p.equivalent_cycles},{p.last_seen_utc.isoformat()}")
    csv_data = "\n".join(lines)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=evraid_fleet_export.csv"}
    )

