export type TelegramBootstrapUser = {
  telegram_user_id: number;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

function applyTelegramTheme(webApp: TelegramWebApp) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  const theme = webApp.colorScheme === "dark" ? "dark" : "light";
  const themeParams = webApp.themeParams ?? {};

  root.setAttribute("data-telegram-theme", theme);

  const bgColor =
    themeParams.bg_color ||
    (theme === "dark" ? "#17212b" : "#f8fafc");

  const textColor =
    themeParams.text_color ||
    (theme === "dark" ? "#f3f4f6" : "#0f172a");

  const hintColor =
    themeParams.hint_color ||
    (theme === "dark" ? "#94a3b8" : "#64748b");

  const secondaryBgColor =
    themeParams.secondary_bg_color ||
    (theme === "dark" ? "#1f2937" : "#ffffff");

  root.style.setProperty("--tg-bg", bgColor);
  root.style.setProperty("--tg-surface", secondaryBgColor);
  root.style.setProperty("--tg-surface-muted", theme === "dark" ? "#111827" : "#f8fafc");
  root.style.setProperty("--tg-text", textColor);
  root.style.setProperty("--tg-text-muted", hintColor);
  root.style.setProperty("--tg-border", theme === "dark" ? "#334155" : "#dbe2ea");
  root.style.setProperty("--tg-placeholder", theme === "dark" ? "#94a3b8" : "#94a3b8");

  root.style.setProperty("--tg-input-bg", theme === "dark" ? "#0f172a" : "#ffffff");
  root.style.setProperty("--tg-input-text", textColor);
  root.style.setProperty("--tg-input-border", theme === "dark" ? "#334155" : "#cbd5e1");
  root.style.setProperty("--tg-input-placeholder", theme === "dark" ? "#94a3b8" : "#94a3b8");
  root.style.setProperty("--tg-input-disabled-bg", theme === "dark" ? "#111827" : "#f8fafc");
  root.style.setProperty("--tg-input-disabled-text", theme === "dark" ? "#94a3b8" : "#64748b");
  root.style.setProperty("--tg-card-bg", secondaryBgColor);

  if (body) {
    body.style.backgroundColor = bgColor;
    body.style.color = textColor;
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function hasTelegramUserContext(): boolean {
  const webApp = getTelegramWebApp();

  if (!webApp) {
    return false;
  }

  return Boolean(
    webApp.initDataUnsafe?.user?.id ||
      (webApp.initData && webApp.initData.length > 0)
  );
}

export function isTelegramWebApp(): boolean {
  return hasTelegramUserContext();
}

export function prepareTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return;
  }

  applyTelegramTheme(webApp);
  webApp.ready?.();
  webApp.expand?.();
}

export function getTelegramBootstrapUser(): TelegramBootstrapUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  if (telegramUser?.id) {
    return {
      telegram_user_id: telegramUser.id,
      telegram_username: telegramUser.username ?? null,
      first_name: telegramUser.first_name ?? null,
      last_name: telegramUser.last_name ?? null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const testMode = params.get("tg_test");
  const testUserId = params.get("tg_user_id");

  if (testMode === "1") {
    const parsedId = Number(testUserId);
    const telegramUserId =
      Number.isFinite(parsedId) && parsedId > 0 ? parsedId : 123456789;

    return {
      telegram_user_id: telegramUserId,
      telegram_username: `hubsty_test_${telegramUserId}`,
      first_name: "Test",
      last_name: "User",
    };
  }

  return null;
}