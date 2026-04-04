"use client";

import { useEffect, useState } from "react";
import { getTelegramWebApp, isTelegramWebApp } from "@/lib/telegram";

export default function TelegramShell() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const webApp = getTelegramWebApp();
    const insideTelegram = isTelegramWebApp();

    setIsTelegram(insideTelegram);

    if (!webApp) return;

    try {
      webApp.ready();
      webApp.expand();

      const tgUser = webApp.initDataUnsafe?.user;
      if (tgUser?.username) {
        setUsername(tgUser.username);
      } else if (tgUser?.first_name) {
        setUsername(tgUser.first_name);
      }
    } catch (error) {
      console.error("Telegram WebApp init error", error);
    }
  }, []);

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
      {isTelegram ? (
        <div>
          Режим Telegram Mini App
          {username ? ` · ${username}` : ""}
        </div>
      ) : (
        <div>Режим браузера</div>
      )}
    </div>
  );
}