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

import time
import uuid

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Tracing & Latency Middleware
@app.middleware("http")
async def add_observability_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.perf_counter()
    
    response = await call_next(request)
    
    process_time = time.perf_counter() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
    return response


# Exception handlers
app.add_exception_handler(AppError, app_error_handler)

# Include API Routers
app.include_router(auth_router)
app.include_router(orders_router)
app.include_router(admin_router)
app.include_router(agents_self_router)


# ---------------------------------------------------------------------------
# Health & Diagnostics
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint — verifies app is alive, measures DB latency, and reports provider status."""
    db_start = time.perf_counter()
    db_ok = check_db_connection()
    db_latency_ms = round((time.perf_counter() - db_start) * 1000, 2)
    
    active_provider = "resend" if (settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip()) else "console"
    status = "healthy" if db_ok else "degraded"
    
    status_code = 200 if db_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "environment": settings.APP_ENV,
            "components": {
                "database": {
                    "status": "connected" if db_ok else "unreachable",
                    "latency_ms": db_latency_ms if db_ok else None,
                },
                "notifications": {
                    "active_provider": active_provider,
                    "from_email": settings.NOTIFICATION_FROM_EMAIL,
                },
            },
        },
    )


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
