from fastapi import APIRouter
from app.api.endpoints import (
    health,
    auth,
    github,
    dashboard,
    repositories,
    pull_requests,
    reviews,
    seed,
    ai,
    webhooks
)

api_router = APIRouter()

# Register all modular endpoint routers
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(github.router)
api_router.include_router(dashboard.router)
api_router.include_router(repositories.router)
api_router.include_router(pull_requests.router)
api_router.include_router(reviews.router)
api_router.include_router(seed.router)
api_router.include_router(ai.router)
api_router.include_router(webhooks.router)
