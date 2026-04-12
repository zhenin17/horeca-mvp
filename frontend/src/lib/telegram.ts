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