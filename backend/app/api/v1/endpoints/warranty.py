from fastapi import APIRouter, status, Header, HTTPException
from app.schemas.warranty import WarrantySyncPackRequest, WarrantySyncPackResponse
from app.services.warranty import warranty_service

router = APIRouter(prefix="/integrations/warranty", tags=["warranty-integration"])

# In production this token is validated against an environment variable / secret store
INTERNAL_SYNC_TOKEN = "evraid-warranty-sync-secret-key"

@router.post(
    "/sync-pack",
    response_model=WarrantySyncPackResponse,
    status_code=status.HTTP_200_OK,
    summary="Automated Pack Provisioning Webhook from Warranty System"
)
async def sync_pack_from_warranty(
    request: WarrantySyncPackRequest,
    authorization: str = Header(None, description="Bearer internal sync token")
):
    """
    Receives automated QA/manufacturing events from the factory warranty system.
    Creates or updates pack records with initial warranty terms and assigns to operator fleets.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer authorization header"
        )
    
    token = authorization.split(" ")[1]
    if token != INTERNAL_SYNC_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal sync token"
        )

    return await warranty_service.sync_pack(request)

