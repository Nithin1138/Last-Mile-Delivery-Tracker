"""
Last-Mile Delivery Tracker — FastAPI Application

A production-minded logistics/delivery management system with:
- Database-driven pricing engine
- Concurrency-safe agent assignment
- Immutable order status history
- Failed delivery and rescheduling workflow
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import check_db_connection, create_tables
from app.core.errors import AppError, app_error_handler

# Import routers
from app.api.auth import router as auth_router
from app.api.orders import router as orders_router
from app.api.admin import router as admin_router, agents_self_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize tables on startup
    create_tables()
    yield


app = FastAPI(
    title="Last-Mile Delivery Tracker",
    description="Logistics/delivery management system with pricing engine, "
    "auto-assignment, and order lifecycle management.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppError, app_error_handler)

# Include API Routers
app.include_router(auth_router)
app.include_router(orders_router)
app.include_router(admin_router)
app.include_router(agents_self_router)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint — verifies app is alive and DB is reachable."""
    db_ok = check_db_connection()
    status = "healthy" if db_ok else "degraded"
    return {
        "status": status,
        "database": "connected" if db_ok else "unreachable",
    }


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions — returns structured error."""
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
            }
        },
    )
