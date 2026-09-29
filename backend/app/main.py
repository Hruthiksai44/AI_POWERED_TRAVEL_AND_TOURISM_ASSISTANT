"""FastAPI main application entry point."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import init_db
from pathlib import Path

logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("Starting Travel & Tourism Assistant API...")
    # Preload the AI agent to avoid blocking the event loop on the first Twilio request
    try:
        logger.info("Preloading agent graph...")
        from app.agent.graph import run_agent
        _ = run_agent
        logger.info("Agent graph preloaded successfully.")
    except Exception as e:
        logger.error(f"Failed to preload agent graph: {e}")

    # Initialize database tables
    await init_db()
    logger.info("Database initialized")

    # Create default admin user if not exists
    try:
        from app.database import AsyncSessionLocal
        from app.services.auth_service import get_user_by_email, register_user
        from app.schemas.user import UserCreate
        async with AsyncSessionLocal() as db:
            admin = await get_user_by_email(db, "admin@travelassistant.com")
            if not admin:
                admin_data = UserCreate(
                    name="Admin",
                    email="admin@travelassistant.com",
                    phone="9999999999",
                    gender="other",
                    age=30,
                    password="admin123456"
                )
                admin = await register_user(db, admin_data)
                # Set as admin
                from sqlalchemy import update
                from app.models.user import User, UserRole
                await db.execute(
                    update(User).where(User.id == admin.id).values(role=UserRole.ADMIN)
                )
                await db.commit()
                logger.info("Default admin user created: admin@travelassistant.com / admin123456")
    except Exception as e:
        logger.warning(f"Could not create default admin: {e}")

    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="AI Travel & Tourism Assistant",
    description="AI-powered travel assistant with hotel booking, itinerary planning, and conversational AI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static file serving
uploads_path = Path(settings.UPLOAD_DIR)
if not uploads_path.is_absolute():
    uploads_path = Path(__file__).resolve().parent.parent / uploads_path
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Import and include all routers
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.cities import router as cities_router
from app.api.hotels import router as hotels_router
from app.api.inventory import router as inventory_router
from app.api.reservations import router as reservations_router
from app.api.itineraries import router as itineraries_router
from app.api.conversations import router as conversations_router
from app.api.feedback import router as feedback_router
from app.api.documents import router as documents_router
from app.api.analytics import router as analytics_router
from app.api.admin import router as admin_router
from app.api.assistant import router as assistant_router
from app.api.twilio import router as twilio_router
from app.api.twilio import token_router as twilio_token_router

api_prefix = "/api"
app.include_router(auth_router, prefix=api_prefix)
app.include_router(users_router, prefix=api_prefix)
app.include_router(cities_router, prefix=api_prefix)
app.include_router(hotels_router, prefix=api_prefix)
app.include_router(inventory_router, prefix=api_prefix)
app.include_router(reservations_router, prefix=api_prefix)
app.include_router(itineraries_router, prefix=api_prefix)
app.include_router(conversations_router, prefix=api_prefix)
app.include_router(feedback_router, prefix=api_prefix)
app.include_router(documents_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(admin_router, prefix=api_prefix)
app.include_router(assistant_router, prefix=api_prefix)
app.include_router(twilio_router, prefix=api_prefix)
app.include_router(twilio_token_router, prefix=api_prefix)


@app.get("/")
async def root():
    return {
        "name": "AI Travel & Tourism Assistant API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
