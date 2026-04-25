"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AppDocumentKey =
  | "privacy_policy"
  | "terms_of_use"
  | "pd_agreement"
  | "about_service";

type AppDocumentListItem = {
  key: AppDocumentKey;
  title?: string | null;
};

type AppDocumentDetail = {
  key: AppDocumentKey;
  title?: string | null;
  content?: string | null;
};

type AppSettings = {
  support_email?: string | null;
  support_telegram?: string | null;
  support_phone?: string | null;
  about_text_short?: string | null;
  about_text_full?: string | null;
  app_version?: string | null;
};

type AppSettingItem = {
  key?: string | null;
  value?: string | null;
};

type AppSettingsResponse = AppSettings | AppSettingItem[] | { items?: AppSettingItem[] };

type QueryState = {
  initialDocKey: AppDocumentKey | null;
  from: string | null;
};

const DOCUMENT_LABELS: Record<AppDocumentKey, string> = {
  privacy_policy: "Политика конфиденциальности",
  terms_of_use: "Пользовательское соглашение",
  pd_agreement: "Согласие на обработку персональных данных",
  about_service: "О сервисе",
};

function detectTelegramWebApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const w = window as typeof window & {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  };

  return Boolean(w.Telegram?.WebApp?.initData?.trim());
}

function normalizeTelegramLink(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const cleaned = value.trim().replace(/^@/, "");
  return cleaned ? `https://t.me/${cleaned}` : null;
}

function normalizePhoneLink(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

function normalizeSettings(raw: unknown): AppSettings {
  if (!raw) {
    return {};
  }

  // Формат: [{ key: string, value: string }]
  if (Array.isArray(raw)) {
    return raw.reduce<AppSettings>((acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }

      const settingItem = item as AppSettingItem;
      const key = settingItem.key?.trim();

      if (!key) {
        return acc;
      }

      acc[key as keyof AppSettings] = settingItem.value ?? "";

      return acc;
    }, {});
  }

  // Формат: { items: [{ key: string, value: string }] }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "items" in raw &&
    Array.isArray((raw as { items?: unknown }).items)
  ) {
    return normalizeSettings((raw as { items: unknown[] }).items);
  }

  // Формат: прямой объект settings
  if (typeof raw === "object" && raw !== null) {
    return raw as AppSettings;
  }

  return {};
}

function getInitialQueryState(): QueryState {
  if (typeof window === "undefined") {
    return { initialDocKey: null, from: null };
  }

  const params = new URLSearchParams(window.location.search);
  const doc = params.get("doc");
  const from = params.get("from");

  const initialDocKey =
    doc === "privacy_policy" ||
    doc === "terms_of_use" ||
    doc === "pd_agreement" ||
    doc === "about_service"
      ? doc
      : null;

  return {
    initialDocKey,
    from: from?.trim() || null,
  };
}

export default function AboutPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isTelegram, setIsTelegram] = useState(false);
  const [backFallbackHref, setBackFallbackHref] = useState("/");

  const [settings, setSettings] = useState<AppSettings>({});
  const [documents, setDocuments] = useState<AppDocumentListItem[]>([]);
  const [selectedDocKey, setSelectedDocKey] = useState<AppDocumentKey | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AppDocumentDetail | null>(null);

  useEffect(() => {
    const { initialDocKey, from } = getInitialQueryState();
    const detectedTelegram = detectTelegramWebApp();

    setIsTelegram(detectedTelegram);
    setBackFallbackHref(from || (detectedTelegram ? "/telegram" : "/"));

    async function loadInitialData() {
      try {
        setLoading(true);
        setErrorText("");

        const [documentsResponse, settingsResponse] = await Promise.all([
          fetch("/api/app/documents", { cache: "no-store" }),
          fetch("/api/app/settings", { cache: "no-store" }),
        ]);

        if (!documentsResponse.ok) {
          throw new Error("Не удалось загрузить документы");
        }

        if (!settingsResponse.ok) {
          throw new Error("Не удалось загрузить настройки приложения");
        }

        const documentsData = (await documentsResponse.json()) as AppDocumentListItem[];
        const settingsData = (await settingsResponse.json()) as AppSettingsResponse;

        setDocuments(documentsData || []);
        setSettings(normalizeSettings(settingsData));

        const fallbackKey =
          initialDocKey ||
          documentsData?.[0]?.key ||
          "about_service";

        setSelectedDocKey(fallbackKey);
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось загрузить раздел «О приложении»");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  useEffect(() => {
    async function loadSelectedDocument() {
      if (!selectedDocKey) {
        setSelectedDocument(null);
        return;
      }

      try {
        setDocumentsLoading(true);
        setErrorText("");

        const response = await fetch(`/api/app/documents/${selectedDocKey}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить документ");
        }

        const data = (await response.json()) as AppDocumentDetail;
        setSelectedDocument(data || null);
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось загрузить документ");
        }
      } finally {
        setDocumentsLoading(false);
      }
    }

    void loadSelectedDocument();
  }, [selectedDocKey]);

  const supportEmail = settings.support_email?.trim() || "";
  const supportTelegram = settings.support_telegram?.trim() || "";
  const supportPhone = settings.support_phone?.trim() || "";
  const aboutTextShort = settings.about_text_short?.trim() || "";
  const aboutTextFull = settings.about_text_full?.trim() || "";
  const appVersion = settings.app_version?.trim() || "";

  const hasSupportContacts =
    Boolean(supportEmail) || Boolean(supportTelegram) || Boolean(supportPhone);

  const telegramLink = useMemo(
    () => normalizeTelegramLink(supportTelegram),
    [supportTelegram]
  );

  const phoneLink = useMemo(
    () => normalizePhoneLink(supportPhone),
    [supportPhone]
  );

  const orderedDocuments = useMemo(() => {
    const presentKeys = new Set(documents.map((item) => item.key));

    const preferredOrder: AppDocumentKey[] = [
      "terms_of_use",
      "privacy_policy",
      "pd_agreement",
      "about_service",
    ];

    const ordered = preferredOrder
      .filter((key) => presentKeys.has(key))
      .map((key) => documents.find((item) => item.key === key))
      .filter(Boolean) as AppDocumentListItem[];

    const extra = documents.filter(
      (item) => !preferredOrder.includes(item.key)
    );

    return [...ordered, ...extra];
  }, [documents]);

  function handleBackClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const canGoBack =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer !== "";

    if (canGoBack) {
      router.back();

      window.setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname === "/about") {
          router.push(backFallbackHref);
        }
      }, 250);

      return;
    }

    router.push(backFallbackHref);
  }

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загружаем информацию о приложении...
        </div>
      </main>
    );
  }

  return (
    <main className={`px-4 ${isTelegram ? "space-y-5 py-5" : "space-y-6 py-6"}`}>
      <div>
        <Link
          href={backFallbackHref}
          onClick={handleBackClick}
          className="text-sm text-slate-600 underline"
        >
          ← Назад
        </Link>
      </div>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <p
            className={`font-medium ${
              isTelegram
                ? "text-xs uppercase tracking-[0.16em] text-violet-600"
                : "text-sm text-slate-500"
            }`}
          >
            Hubsty
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            О приложении
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {aboutTextShort ||
              "Здесь собраны основные документы, контакты поддержки и информация о сервисе."}
          </p>

          {appVersion ? (
            <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
              Версия: {appVersion}
            </div>
          ) : null}
        </div>
      </section>

      {aboutTextFull ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Что такое Hubsty</h2>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {aboutTextFull}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Документы</h2>
            <p className="mt-2 text-sm text-slate-500">
              Все основные документы доступны прямо внутри приложения.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {orderedDocuments.length > 0 ? (
                orderedDocuments.map((item) => {
                  const isActive = item.key === selectedDocKey;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedDocKey(item.key)}
                      className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.title?.trim() || DOCUMENT_LABELS[item.key] || item.key}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Документы пока не найдены.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Поддержка</h2>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {supportEmail ? (
                <div>
                  <div className="text-xs text-slate-500">Email</div>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-1 inline-block text-slate-900 underline"
                  >
                    {supportEmail}
                  </a>
                </div>
              ) : null}

              {supportTelegram ? (
                <div>
                  <div className="text-xs text-slate-500">Telegram</div>
                  {telegramLink ? (
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-slate-900 underline"
                    >
                      @{supportTelegram.replace(/^@/, "")}
                    </a>
                  ) : (
                    <div className="mt-1 text-slate-900">
                      {supportTelegram}
                    </div>
                  )}
                </div>
              ) : null}

              {supportPhone ? (
                <div>
                  <div className="text-xs text-slate-500">Телефон</div>
                  {phoneLink ? (
                    <a
                      href={phoneLink}
                      className="mt-1 inline-block text-slate-900 underline"
                    >
                      {supportPhone}
                    </a>
                  ) : (
                    <div className="mt-1 text-slate-900">{supportPhone}</div>
                  )}
                </div>
              ) : null}

              {!hasSupportContacts ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Контакты поддержки пока не заполнены.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {selectedDocument?.title?.trim() ||
              (selectedDocKey ? DOCUMENT_LABELS[selectedDocKey] : "Документ")}
          </h2>

          {documentsLoading ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Загружаем документ...
            </div>
          ) : selectedDocument?.content?.trim() ? (
            <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {selectedDocument.content}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Текст документа пока недоступен.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}