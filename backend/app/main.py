from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.candidates import router as candidates_router
from app.api.employers import router as employers_router
from app.api.funnel_events import router as funnel_events_router
from app.api.shortlists import router as shortlists_router
from app.api.telegram import router as telegram_router
from app.api.vacancies import router as vacancies_router
from app.api.vacancy_candidate_matches import router as matches_router
from app.core.config import settings
from app.core.db import check_db_connection

app = FastAPI(
    title=settings.app_name,
    root_path="/api",
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3010",
        "http://127.0.0.1:3010",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/uploads/{file_path:path}", include_in_schema=False)
def serve_upload(file_path: str):
    target = UPLOADS_DIR / file_path

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(target)


app.include_router(candidates_router)
app.include_router(employers_router)
app.include_router(vacancies_router)
app.include_router(funnel_events_router)
app.include_router(matches_router)
app.include_router(shortlists_router)
app.include_router(telegram_router)


@app.get("/")
def read_root():
    return {"status": "ok", "service": "horeca-mvp-api"}


@app.get("/health")
def healthcheck():
    db_ok = check_db_connection()
    return {
        "status": "ok",
        "service": "horeca-mvp-api",
        "database": "ok" if db_ok else "error",
    }