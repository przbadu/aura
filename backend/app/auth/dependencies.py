from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.config import settings

security = HTTPBearer()

# Module-level client for auth verification (anon key only, no RLS needed)
_auth_client = create_client(settings.supabase_url, settings.supabase_anon_key)


@dataclass
class AuthenticatedUser:
    """Wrapper that holds the Supabase user and their access token."""
    id: str
    email: str
    access_token: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    """Extract and validate the current user from a Bearer token via Supabase."""
    try:
        user_response = _auth_client.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        user = user_response.user
        return AuthenticatedUser(
            id=user.id,
            email=user.email or "",
            access_token=credentials.credentials,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
