from fastapi import FastAPI

from app.api.candidates import router as candidates_router
from app.api.employers import router as employers_router
from app.api.vacancies import router as vacancies_router
from app.core.config import settings
from app.core.db import check_db_connection

app = FastAPI(title=settings.app_name)

app.include_router(candidates_router)
app.include_router(employers_router)
app.include_router(vacancies_router)


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