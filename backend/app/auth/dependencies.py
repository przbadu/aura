from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.config import settings

security = HTTPBearer()


def get_supabase_client():
    """Create a Supabase client with the service role key."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Extract and validate the current user from a Bearer token via Supabase."""
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return user_response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
