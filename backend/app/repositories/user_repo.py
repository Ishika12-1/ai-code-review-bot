from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserRepository:
    """CRUD database operations for users."""

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower().strip())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username.strip())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_github_id(db: AsyncSession, github_id: str) -> Optional[User]:
        stmt = select(User).where(User.github_id == str(github_id))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_google_id(db: AsyncSession, google_id: str) -> Optional[User]:
        stmt = select(User).where(User.google_id == str(google_id))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: UserCreate) -> User:
        user = User(
            name=data.name,
            username=data.username,
            email=data.email.lower().strip() if data.email else None,
            hashed_password=data.hashed_password,
            github_id=str(data.github_id) if data.github_id else None,
            google_id=str(data.google_id) if data.google_id else None,
            avatar_url=data.avatar_url,
            access_token=data.access_token,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update(db: AsyncSession, user_id: int, data: UserUpdate) -> Optional[User]:
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        if "email" in update_dict and update_dict["email"]:
            update_dict["email"] = update_dict["email"].lower().strip()

        for key, value in update_dict.items():
            setattr(user, key, value)

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_github_token(db: AsyncSession, user_id: int, github_id: str, access_token: str, avatar_url: Optional[str] = None) -> Optional[User]:
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None

        user.github_id = str(github_id)
        user.access_token = access_token
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def disconnect_github(db: AsyncSession, user_id: int) -> Optional[User]:
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None

        user.github_id = None
        user.access_token = None
        await db.commit()
        await db.refresh(user)
        return user
