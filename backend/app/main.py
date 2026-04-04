from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.candidates import router as candidates_router
from app.api.employers import router as employers_router
from app.api.funnel_events import router as funnel_events_router
from app.api.shortlists import router as shortlists_router
from app.api.vacancies import router as vacancies_router
from app.api.vacancy_candidate_matches import router as matches_router
from app.core.config import settings
from app.core.db import check_db_connection

app = FastAPI(title=settings.app_name)

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

app.include_router(candidates_router)
app.include_router(employers_router)
app.include_router(vacancies_router)
app.include_router(funnel_events_router)
app.include_router(matches_router)
app.include_router(shortlists_router)


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