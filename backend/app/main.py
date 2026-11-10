from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import telemetry, warranty, packs, fleets, alerts, devices, reports, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="EVRaid Cloud Ingestion API for BLE App & Cellular Fleets"
)

# Production-hardened CORS settings
allowed_origins = [
    "https://fleet.evraid.com",
    "http://fleet.evraid.com",
]

if settings.ENVIRONMENT.lower() != "production":
    allowed_origins.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Include v1 routers
app.include_router(telemetry.router, prefix=settings.API_V1_STR)
app.include_router(warranty.router, prefix=settings.API_V1_STR)
app.include_router(packs.router, prefix=settings.API_V1_STR)
app.include_router(fleets.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(devices.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}



