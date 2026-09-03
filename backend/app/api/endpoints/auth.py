import httpx
import logging
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_optional_current_user
)
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import Token, LoginRequest, RegisterRequest, OAuthCallbackRequest, OAuthUrlResponse
from app.schemas.user import UserResponse, UserUpdate, UserCreate

logger = logging.getLogger("auth_router")
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _format_user_response(user: User) -> UserResponse:
    """Format User model into UserResponse with connection flags."""
    return UserResponse(
        id=user.id,
        username=user.username,
        name=user.name or user.username,
        email=user.email,
        avatar_url=user.avatar_url,
        github_id=user.github_id,
        google_id=user.google_id,
        is_github_connected=bool(user.github_id or user.access_token),
        is_google_connected=bool(user.google_id),
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account with email and password."""
    email_clean = req.email.lower().strip()
    existing_email = await UserRepository.get_by_email(db, email_clean)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Derive unique username from name/email
    base_username = email_clean.split("@")[0]
    username = base_username
    counter = 1
    while await UserRepository.get_by_username(db, username):
        username = f"{base_username}_{counter}"
        counter += 1

    hashed_pwd = get_password_hash(req.password)
    user_data = UserCreate(
        name=req.name.strip(),
        username=username,
        email=email_clean,
        hashed_password=hashed_pwd
    )
    new_user = await UserRepository.create(db, user_data)
    token = create_access_token(subject=new_user.id)

    return Token(
        access_token=token,
        token_type="bearer",
        user=_format_user_response(new_user)
    )


@router.post("/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password to receive a JWT access token."""
    email_clean = req.email.lower().strip()
    user = await UserRepository.get_by_email(db, email_clean)
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=_format_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile and connection status."""
    return _format_user_response(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update profile information for the authenticated user."""
    updated = await UserRepository.update(db, current_user.id, data)
    return _format_user_response(updated)


@router.get("/github/url", response_model=OAuthUrlResponse)
async def get_github_oauth_url():
    """Generate the GitHub OAuth redirect URL for login and account connection."""
    client_id = settings.GITHUB_CLIENT_ID or "GITHUB_CLIENT_ID_PLACEHOLDER"
    redirect_uri = settings.GITHUB_OAUTH_REDIRECT_URI or f"{settings.FRONTEND_URL}/oauth/callback?provider=github"
    state = secrets.token_hex(16)
    
    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=repo,read:user,user:email&state={state}"
    return OAuthUrlResponse(url=url, provider="github")


@router.post("/github/callback", response_model=Token)
async def github_oauth_callback(
    req: OAuthCallbackRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Exchange GitHub OAuth authorization code for an access token and log in / connect user."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        # Development fallback: If credentials not configured yet, notify with clear instructions
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured in backend .env. Please configure GitHub OAuth credentials to proceed."
        )

    # 1. Exchange code for access token
    token_url = "https://github.com/login/oauth/access_token"
    token_params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": req.code,
    }
    headers = {"Accept": "application/json"}

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(token_url, json=token_params, headers=headers, timeout=15.0)
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error(f"GitHub OAuth error response: {token_data}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"GitHub authentication failed: {token_data.get('error_description', 'Invalid code or configuration')}."
                )

            # 2. Fetch User Profile from GitHub API
            gh_headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "AI-Code-Review-Bot"
            }
            user_res = await client.get("https://api.github.com/user", headers=gh_headers, timeout=15.0)
            if user_res.status_code != 200:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch GitHub profile.")
            gh_user = user_res.json()

            # 3. Fetch Primary Email if private
            email = gh_user.get("email")
            if not email:
                emails_res = await client.get("https://api.github.com/user/emails", headers=gh_headers, timeout=15.0)
                if emails_res.status_code == 200:
                    emails_data = emails_res.json()
                    for e in emails_data:
                        if e.get("primary"):
                            email = e.get("email")
                            break

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth exception: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error communicating with GitHub OAuth server."
        )

    github_id = str(gh_user.get("id"))
    username = gh_user.get("login", f"gh_user_{github_id}")
    name = gh_user.get("name") or username
    avatar_url = gh_user.get("avatar_url")

    # If user is already logged in, link GitHub account to existing user
    if current_user:
        updated = await UserRepository.update_github_token(
            db, current_user.id, github_id=github_id, access_token=access_token, avatar_url=avatar_url
        )
        token = create_access_token(subject=updated.id)
        return Token(access_token=token, token_type="bearer", user=_format_user_response(updated))

    # Otherwise, look up existing user by github_id or email
    user = await UserRepository.get_by_github_id(db, github_id)
    if not user and email:
        user = await UserRepository.get_by_email(db, email)

    if user:
        # Update user's github token and avatar
        user = await UserRepository.update_github_token(
            db, user.id, github_id=github_id, access_token=access_token, avatar_url=avatar_url
        )
    else:
        # Create brand new user
        user_create = UserCreate(
            name=name,
            username=username,
            email=email,
            github_id=github_id,
            avatar_url=avatar_url,
            access_token=access_token
        )
        user = await UserRepository.create(db, user_create)

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=_format_user_response(user))


@router.get("/google/url", response_model=OAuthUrlResponse)
async def get_google_oauth_url():
    """Generate Google OAuth redirect URL for authentication."""
    client_id = settings.GOOGLE_CLIENT_ID or "GOOGLE_CLIENT_ID_PLACEHOLDER"
    redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI or f"{settings.FRONTEND_URL}/oauth/callback?provider=google"
    state = secrets.token_hex(16)
    
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"state={state}&"
        f"access_type=offline"
    )
    return OAuthUrlResponse(url=url, provider="google")


@router.post("/google/callback", response_model=Token)
async def google_oauth_callback(
    req: OAuthCallbackRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Exchange Google authorization code and log in or link account."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured in backend .env. Please configure Google OAuth credentials to proceed."
        )

    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI or f"{settings.FRONTEND_URL}/oauth/callback?provider=google"
    token_params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": req.code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(token_url, data=token_params, timeout=15.0)
            token_data = token_res.json()
            google_access_token = token_data.get("access_token")
            if not google_access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google authentication failed: {token_data.get('error_description', 'Invalid code')}."
                )

            # Fetch user info
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {google_access_token}"},
                timeout=15.0
            )
            google_user = userinfo_res.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth exception: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error communicating with Google OAuth server."
        )

    google_id = str(google_user.get("id"))
    email = google_user.get("email")
    name = google_user.get("name") or "Google User"
    avatar_url = google_user.get("picture")

    if current_user:
        current_user.google_id = google_id
        if avatar_url and not current_user.avatar_url:
            current_user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(current_user)
        token = create_access_token(subject=current_user.id)
        return Token(access_token=token, token_type="bearer", user=_format_user_response(current_user))

    user = await UserRepository.get_by_google_id(db, google_id)
    if not user and email:
        user = await UserRepository.get_by_email(db, email)

    if user:
        user.google_id = google_id
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
    else:
        base_username = email.split("@")[0] if email else f"user_{google_id[:6]}"
        username = base_username
        counter = 1
        while await UserRepository.get_by_username(db, username):
            username = f"{base_username}_{counter}"
            counter += 1

        user_create = UserCreate(
            name=name,
            username=username,
            email=email,
            google_id=google_id,
            avatar_url=avatar_url
        )
        user = await UserRepository.create(db, user_create)

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=_format_user_response(user))


@router.post("/disconnect-github", response_model=UserResponse)
async def disconnect_github(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect GitHub account and purge stored OAuth token."""
    updated = await UserRepository.disconnect_github(db, current_user.id)
    return _format_user_response(updated)
