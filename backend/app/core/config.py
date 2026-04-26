from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    app_name: str = "HoReCa MVP API"
    app_env: str = "development"
    app_debug: bool = True
    enable_docs: bool = True
    enable_dev_auth: bool = False

    max_upload_size_mb: int = 10

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_days: int = 7

    telegram_bot_token: str | None = None
    telegram_auth_max_age_seconds: int = 86400

    admin_telegram_user_ids: str = ""
    moderator_telegram_user_ids: str = ""
    support_telegram_user_ids: str = ""

    allowed_cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3010,http://127.0.0.1:3010"

    postgres_host: str
    postgres_port: int = 5432
    postgres_db: str
    postgres_user: str
    postgres_password: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def database_url(self) -> str:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        ).render_as_string(hide_password=False)

    def _parse_int_list(self, raw_value: str) -> list[int]:
        values: list[int] = []
        for raw in raw_value.split(","):
            item = raw.strip()
            if not item:
                continue
            try:
                values.append(int(item))
            except ValueError:
                continue
        return values

    @property
    def admin_telegram_user_ids_list(self) -> list[int]:
        return self._parse_int_list(self.admin_telegram_user_ids)

    @property
    def moderator_telegram_user_ids_list(self) -> list[int]:
        return self._parse_int_list(self.moderator_telegram_user_ids)

    @property
    def support_telegram_user_ids_list(self) -> list[int]:
        return self._parse_int_list(self.support_telegram_user_ids)

    @property
    def allowed_cors_origins_list(self) -> list[str]:
        return [item.strip() for item in self.allowed_cors_origins.split(",") if item.strip()]


settings = Settings()