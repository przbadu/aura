from supabase import create_client, Client
from app.config import settings


def get_supabase_client(access_token: str | None = None) -> Client:
    """Create a Supabase client.

    If access_token is provided, creates an authenticated client that
    respects RLS policies using the user's JWT. Otherwise creates
    a client with the anon key.
    """
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    if access_token:
        client.postgrest.auth(access_token)
    return client
