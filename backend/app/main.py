from fastapi import FastAPI

app = FastAPI(title="HoReCa MVP API")


@app.get("/")
def read_root():
    return {"status": "ok", "service": "horeca-mvp-api"}