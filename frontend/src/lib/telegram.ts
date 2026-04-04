export type TelegramWebApp = {
    ready: () => void;
    expand: () => void;
    close: () => void;
    colorScheme?: "light" | "dark";
    themeParams?: Record<string, string>;
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
    if (typeof window === "undefined") return null;
    return window.Telegram?.WebApp ?? null;
  }
  
  export function isTelegramWebApp(): boolean {
    return Boolean(getTelegramWebApp());
  }