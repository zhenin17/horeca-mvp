from fastapi import FastAPI

from app.config import settings
from app.db import check_db_connection

app = FastAPI(title=settings.app_name)


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